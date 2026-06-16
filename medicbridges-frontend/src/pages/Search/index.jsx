import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, MapPin, SlidersHorizontal, Navigation, AlertCircle } from 'lucide-react';
import { searchNearby, listServices } from '../../api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { humanizeCategory } from '../../lib/format';
import ClinicCard from '../../components/ClinicCard';

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

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Distinct service categories for the dropdown.
  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.category).filter(Boolean));
    return [...set].sort();
  }, [services]);

  // Flatten organizations -> sites for the results list.
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

  // Load services + run an initial search once.
  useEffect(() => {
    let active = true;
    listServices()
      .then((rows) => active && setServices(rows || []))
      .catch(() => {});
    // Initial search on mount; runSearch manages its own loading/error state.
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

  const desert = data?.meta?.healthcare_desert;
  const locationLabel = coords.label || (usingFallback ? 'Miami, FL' : 'your area');

  return (
    <div className="page-container" style={{ padding: '0', animation: 'fadeIn 0.6s ease-out' }}>
      {/* Header Area */}
      <div className="search-header" style={{ padding: '3rem 2rem', backgroundColor: 'var(--mb-bg-primary)', borderBottom: '1px solid var(--mb-border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Find Care near {locationLabel}</h1>
          <p style={{ color: 'var(--mb-text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Free clinics, pharmacies, mental health, specialists — filtered for you.
          </p>

          <form
            className="search-bar"
            style={{ display: 'flex', gap: '1rem', maxWidth: '800px' }}
            onSubmit={(e) => { e.preventDefault(); }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <SearchIcon size={20} color="var(--mb-text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="mb-input"
                placeholder="Filter results by clinic name or service..."
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                style={{ paddingLeft: '3rem', height: '100%', fontSize: '1rem' }}
              />
            </div>
            <button type="button" className="mb-btn mb-btn-outline" onClick={handleUseLocation} style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
              <Navigation size={18} /> Use my location
            </button>
          </form>

          {geoError && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--mb-text-muted)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
              <AlertCircle size={15} /> {geoError}
            </p>
          )}
        </div>
      </div>

      <div className="search-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem' }}>
        {/* Filters Sidebar */}
        <aside className="search-sidebar">
          <div className="mb-bento-card" style={{ padding: '1.5rem', position: 'sticky', top: '5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <SlidersHorizontal size={20} /> Filters
              </h3>
              <button type="button" onClick={resetFilters} style={{ background: 'none', border: 'none', color: 'var(--mb-text-muted)', cursor: 'pointer', fontSize: '0.9rem', fontFamily: "'Mulish', sans-serif" }}>Reset All</button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="mb-label">Service Type</label>
              <select className="mb-select" value={filters.serviceCategory} onChange={(e) => setFilters((f) => ({ ...f, serviceCategory: e.target.value }))}>
                <option value="">All types</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{humanizeCategory(c)}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="mb-label">Search Radius</label>
              <select className="mb-select" value={filters.radiusKm} onChange={(e) => setFilters((f) => ({ ...f, radiusKm: Number(e.target.value) }))}>
                {RADIUS_OPTIONS.map((km) => (
                  <option key={km} value={km}>{km} km</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="mb-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.slidingScale} onChange={(e) => setFilters((f) => ({ ...f, slidingScale: e.target.checked }))} />
                Sliding-scale fees
              </label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="mb-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.has340b} onChange={(e) => setFilters((f) => ({ ...f, has340b: e.target.checked }))} />
                On-site 340B medications
              </label>
            </div>

            <button type="button" className="mb-btn mb-btn-secondary" style={{ width: '100%' }} onClick={() => runSearch()} disabled={loading}>
              {loading ? 'Searching…' : 'Apply Filters'}
            </button>
          </div>
        </aside>

        {/* Results Area */}
        <main>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ color: 'var(--mb-text-secondary)' }}>
              {loading ? 'Searching…' : `Showing ${clinics.length} clinic${clinics.length === 1 ? '' : 's'}`}
            </div>
          </div>

          {error && (
            <div className="mb-bento-card" style={{ textAlign: 'center', padding: '3rem 2rem', borderColor: 'var(--mb-border)' }}>
              <AlertCircle size={40} color="var(--mb-text-muted)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Couldn’t load clinics</h3>
              <p style={{ color: 'var(--mb-text-muted)', marginBottom: '1.5rem' }}>{error}</p>
              <button className="mb-btn mb-btn-secondary" onClick={() => runSearch()}>Try again</button>
            </div>
          )}

          {!error && !loading && clinics.length === 0 && (
            <div className="mb-bento-card" style={{ textAlign: 'center', padding: '4rem 2rem', borderStyle: 'dashed' }}>
              <MapPin size={48} color="var(--mb-border)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--mb-text-muted)' }}>
                {desert ? 'No clinics found nearby' : 'No clinics match your filters'}
              </h3>
              <p style={{ color: 'var(--mb-text-muted)' }}>
                Try widening the search radius or clearing some filters.
              </p>
            </div>
          )}

          {!error && clinics.map(({ org, site }) => (
            <ClinicCard key={`${org.org_id}:${site.site_id}`} org={org} site={site} />
          ))}
        </main>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .search-layout { grid-template-columns: 260px 1fr !important; }
        }
        @media (max-width: 768px) {
          .search-layout { 
            grid-template-columns: 1fr !important; 
          }
          .search-sidebar {
            order: 2;
          }
          .search-sidebar .mb-bento-card {
            position: static !important;
          }
          .search-bar {
            flex-direction: column !important;
          }
          .search-bar .mb-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .search-header { padding: 2rem 1rem !important; }
        }
      `}</style>
    </div>
  );
};

export default Search;
