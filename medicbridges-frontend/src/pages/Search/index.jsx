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
import { useLang } from '../../context/LangContext';

const CONTENT = {
  en: {
    genericError: 'Something went wrong. Please try again.',
    couldntLoad: "Couldn't load clinics",
    tryAgain: 'Try again',
    noneNearby: 'No clinics found nearby',
    noneMatch: 'No clinics match your filters',
    widenHint: 'Try widening the search radius or clearing some filters.',
    prevPage: 'Previous page',
    nextPage: 'Next page',
    pageN: (n) => `Page ${n}`,
    filters: 'Filters',
    slidingScale: 'Sliding scale',
    meds340b: '340B meds',
    within: (km) => `Within ${km} km`,
    slidingLabel: 'Sliding',
    clinicLabel: 'Clinic',
    autoExpand: (from, to) => `No clinics within ${from} km — showing the nearest within ${to} km.`,
    filterPlaceholder: 'Filter by name or service',
    findCareNear: (label) => `Find care near ${label}`,
    searching: 'Searching…',
    clinicsFoundSorted: (n) => `${n} clinic${n === 1 ? '' : 's'} found · sorted by distance`,
    clinicsFound: (n) => `${n} clinic${n === 1 ? '' : 's'} found`,
    showResults: 'Show results',
    hideResults: 'Hide results',
    views: { map: 'Map', list: 'List' },
    filterResults: 'Filter results',
    closeFilters: 'Close filters',
    serviceType: 'Service type',
    allTypes: 'All types',
    searchRadius: 'Search radius',
    slidingScaleFees: 'Sliding-scale fees',
    onSite340b: 'On-site 340B medications',
    resetAll: 'Reset all',
    applyFilters: 'Apply filters',
    fallbackArea: 'your area',
  },
  es: {
    genericError: 'Algo salió mal. Inténtalo de nuevo.',
    couldntLoad: 'No se pudieron cargar las clínicas',
    tryAgain: 'Intentar de nuevo',
    noneNearby: 'No se encontraron clínicas cercanas',
    noneMatch: 'Ninguna clínica coincide con tus filtros',
    widenHint: 'Prueba ampliar el radio de búsqueda o quitar algunos filtros.',
    prevPage: 'Página anterior',
    nextPage: 'Página siguiente',
    pageN: (n) => `Página ${n}`,
    filters: 'Filtros',
    slidingScale: 'Escala móvil',
    meds340b: 'Medicamentos 340B',
    within: (km) => `Dentro de ${km} km`,
    slidingLabel: 'Escala',
    clinicLabel: 'Clínica',
    autoExpand: (from, to) => `Sin clínicas dentro de ${from} km — mostrando las más cercanas dentro de ${to} km.`,
    filterPlaceholder: 'Filtrar por nombre o servicio',
    findCareNear: (label) => `Buscar atención cerca de ${label}`,
    searching: 'Buscando…',
    clinicsFoundSorted: (n) => `${n} clínica${n === 1 ? '' : 's'} encontrada${n === 1 ? '' : 's'} · ordenadas por distancia`,
    clinicsFound: (n) => `${n} clínica${n === 1 ? '' : 's'} encontrada${n === 1 ? '' : 's'}`,
    showResults: 'Mostrar resultados',
    hideResults: 'Ocultar resultados',
    views: { map: 'Mapa', list: 'Lista' },
    filterResults: 'Filtrar resultados',
    closeFilters: 'Cerrar filtros',
    serviceType: 'Tipo de servicio',
    allTypes: 'Todos los tipos',
    searchRadius: 'Radio de búsqueda',
    slidingScaleFees: 'Tarifas de escala móvil',
    onSite340b: 'Medicamentos 340B en el lugar',
    resetAll: 'Restablecer todo',
    applyFilters: 'Aplicar filtros',
    fallbackArea: 'tu área',
  },
};

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
  const { lang } = useLang();
  const t = CONTENT[lang];

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
  const listScrollRef = useRef(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );

  const [page, setPage] = useState(0);
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

  const totalPages = Math.max(1, Math.ceil(clinics.length / PAGE_SIZE));
  // Clamp in case the result set shrank (e.g. text filter) without a reset.
  const safePage = Math.min(page, totalPages - 1);
  const pageClinics = useMemo(
    () => clinics.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [clinics, safePage],
  );

  const mapSites = useMemo(
    () => pageClinics.map(({ org, site }) => {
      const distLabel = formatDistance(site.distance_m ?? org.distance_m);
      return {
        orgId: org.org_id,
        siteId: site.site_id,
        latitude: site.latitude,
        longitude: site.longitude,
        name: site.name || org.name,
        label: distLabel || (site.accepts_sliding_scale ? t.slidingLabel : t.clinicLabel),
        address: formatAddress(site),
        distanceLabel: distLabel,
        phone: site.phone,
        has340b: !!org.has_340b,
        sliding: !!site.accepts_sliding_scale,
        directions: directionsUrl(site),
      };
    }),
    [pageClinics, t],
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
      setPage(0);
      setSelectedSiteId(firstSiteKey(result)); // highlight the first (nearest) clinic
      if (radiusKm !== f.radiusKm && countSites(result) > 0) {
        setFilters((prev) => ({ ...prev, radiusKm }));
        setAutoExpanded({ from: f.radiusKm, to: radiusKm });
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || t.genericError);
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

  // Change page: clear the active selection so the map frames the whole page.
  function goToPage(p) {
    const clamped = Math.min(Math.max(p, 0), totalPages - 1);
    if (clamped === safePage) return;
    setPage(clamped);
    setSelectedSiteId(null);
    listScrollRef.current?.scrollTo({ top: 0 });
  }

  const desert = data?.meta?.healthcare_desert;
  const locationLabel = coords.label || (usingFallback ? 'Miami, FL' : t.fallbackArea);

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
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>{t.couldntLoad}</h3>
          <p style={{ color: 'var(--mb-text-muted)', marginBottom: '1rem', fontSize: '0.92rem' }}>{error}</p>
          <button type="button" className="mb-btn mb-btn-lime" onClick={() => runSearch()}>{t.tryAgain}</button>
        </div>
      );
    }
    if (!loading && clinics.length === 0) {
      return (
        <div style={{ background: '#fff', border: '1px dashed var(--mb-border)', borderRadius: '16px', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <MapPin size={36} color="var(--mb-border)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--mb-text-muted)' }}>
            {desert ? t.noneNearby : t.noneMatch}
          </h3>
          <p style={{ color: 'var(--mb-text-muted)', fontSize: '0.92rem' }}>
            {t.widenHint}
          </p>
        </div>
      );
    }
    return pageClinics.map(({ org, site }) => {
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
  }

  // Prev / numbered / Next controls. Hidden when everything fits on one page.
  function renderPagination() {
    if (loading || totalPages <= 1) return null;
    const span = 5;
    let start = Math.max(0, safePage - 2);
    const end = Math.min(totalPages, start + span);
    start = Math.max(0, end - span);
    const nums = Array.from({ length: end - start }, (_, i) => start + i);
    const navBtn = (disabled) => ({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      border: '1px solid var(--mb-border)',
      background: '#fff',
      color: disabled ? 'var(--mb-border)' : 'var(--mb-text-secondary)',
      cursor: disabled ? 'default' : 'pointer',
    });
    const numBtn = (active) => ({
      minWidth: '32px',
      height: '32px',
      padding: '0 6px',
      borderRadius: '8px',
      border: `1px solid ${active ? 'var(--mb-primary)' : 'var(--mb-border)'}`,
      background: active ? 'var(--mb-primary)' : '#fff',
      color: active ? '#fff' : 'var(--mb-text-primary)',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
    });
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', padding: '4px 0 2px' }}>
        <button type="button" aria-label={t.prevPage} disabled={safePage === 0} style={navBtn(safePage === 0)} onClick={() => goToPage(safePage - 1)}>
          <ChevronLeft size={16} />
        </button>
        {nums.map((n) => (
          <button key={n} type="button" aria-label={t.pageN(n + 1)} aria-current={n === safePage ? 'page' : undefined} style={numBtn(n === safePage)} onClick={() => goToPage(n)}>
            {n + 1}
          </button>
        ))}
        <button type="button" aria-label={t.nextPage} disabled={safePage === totalPages - 1} style={navBtn(safePage === totalPages - 1)} onClick={() => goToPage(safePage + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    );
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
        <SlidersHorizontal size={14} /> {t.filters}
        {activeFilterCount > 0 && ` (${activeFilterCount})`}
      </button>
      <button type="button" style={chip(filters.slidingScale)} onClick={() => toggleFilter({ slidingScale: !filters.slidingScale })}>
        {t.slidingScale}
      </button>
      <button type="button" style={chip(filters.has340b)} onClick={() => toggleFilter({ has340b: !filters.has340b })}>
        {t.meds340b}
      </button>
      <div style={{ position: 'relative' }}>
        <button type="button" style={chip(filters.radiusKm !== DEFAULT_RADIUS_KM)} onClick={() => setRadiusMenuOpen((o) => !o)}>
          {t.within(filters.radiusKm)} <ChevronDown size={13} strokeWidth={2.2} />
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
                {t.within(km)}
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
      <span>{t.autoExpand(autoExpanded.from, autoExpanded.to)}</span>
    </div>
  );

  const searchField = (
    <div style={{ position: 'relative' }}>
      <SearchIcon size={16} color="var(--mb-text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
      <input
        type="text"
        placeholder={t.filterPlaceholder}
        value={textQuery}
        onChange={(e) => { setTextQuery(e.target.value); setPage(0); }}
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
                {t.findCareNear(locationLabel)}
              </h2>
              <div style={{ fontSize: '12.5px', color: 'var(--mb-text-muted)', marginTop: '2px' }}>
                {loading ? t.searching : t.clinicsFoundSorted(clinics.length)}
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
            <div ref={listScrollRef} className="mb-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {renderResults()}
            </div>
            {totalPages > 1 && !loading && (
              <div style={{ borderTop: '1px solid var(--mb-border-soft)', padding: '10px 16px' }}>
                {renderPagination()}
              </div>
            )}
          </div>

          {/* Collapse handle */}
          <button
            type="button"
            aria-label={drawerCollapsed ? t.showResults : t.hideResults}
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
              aria-label={t.filters}
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
              aria-label={sheetCollapsed ? t.showResults : t.hideResults}
              style={{ display: 'block', width: '100%', padding: '12px 0 10px', background: 'none', border: 'none', cursor: 'pointer', touchAction: 'none' }}
            >
              <span style={{ display: 'block', width: '38px', height: '4px', borderRadius: '999px', background: '#D8D2C4', margin: '0 auto' }} />
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 10px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--mb-text-primary)' }}>
                {loading ? t.searching : t.clinicsFound(clinics.length)}
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
                        background: mobileView === v ? '#fff' : 'transparent',
                        color: mobileView === v ? 'var(--mb-text-primary)' : 'var(--mb-text-muted)',
                      }}
                    >
                      {t.views[v]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSheetCollapsed((c) => !c)}
                  aria-expanded={!sheetCollapsed}
                  aria-label={sheetCollapsed ? t.showResults : t.hideResults}
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
            {!sheetCollapsed && totalPages > 1 && !loading && (
              <div style={{ padding: '8px 16px 2px' }}>{renderPagination()}</div>
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
            aria-label={t.filterResults}
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
                <SlidersHorizontal size={18} /> {t.filterResults}
              </h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label={t.closeFilters} style={{ background: 'none', border: 'none', color: 'var(--mb-text-muted)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="mb-label">{t.serviceType}</label>
                <select className="mb-select" value={filters.serviceCategory} onChange={(e) => setFilters((f) => ({ ...f, serviceCategory: e.target.value }))}>
                  <option value="">{t.allTypes}</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{humanizeCategory(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-label">{t.searchRadius}</label>
                <select className="mb-select" value={filters.radiusKm} onChange={(e) => setFilters((f) => ({ ...f, radiusKm: Number(e.target.value) }))}>
                  {RADIUS_OPTIONS.map((km) => (
                    <option key={km} value={km}>{km} km</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label className="mb-checkbox-label" style={{ marginBottom: 0 }}>
                  <input type="checkbox" checked={filters.slidingScale} onChange={(e) => setFilters((f) => ({ ...f, slidingScale: e.target.checked }))} />
                  {t.slidingScaleFees}
                </label>
                <label className="mb-checkbox-label" style={{ marginBottom: 0 }}>
                  <input type="checkbox" checked={filters.has340b} onChange={(e) => setFilters((f) => ({ ...f, has340b: e.target.checked }))} />
                  {t.onSite340b}
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem' }}>
              <button type="button" className="mb-btn mb-btn-outline" style={{ flex: 1, height: '46px' }} onClick={resetFilters}>
                {t.resetAll}
              </button>
              <button type="button" className="mb-btn mb-btn-lime" style={{ flex: 1, height: '46px' }} onClick={handleApplyFilters} disabled={loading}>
                {loading ? t.searching : t.applyFilters}
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
