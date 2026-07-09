import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search as SearchIcon,
  MapPin,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
} from 'lucide-react';
import { searchNearby, listServices } from '../../api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { humanizeCategory, formatAddress, formatDistance, directionsUrl } from '../../lib/format';
import ClinicCard from '../../components/ClinicCard';
import SearchMap from '../../components/SearchMap';
import SearchLoadingModal from '../../components/SearchLoadingModal';

const RADIUS_OPTIONS = [1, 2, 5, 10, 20];
const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1];
const PAGE_SIZE = 20;
const MOBILE_QUERY = '(max-width: 900px)';

// Total number of sites the API returned, ignoring the client-side text filter.
function countSites(result) {
  return (result?.organizations || []).reduce((n, o) => n + (o.sites?.length || 0), 0);
}

// Key of the first site in the result set, matching the list's flatten order.
function firstSiteKey(result) {
  for (const org of result?.organizations || []) {
    for (const site of org.sites || []) {
      return `${org.org_id}:${site.site_id}`;
    }
  }
  return null;
}

const Search = () => {
  const { coords, error: geoError, usingFallback, requestLocation } = useGeolocation();

  const [services, setServices] = useState([]);
  const [filters, setFilters] = useState({
    serviceCategory: '',
    slidingScale: false,
    has340b: false,
    radiusKm: DEFAULT_RADIUS_KM,
  });
  const [textQuery, setTextQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [radiusMenuOpen, setRadiusMenuOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState(null);

  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState('map');
  const sheetTouchY = useRef(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [autoExpanded, setAutoExpanded] = useState(null); // { from, to } when radius was widened automatically
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.category).filter(Boolean));
    return [...set].sort();
  }, [services]);

  const clinics = useMemo(() => {
    const orgs = data?.organizations || [];
    const rows = [];
    for (const org of orgs) {
      for (const site of org.sites || []) {
        rows.push({ org, site });
      }
    }
    if (!textQuery.trim()) return rows;
    const q = textQuery.trim().toLowerCase();
    return rows.filter(({ org, site }) => {
      const hay = `${site.name || ''} ${org.name || ''} ${(site.service_categories || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, textQuery]);

  const mapSites = useMemo(
    () => clinics.map(({ org, site }) => {
      const distLabel = formatDistance(site.distance_m ?? org.distance_m);
      return {
        orgId: org.org_id,
        siteId: site.site_id,
        latitude: site.latitude,
        longitude: site.longitude,
        name: site.name || org.name,
        label: distLabel || (site.accepts_sliding_scale ? 'Sliding' : 'Clinic'),
        address: formatAddress(site),
        distanceLabel: distLabel,
        phone: site.phone,
        has340b: !!org.has_340b,
        sliding: !!site.accepts_sliding_scale,
        directions: directionsUrl(site),
      };
    }),
    [clinics],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.serviceCategory) count += 1;
    if (filters.slidingScale) count += 1;
    if (filters.has340b) count += 1;
    if (filters.radiusKm !== DEFAULT_RADIUS_KM) count += 1;
    return count;
  }, [filters]);

  async function runSearch(center = coords, f = filters) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setAutoExpanded(null);
    try {
      // Progressively widen the radius until we find clinics (or hit the max),
      // so a sparse area doesn't dead-end at an empty 5 km search.
      let radiusKm = f.radiusKm;
      let result;
      for (;;) {
        result = await searchNearby({
          lat: center.lat,
          lon: center.lon,
          radiusKm,
          serviceCategories: f.serviceCategory ? [f.serviceCategory] : undefined,
          acceptsSlidingScale: f.slidingScale || undefined,
          has340b: f.has340b || undefined,
          signal: controller.signal,
        });
        if (countSites(result) > 0 || radiusKm >= MAX_RADIUS_KM) break;
        const wider = RADIUS_OPTIONS.find((r) => r > radiusKm);
        if (!wider) break;
        radiusKm = wider;
      }
      setData(result);
      setVisibleCount(PAGE_SIZE);
      setSelectedSiteId(firstSiteKey(result)); // highlight the first (nearest) clinic
      if (radiusKm !== f.radiusKm && countSites(result) > 0) {
        setFilters((prev) => ({ ...prev, radiusKm }));
        setAutoExpanded({ from: f.radiusKm, to: radiusKm });
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Something went wrong. Please try again.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    listServices()
      .then((rows) => active && setServices(Array.isArray(rows) ? rows : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runSearch(coords);
    return () => {
      active = false;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUseLocation() {
    const center = await requestLocation();
    runSearch(center);
  }

  function resetFilters() {
    setFilters({ serviceCategory: '', slidingScale: false, has340b: false, radiusKm: DEFAULT_RADIUS_KM });
    setTextQuery('');
  }

  // Toggle a quick filter and re-run immediately with the new filters.
  function toggleFilter(patch) {
    const next = { ...filters, ...patch };
    setFilters(next);
    runSearch(coords, next);
  }

  function handleApplyFilters() {
    setFiltersOpen(false);
    runSearch();
  }

  function handleRadiusSelect(km) {
    setRadiusMenuOpen(false);
    const next = { ...filters, radiusKm: km };
    setFilters(next);
    runSearch(coords, next);
  }

  const desert = data?.meta?.healthcare_desert;
  const locationLabel = coords.label || (usingFallback ? 'Miami, FL' : 'your area');

  const fitPadding = isMobile
    ? { top: 120, bottom: 290, left: 40, right: 40 }
    : { top: 90, bottom: 70, left: drawerCollapsed ? 60 : 412, right: 70 };
  const pillLeftInset = isMobile ? 0 : 392;

  // Shared results-list body (error / empty / cards).
  function renderResults(carousel = false) {
    if (error) {
      return (
        <div style={{ background: '#fff', border: '1px solid var(--mb-border)', borderRadius: '16px', textAlign: 'center', padding: '2rem 1.5rem' }}>
          <AlertCircle size={34} color="var(--mb-text-muted)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>Couldn't load clinics</h3>
          <p style={{ color: 'var(--mb-text-muted)', marginBottom: '1rem', fontSize: '0.92rem' }}>{error}</p>
          <button type="button" className="mb-btn mb-btn-lime" onClick={() => runSearch()}>Try again</button>
        </div>
      );
    }
    if (!loading && clinics.length === 0) {
      return (
        <div style={{ background: '#fff', border: '1px dashed var(--mb-border)', borderRadius: '16px', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <MapPin size={36} color="var(--mb-border)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--mb-text-muted)' }}>
            {desert ? 'No clinics found nearby' : 'No clinics match your filters'}
          </h3>
          <p style={{ color: 'var(--mb-text-muted)', fontSize: '0.92rem' }}>
            Try widening the search radius or clearing some filters.
          </p>
        </div>
      );
    }
    const cards = clinics.slice(0, visibleCount).map(({ org, site }) => {
      const siteKey = `${org.org_id}:${site.site_id}`;
      return (
        <ClinicCard
          key={siteKey}
          org={org}
          site={site}
          selected={selectedSiteId === siteKey}
          onMouseEnter={() => setSelectedSiteId(siteKey)}
          onMouseLeave={() => setSelectedSiteId((cur) => (cur === siteKey ? null : cur))}
          width={carousel ? '270px' : undefined}
        />
      );
    });
    const remaining = clinics.length - visibleCount;
    if (remaining > 0) {
      cards.push(
        <button
          key="show-more"
          type="button"
          className="mb-btn mb-btn-outline"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          style={{
            flexShrink: 0,
            width: carousel ? '150px' : '100%',
            height: carousel ? 'auto' : '44px',
            alignSelf: carousel ? 'stretch' : undefined,
          }}
        >
          Show {Math.min(remaining, PAGE_SIZE)} more
        </button>,
      );
    }
    return cards;
  }

  const chip = (active, lead) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '7px 13px',
    borderRadius: 'var(--mb-radius-pill)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: active ? 'var(--mb-primary)' : '#fff',
    border: `1px solid ${active || lead ? 'var(--mb-primary)' : 'var(--mb-border)'}`,
    color: active ? '#fff' : lead ? 'var(--mb-primary)' : 'var(--mb-text-primary)',
  });

  const renderChips = () => (
    <>
      <button type="button" style={chip(false, true)} onClick={() => setFiltersOpen(true)}>
        <SlidersHorizontal size={14} /> Filters
        {activeFilterCount > 0 && ` (${activeFilterCount})`}
      </button>
      <button type="button" style={chip(filters.slidingScale)} onClick={() => toggleFilter({ slidingScale: !filters.slidingScale })}>
        Sliding scale
      </button>
      <button type="button" style={chip(filters.has340b)} onClick={() => toggleFilter({ has340b: !filters.has340b })}>
        340B meds
      </button>
      <div style={{ position: 'relative' }}>
        <button type="button" style={chip(filters.radiusKm !== DEFAULT_RADIUS_KM)} onClick={() => setRadiusMenuOpen((o) => !o)}>
          Within {filters.radiusKm} km <ChevronDown size={13} strokeWidth={2.2} />
        </button>
        {radiusMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 30,
              background: '#fff',
              border: '1px solid var(--mb-border)',
              borderRadius: '12px',
              boxShadow: 'var(--mb-shadow-lg)',
              padding: '6px',
              minWidth: '130px',
            }}
          >
            {RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => handleRadiusSelect(km)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: filters.radiusKm === km ? 'var(--mb-bg-sage)' : 'transparent',
                  color: 'var(--mb-text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Within {km} km
              </button>
            ))}
          </div>
        )}
      </div>
      {categories.slice(0, 4).map((c) => {
        const active = filters.serviceCategory === c;
        return (
          <button
            key={c}
            type="button"
            style={chip(active)}
            onClick={() => toggleFilter({ serviceCategory: active ? '' : c })}
          >
            {humanizeCategory(c)}
          </button>
        );
      })}
    </>
  );

  const autoExpandNotice = autoExpanded && !loading && (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
        marginTop: '10px',
        padding: '8px 11px',
        borderRadius: '10px',
        background: 'var(--mb-bg-sage)',
        color: 'var(--mb-text-secondary)',
        fontSize: '12.5px',
        lineHeight: 1.35,
      }}
    >
      <MapPin size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
      <span>No clinics within {autoExpanded.from} km — showing the nearest within {autoExpanded.to} km.</span>
    </div>
  );

  const searchField = (
    <div style={{ position: 'relative' }}>
      <SearchIcon size={16} color="var(--mb-text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
      <input
        type="text"
        placeholder="Filter by name or service"
        value={textQuery}
        onChange={(e) => { setTextQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
        style={{
          width: '100%',
          height: '42px',
          padding: '0 14px 0 38px',
          border: '1px solid var(--mb-border)',
          borderRadius: '13px',
          background: '#fff',
          fontSize: '14px',
          color: 'var(--mb-text-primary)',
          outline: 'none',
        }}
      />
    </div>
  );

  return (
    <div className="search-page" style={{ position: 'relative', height: 'calc(100vh - 74px)', overflow: 'hidden' }}>
      <SearchLoadingModal open={loading} onCancel={() => abortRef.current?.abort()} />

      {/* Base map layer */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <SearchMap
          center={coords}
          sites={mapSites}
          selectedSiteId={selectedSiteId}
          onSiteSelect={setSelectedSiteId}
          onSearchArea={(c) => runSearch(c)}
          onLocate={handleUseLocation}
          fitPadding={fitPadding}
          pillLeftInset={pillLeftInset}
        />
      </div>

      {/* ===== Desktop left drawer ===== */}
      {!isMobile && (
        <>
          <div
            className="search-drawer"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '392px',
              background: 'var(--mb-bg-primary)',
              borderRight: '1px solid var(--mb-border)',
              boxShadow: '6px 0 24px rgba(0,0,0,0.05)',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              transform: drawerCollapsed ? 'translateX(-100%)' : 'translateX(0)',
              transition: 'transform 0.28s ease',
            }}
          >
            <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--mb-border-soft)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--mb-text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
                Find care near {locationLabel}
              </h2>
              <div style={{ fontSize: '12.5px', color: 'var(--mb-text-muted)', marginTop: '2px' }}>
                {loading ? 'Searching…' : `${clinics.length} clinic${clinics.length === 1 ? '' : 's'} found · sorted by distance`}
              </div>
              <div style={{ marginTop: '12px' }}>{searchField}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '12px' }}>
                {renderChips()}
              </div>
              {autoExpandNotice}
              {geoError && (
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--mb-text-muted)', fontSize: '0.8rem', margin: '10px 0 0' }}>
                  <AlertCircle size={13} /> {geoError}
                </p>
              )}
            </div>
            <div className="mb-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {renderResults()}
            </div>
          </div>

          {/* Collapse handle */}
          <button
            type="button"
            aria-label={drawerCollapsed ? 'Show results' : 'Hide results'}
            onClick={() => setDrawerCollapsed((c) => !c)}
            style={{
              position: 'absolute',
              top: '50%',
              left: drawerCollapsed ? '0px' : '377px',
              transform: 'translateY(-50%)',
              width: '30px',
              height: '44px',
              borderRadius: '8px',
              background: '#fff',
              border: '1px solid var(--mb-border)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
              color: 'var(--mb-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 21,
              transition: 'left 0.28s ease',
            }}
          >
            {drawerCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </>
      )}

      {/* ===== Mobile layout ===== */}
      {isMobile && (
        <>
          {/* Floating search + filters button */}
          <div style={{ position: 'absolute', top: '14px', left: '14px', right: '14px', display: 'flex', gap: '8px', zIndex: 25 }}>
            <div style={{ flex: 1, boxShadow: '0 4px 14px rgba(0,0,0,0.1)', borderRadius: '13px' }}>{searchField}</div>
            <button
              type="button"
              aria-label="Filters"
              onClick={() => setFiltersOpen(true)}
              style={{
                width: '42px',
                height: '42px',
                flexShrink: 0,
                borderRadius: '11px',
                background: '#fff',
                border: '1px solid var(--mb-primary)',
                color: 'var(--mb-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                cursor: 'pointer',
              }}
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {/* Horizontal chip row */}
          <div
            className="mb-noscroll"
            style={{ position: 'absolute', top: '66px', left: 0, right: 0, display: 'flex', gap: '7px', padding: '0 14px', overflowX: 'auto', zIndex: 24 }}
          >
            {renderChips()}
          </div>

          {/* Bottom sheet */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: mobileView === 'list' ? '72%' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
              borderRadius: '22px 22px 0 0',
              boxShadow: '0 -8px 30px rgba(0,0,0,0.13)',
              zIndex: 15,
              paddingBottom: '10px',
            }}
          >
            <button
              type="button"
              onClick={() => setSheetCollapsed((c) => !c)}
              onTouchStart={(e) => { sheetTouchY.current = e.touches[0].clientY; }}
              onTouchEnd={(e) => {
                const start = sheetTouchY.current;
                sheetTouchY.current = null;
                if (start == null) return;
                const dy = e.changedTouches[0].clientY - start;
                if (Math.abs(dy) < 24) return; // treat as tap; let onClick toggle
                e.preventDefault();
                setSheetCollapsed(dy < 0); // swipe down → reveal, swipe up → hide
              }}
              aria-expanded={!sheetCollapsed}
              aria-label={sheetCollapsed ? 'Show results' : 'Hide results'}
              style={{ display: 'block', width: '100%', padding: '12px 0 10px', background: 'none', border: 'none', cursor: 'pointer', touchAction: 'none' }}
            >
              <span style={{ display: 'block', width: '38px', height: '4px', borderRadius: '999px', background: '#D8D2C4', margin: '0 auto' }} />
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 10px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--mb-text-primary)' }}>
                {loading ? 'Searching…' : `${clinics.length} clinic${clinics.length === 1 ? '' : 's'} found`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: '#F1ECE0', borderRadius: '999px', padding: '3px', display: 'flex', gap: '2px' }}>
                  {['map', 'list'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMobileView(v)}
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '4px 11px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        background: mobileView === v ? '#fff' : 'transparent',
                        color: mobileView === v ? 'var(--mb-text-primary)' : 'var(--mb-text-muted)',
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSheetCollapsed((c) => !c)}
                  aria-expanded={!sheetCollapsed}
                  aria-label={sheetCollapsed ? 'Show results' : 'Hide results'}
                  style={{ width: '30px', height: '30px', flexShrink: 0, borderRadius: '8px', background: '#F1ECE0', border: 'none', color: 'var(--mb-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ChevronDown size={16} style={{ transform: sheetCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
              </div>
            </div>
            {autoExpanded && !loading && !sheetCollapsed && (
              <div style={{ padding: '0 16px' }}>{autoExpandNotice}</div>
            )}
            {!sheetCollapsed && (
              mobileView === 'list' ? (
                <div className="mb-noscroll" style={{ overflowY: 'auto', padding: '0 16px 6px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {renderResults()}
                </div>
              ) : (
                <div className="mb-noscroll" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '0 16px 6px', overflowX: 'auto' }}>
                  {renderResults(true)}
                </div>
              )
            )}
          </div>
        </>
      )}

      {/* ===== Filter editor (popover / sheet) ===== */}
      {filtersOpen && (
        <div
          role="presentation"
          onClick={() => setFiltersOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(37,48,46,0.35)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : '24px' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter results"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              width: isMobile ? '100%' : '420px',
              maxWidth: '100%',
              borderRadius: isMobile ? '22px 22px 0 0' : '20px',
              boxShadow: 'var(--mb-shadow-lg)',
              padding: '22px 22px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SlidersHorizontal size={18} /> Filter results
              </h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" style={{ background: 'none', border: 'none', color: 'var(--mb-text-muted)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="mb-label">Service type</label>
                <select className="mb-select" value={filters.serviceCategory} onChange={(e) => setFilters((f) => ({ ...f, serviceCategory: e.target.value }))}>
                  <option value="">All types</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{humanizeCategory(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-label">Search radius</label>
                <select className="mb-select" value={filters.radiusKm} onChange={(e) => setFilters((f) => ({ ...f, radiusKm: Number(e.target.value) }))}>
                  {RADIUS_OPTIONS.map((km) => (
                    <option key={km} value={km}>{km} km</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label className="mb-checkbox-label" style={{ marginBottom: 0 }}>
                  <input type="checkbox" checked={filters.slidingScale} onChange={(e) => setFilters((f) => ({ ...f, slidingScale: e.target.checked }))} />
                  Sliding-scale fees
                </label>
                <label className="mb-checkbox-label" style={{ marginBottom: 0 }}>
                  <input type="checkbox" checked={filters.has340b} onChange={(e) => setFilters((f) => ({ ...f, has340b: e.target.checked }))} />
                  On-site 340B medications
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem' }}>
              <button type="button" className="mb-btn mb-btn-outline" style={{ flex: 1, height: '46px' }} onClick={resetFilters}>
                Reset all
              </button>
              <button type="button" className="mb-btn mb-btn-lime" style={{ flex: 1, height: '46px' }} onClick={handleApplyFilters} disabled={loading}>
                {loading ? 'Searching…' : 'Apply filters'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mb-noscroll { scrollbar-width: none; -ms-overflow-style: none; }
        .mb-noscroll::-webkit-scrollbar { display: none; }
        @media (max-width: 900px) {
          .mb-searcharea-wrap { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .search-drawer { transition: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Search;
