import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, MapPin, SlidersHorizontal, Navigation, AlertCircle, X } from 'lucide-react';
import { searchNearby, listServices } from '../../api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { humanizeCategory } from '../../lib/format';
import ClinicCard from '../../components/ClinicCard';
import SearchMap from '../../components/SearchMap';

const RADIUS_OPTIONS = [1, 2, 5, 10, 20];

const Search = () => {
  const { coords, error: geoError, usingFallback, requestLocation } = useGeolocation();

  const [services, setServices] = useState([]);
  const [filters, setFilters] = useState({
    serviceCategory: '',
    slidingScale: false,
    has340b: false,
    radiusKm: 20,
  });
  const [textQuery, setTextQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

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
    () => clinics.map(({ org, site }) => ({
      orgId: org.org_id,
      siteId: site.site_id,
      latitude: site.latitude,
      longitude: site.longitude,
      name: site.name || org.name,
    })),
    [clinics],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.serviceCategory) count += 1;
    if (filters.slidingScale) count += 1;
    if (filters.has340b) count += 1;
    if (filters.radiusKm !== 20) count += 1;
    return count;
  }, [filters]);

  async function runSearch(center = coords) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result = await searchNearby({
        lat: center.lat,
        lon: center.lon,
        radiusKm: filters.radiusKm,
        serviceCategories: filters.serviceCategory ? [filters.serviceCategory] : undefined,
        acceptsSlidingScale: filters.slidingScale || undefined,
        has340b: filters.has340b || undefined,
        signal: controller.signal,
      });
      setData(result);
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
    setFilters({ serviceCategory: '', slidingScale: false, has340b: false, radiusKm: 20 });
    setTextQuery('');
  }

  function handleApplyFilters() {
    setFiltersOpen(false);
    runSearch();
  }

  const desert = data?.meta?.healthcare_desert;
  const locationLabel = coords.label || (usingFallback ? 'Miami, FL' : 'your area');

  return (
    <div className="search-page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 74px)', animation: 'fadeIn 0.4s ease-out forwards' }}>
      {/* Top toolbar */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--mb-border)', background: 'var(--mb-bg-primary)', zIndex: 10 }}>
        <div style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <h1 style={{ fontSize: '1.35rem', margin: 0, lineHeight: 1.2 }}>Find Care near {locationLabel}</h1>
            <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0' }}>
              {loading ? 'Searching…' : `${clinics.length} clinic${clinics.length === 1 ? '' : 's'} found`}
            </p>
          </div>

          <form
            className="search-bar"
            style={{ display: 'flex', gap: '0.5rem', flex: '2 1 320px', minWidth: 'min(100%, 280px)' }}
            onSubmit={(e) => e.preventDefault()}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <SearchIcon size={18} color="var(--mb-text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="mb-input"
                placeholder="Filter by name or service…"
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem', height: '42px', fontSize: '0.95rem' }}
              />
            </div>
          </form>

          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button
              type="button"
              className="mb-btn mb-btn-outline"
              onClick={() => setFiltersOpen((o) => !o)}
              style={{ height: '42px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', position: 'relative' }}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal size={17} />
              Filters
              {activeFilterCount > 0 && (
                <span style={{
                  marginLeft: '2px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 5px',
                  borderRadius: '999px',
                  background: 'var(--mb-primary)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className="mb-btn mb-btn-outline"
              onClick={handleUseLocation}
              style={{ height: '42px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', whiteSpace: 'nowrap' }}
            >
              <Navigation size={17} /> Location
            </button>
          </div>
        </div>

        {geoError && (
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--mb-text-muted)', fontSize: '0.85rem', margin: '0 1.5rem 0.75rem' }}>
            <AlertCircle size={14} /> {geoError}
          </p>
        )}

        {/* Collapsible filters panel */}
        {filtersOpen && (
          <div
            className="search-filters-panel"
            style={{
              padding: '1rem 1.5rem 1.25rem',
              borderTop: '1px solid var(--mb-border-soft)',
              background: 'var(--mb-bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SlidersHorizontal size={18} /> Filter results
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button type="button" onClick={resetFilters} style={{ background: 'none', border: 'none', color: 'var(--mb-text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Reset all
                </button>
                <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" style={{ background: 'none', border: 'none', color: 'var(--mb-text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="search-filters-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'end' }}>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.35rem' }}>
                <label className="mb-checkbox-label" style={{ marginBottom: 0 }}>
                  <input type="checkbox" checked={filters.slidingScale} onChange={(e) => setFilters((f) => ({ ...f, slidingScale: e.target.checked }))} />
                  Sliding-scale fees
                </label>
                <label className="mb-checkbox-label" style={{ marginBottom: 0 }}>
                  <input type="checkbox" checked={filters.has340b} onChange={(e) => setFilters((f) => ({ ...f, has340b: e.target.checked }))} />
                  On-site 340B medications
                </label>
              </div>

              <div>
                <button type="button" className="mb-btn mb-btn-lime" style={{ width: '100%', height: '46px' }} onClick={handleApplyFilters} disabled={loading}>
                  {loading ? 'Searching…' : 'Apply filters'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Split: list (40%) + map (60%) */}
      <div className="search-split" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <aside
          className="search-list-panel"
          style={{
            width: '40%',
            flexShrink: 0,
            overflowY: 'auto',
            borderRight: '1px solid var(--mb-border)',
            background: 'var(--mb-bg-primary)',
            padding: '1rem 1.25rem',
          }}
        >
          {error && (
            <div className="mb-bento-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <AlertCircle size={36} color="var(--mb-text-muted)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Couldn't load clinics</h3>
              <p style={{ color: 'var(--mb-text-muted)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>{error}</p>
              <button type="button" className="mb-btn mb-btn-lime" onClick={() => runSearch()}>Try again</button>
            </div>
          )}

          {!error && !loading && clinics.length === 0 && (
            <div className="mb-bento-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderStyle: 'dashed' }}>
              <MapPin size={40} color="var(--mb-border)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--mb-text-muted)' }}>
                {desert ? 'No clinics found nearby' : 'No clinics match your filters'}
              </h3>
              <p style={{ color: 'var(--mb-text-muted)', fontSize: '0.95rem' }}>
                Try widening the search radius or clearing some filters.
              </p>
            </div>
          )}

          {!error && clinics.map(({ org, site }) => {
            const siteKey = `${org.org_id}:${site.site_id}`;
            return (
              <div
                key={siteKey}
                onMouseEnter={() => setSelectedSiteId(siteKey)}
                onMouseLeave={() => setSelectedSiteId(null)}
                style={{
                  borderRadius: 'var(--mb-radius-xl)',
                  outline: selectedSiteId === siteKey ? '2px solid var(--mb-primary)' : '2px solid transparent',
                  transition: 'outline-color 0.15s ease',
                }}
              >
                <ClinicCard org={org} site={site} />
              </div>
            );
          })}
        </aside>

        <div className="search-map-panel" style={{ width: '60%', flexShrink: 0, position: 'relative', minHeight: 0 }}>
          <SearchMap
            center={coords}
            sites={mapSites}
            selectedSiteId={selectedSiteId}
            onSiteSelect={setSelectedSiteId}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .search-split {
            flex-direction: column !important;
          }
          .search-list-panel {
            width: 100% !important;
            max-height: 45vh;
            border-right: none !important;
            border-bottom: 1px solid var(--mb-border);
          }
          .search-map-panel {
            width: 100% !important;
            flex: 1 !important;
            min-height: 280px !important;
          }
          .search-filters-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .search-filters-grid {
            grid-template-columns: 1fr !important;
          }
          .search-bar {
            flex: 1 1 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Search;
