import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, AlertCircle, Pill } from 'lucide-react';
import { searchNearby } from '../../api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { formatAddress, formatDistance } from '../../lib/format';
import { useLang } from '../../context/LangContext';

const RADIUS_OPTIONS = [1, 2, 5, 10, 20];

const CONTENT = {
  en: {
    filters: 'Filters',
    type: 'Type',
    allResources: 'All resources',
    clinics: 'Clinics / Health Centers',
    pharmacies: '340B Pharmacies',
    useLocation: 'Use My Current Location',
    searchRadius: 'Search Radius',
    searching: 'Searching…',
    applyFilters: 'Apply filters',
    resourcesNear: (label) => `Resources near ${label}`,
    countLabel: (n, radius) => `${n} location${n === 1 ? '' : 's'} within ${radius} km`,
    tryAgain: 'Try again',
    noneTitle: 'No mapped locations found',
    noneBody: 'Try a larger radius or a different location.',
    contractPharmacy: '340B contract pharmacy',
    healthCenter: 'Health center',
    outsideRadius: ' · just outside radius',
    fallbackArea: 'your area',
  },
  es: {
    filters: 'Filtros',
    type: 'Tipo',
    allResources: 'Todos los recursos',
    clinics: 'Clínicas / Centros de Salud',
    pharmacies: 'Farmacias 340B',
    useLocation: 'Usar Mi Ubicación Actual',
    searchRadius: 'Radio de Búsqueda',
    searching: 'Buscando…',
    applyFilters: 'Aplicar filtros',
    resourcesNear: (label) => `Recursos cerca de ${label}`,
    countLabel: (n, radius) => `${n} ubicaci${n === 1 ? 'ón' : 'ones'} dentro de ${radius} km`,
    tryAgain: 'Intentar de nuevo',
    noneTitle: 'No se encontraron ubicaciones en el mapa',
    noneBody: 'Prueba con un radio más amplio o una ubicación diferente.',
    contractPharmacy: 'Farmacia por contrato 340B',
    healthCenter: 'Centro de salud',
    outsideRadius: ' · justo fuera del radio',
    fallbackArea: 'tu área',
  },
};

const MapPage = () => {
  const { coords, error: geoError, usingFallback, requestLocation } = useGeolocation();
  const { lang } = useLang();
  const t = CONTENT[lang];

  const [resourceType, setResourceType] = useState('all');
  const [radiusKm, setRadiusKm] = useState(20);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Flatten orgs into sites + pharmacies as map points.
  const points = useMemo(() => {
    const orgs = data?.organizations || [];
    const rows = [];
    for (const org of orgs) {
      if (resourceType !== 'pharmacy') {
        for (const site of org.sites || []) {
          if (site.latitude == null || site.longitude == null) continue;
          rows.push({ kind: 'site', org, item: site, id: site.site_id });
        }
      }
      if (resourceType !== 'site') {
        for (const ph of org.contract_pharmacies || []) {
          if (ph.latitude == null || ph.longitude == null) continue;
          rows.push({ kind: 'pharmacy', org, item: ph, id: ph.pharmacy_id });
        }
      }
    }
    return rows.sort((a, b) => (a.item.distance_m ?? Infinity) - (b.item.distance_m ?? Infinity));
  }, [data, resourceType]);

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
        radiusKm,
        resourceTypes: resourceType === 'all' ? undefined : [resourceType],
        signal: controller.signal,
      });
      setData(result);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Something went wrong.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Kick off the initial search on mount; runSearch manages its own state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runSearch(coords);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUseLocation() {
    const center = await requestLocation();
    runSearch(center);
  }

  const locationLabel = coords.label || (usingFallback ? 'Miami, FL' : t.fallbackArea);

  return (
    <div className="map-wrapper" style={{ display: 'flex', height: 'calc(100vh - 80px)', width: '100%' }}>
      {/* Filters Sidebar */}
      <aside className="map-sidebar" style={{ width: '350px', backgroundColor: 'var(--mb-bg-surface)', borderRight: '1px solid var(--mb-border)', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--mb-border)' }}>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={24} /> {t.filters}</h2>
        </div>

        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <div className="mb-input-group">
            <label className="mb-label">{t.type}</label>
            <select className="mb-select" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
              <option value="all">{t.allResources}</option>
              <option value="site">{t.clinics}</option>
              <option value="pharmacy">{t.pharmacies}</option>
            </select>
          </div>

          <button className="mb-btn mb-btn-outline" onClick={handleUseLocation} style={{ width: '100%', margin: '1rem 0', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={18} /> {t.useLocation}
          </button>

          <div className="mb-input-group">
            <label className="mb-label">{t.searchRadius}</label>
            <select className="mb-select" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
              {RADIUS_OPTIONS.map((km) => (
                <option key={km} value={km}>{km} km</option>
              ))}
            </select>
          </div>

          {geoError && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--mb-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              <AlertCircle size={14} /> {geoError}
            </p>
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--mb-border)', backgroundColor: 'var(--mb-bg-primary)' }}>
          <button className="mb-btn mb-btn-secondary" style={{ width: '100%' }} onClick={() => runSearch()} disabled={loading}>
            {loading ? t.searching : t.applyFilters}
          </button>
        </div>
      </aside>

      {/* Results Area */}
      <main style={{ flex: 1, position: 'relative', backgroundColor: 'var(--mb-bg-primary)', overflowY: 'auto' }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--mb-border)', position: 'sticky', top: 0, backgroundColor: 'var(--mb-bg-primary)', zIndex: 5 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{t.resourcesNear(locationLabel)}</h2>
          <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.9rem' }}>
            {loading ? t.searching : t.countLabel(points.length, radiusKm)}
          </p>
        </div>

        <div style={{ padding: '1.5rem 2rem' }}>
          {error && (
            <div className="mb-bento-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <AlertCircle size={36} color="var(--mb-text-muted)" style={{ marginBottom: '1rem' }} />
              <p style={{ color: 'var(--mb-text-muted)', marginBottom: '1.5rem' }}>{error}</p>
              <button className="mb-btn mb-btn-secondary" onClick={() => runSearch()}>{t.tryAgain}</button>
            </div>
          )}

          {!error && !loading && points.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--mb-text-muted)' }}>
              <MapPin size={48} color="var(--mb-border)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ marginBottom: '0.5rem' }}>{t.noneTitle}</h3>
              <p>{t.noneBody}</p>
            </div>
          )}

          {!error && points.map(({ kind, org, item, id }) => {
            const distance = formatDistance(item.distance_m);
            const address = formatAddress(item);
            const inner = (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {kind === 'pharmacy' ? <Pill size={16} color="var(--mb-accent)" /> : <MapPin size={16} color="var(--mb-accent)" />}
                    {item.name || org.name}
                  </h3>
                  {distance && <span style={{ fontSize: '0.9rem', color: 'var(--mb-text-heading)', whiteSpace: 'nowrap' }}>{distance}</span>}
                </div>
                {address && <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>{address}</p>}
                <span style={{ display: 'inline-block', marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--mb-text-muted)' }}>
                  {kind === 'pharmacy' ? t.contractPharmacy : t.healthCenter}
                  {!item.within_radius && t.outsideRadius}
                </span>
              </>
            );

            return kind === 'site' ? (
              <Link key={id} to={`/clinic/${encodeURIComponent(org.org_id)}`} className="mb-bento-card" style={{ display: 'block', marginBottom: '1rem', textDecoration: 'none', color: 'inherit' }}>
                {inner}
              </Link>
            ) : (
              <div key={id} className="mb-bento-card" style={{ marginBottom: '1rem' }}>
                {inner}
              </div>
            );
          })}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .map-wrapper { flex-direction: column !important; height: auto !important; min-height: calc(100vh - 70px); }
          .map-sidebar { width: 100% !important; height: auto !important; border-right: none !important; border-bottom: 1px solid var(--mb-border); }
        }
      `}</style>
    </div>
  );
};

export default MapPage;
