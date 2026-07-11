import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Plus, Minus, LocateFixed, RotateCw } from 'lucide-react';
import { directionsUrl } from '../lib/format';
import { useLang } from '../context/LangContext';

const TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
if (TOKEN) {
  mapboxgl.accessToken = TOKEN;
}

const DEFAULT_PADDING = { top: 90, bottom: 70, left: 60, right: 70 };

const CONTENT = {
  en: {
    clinicWithLabel: (label) => `Clinic — ${label}`,
    clinicLocation: 'Clinic location',
    clinic: 'Clinic',
    meds340b: '340B meds',
    slidingScale: 'Sliding scale',
    call: 'Call',
    directions: 'Directions',
    mapUnavailable1: 'Map unavailable — set ',
    mapUnavailable2: ' in your ',
    searchThisArea: 'Search this area',
    yourLocation: 'Your location',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    useMyLocation: 'Use my location',
  },
  es: {
    clinicWithLabel: (label) => `Clínica — ${label}`,
    clinicLocation: 'Ubicación de la clínica',
    clinic: 'Clínica',
    meds340b: 'Medicamentos 340B',
    slidingScale: 'Escala móvil',
    call: 'Llamar',
    directions: 'Indicaciones',
    mapUnavailable1: 'Mapa no disponible — configura ',
    mapUnavailable2: ' en tu ',
    searchThisArea: 'Buscar en esta área',
    yourLocation: 'Tu ubicación',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    useMyLocation: 'Usar mi ubicación',
  },
};

function createMarkerElement(label, isSelected, t) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `mb-fee-pin${isSelected ? ' mb-fee-pin--selected' : ''}`;
  el.setAttribute('aria-label', label ? t.clinicWithLabel(label) : t.clinicLocation);
  el.textContent = label || '';
  return el;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

function buildPopupHtml(site, t) {
  const badges = [];
  if (site.has340b) {
    badges.push(`<span style="display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;font-size:11.5px;font-weight:600;background:#FAEEDA;color:#B87814;border:1px solid #F2E0C2">${esc(t.meds340b)}</span>`);
  }
  if (site.sliding) {
    badges.push(`<span style="display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;font-size:11.5px;font-weight:600;background:#E1F5EE;color:#0F6E56">${esc(t.slidingScale)}</span>`);
  }
  const badgeRow = badges.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${badges.join('')}</div>`
    : '';
  const distance = site.distanceLabel
    ? `<div style="font-size:13px;font-weight:600;color:#0F6E56;white-space:nowrap">${esc(site.distanceLabel)}</div>`
    : '';
  const address = site.address
    ? `<div style="color:#5A655F;font-size:12.5px;margin-top:3px">${esc(site.address)}</div>`
    : '';
  const call = site.phone
    ? `<a href="tel:${esc(site.phone)}" style="flex:1;text-align:center;padding:8px 12px;border-radius:10px;font-size:12.5px;font-weight:600;text-decoration:none;border:1px solid #E6E1D6;background:#fff;color:#25302E">${esc(t.call)}</a>`
    : '';
  const dir = site.directions
    ? `<a href="${esc(site.directions)}" target="_blank" rel="noopener noreferrer" style="flex:1;text-align:center;padding:8px 12px;border-radius:10px;font-size:12.5px;font-weight:600;text-decoration:none;border:none;background:#0F6E56;color:#fff">${esc(t.directions)}</a>`
    : '';
  const actions = call || dir
    ? `<div style="display:flex;gap:8px;margin-top:12px">${call}${dir}</div>`
    : '';

  return `
    <div style="width:250px">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
        <div style="min-width:0">
          <div style="font-size:15px;font-weight:600;color:#25302E;line-height:1.25">${esc(site.name || t.clinic)}</div>
          ${address}
        </div>
        ${distance}
      </div>
      ${badgeRow}
      ${actions}
    </div>`;
}

const CTRL_BTN = {
  width: '38px',
  height: '38px',
  borderRadius: '11px',
  background: '#fff',
  border: '1px solid var(--mb-border)',
  boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--mb-text-primary)',
  padding: 0,
};

const SearchMap = ({
  center,
  sites,
  selectedSiteId,
  onSiteSelect,
  onSearchArea,
  onLocate,
  fitPadding,
  pillLeftInset = 0,
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);
  const suppressClose = useRef(false);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const { lang } = useLang();
  const t = CONTENT[lang];

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !TOKEN) return undefined;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [center.lon, center.lat],
      zoom: 11,
      attributionControl: true,
    });

    // Show "Search this area" only after a user-initiated pan/zoom
    // (programmatic moves such as flyTo/fitBounds carry no originalEvent).
    map.on('moveend', (e) => {
      if (e.originalEvent) setShowSearchArea(true);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !TOKEN) return;
    map.flyTo({ center: [center.lon, center.lat], duration: 700, essential: true });
  }, [center.lat, center.lon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !TOKEN) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([center.lon, center.lat]);

    // Distinct "you are here" marker at the search center.
    const userEl = document.createElement('div');
    userEl.className = 'mb-user-pin';
    userEl.setAttribute('aria-label', t.yourLocation);
    const userMarker = new mapboxgl.Marker({ element: userEl, anchor: 'center' })
      .setLngLat([center.lon, center.lat])
      .addTo(map);
    markersRef.current.push(userMarker);

    let markerCount = 0;
    for (const site of sites) {
      const lat = site.latitude;
      const lon = site.longitude;
      if (lat == null || lon == null) continue;

      const siteId = `${site.orgId}:${site.siteId}`;
      const el = createMarkerElement(site.label, siteId === selectedSiteId, t);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSiteSelect?.(siteId);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lon, lat])
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([lon, lat]);
      markerCount += 1;
    }

    // On a fresh result set, zoom in on the selected (nearest) clinic if there
    // is one; otherwise fall back to fitting all pins in view.
    const focus = sites.find(
      (s) => `${s.orgId}:${s.siteId}` === selectedSiteId && s.latitude != null && s.longitude != null,
    );
    if (focus) {
      map.flyTo({ center: [focus.longitude, focus.latitude], zoom: 14, duration: 700, essential: true });
    } else if (markerCount > 0) {
      map.fitBounds(bounds, { padding: fitPadding || DEFAULT_PADDING, maxZoom: 14, duration: 600 });
    }
    if (focus || markerCount > 0) {
      setShowSearchArea(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites, center.lat, center.lon, lang]);

  // Keep marker selection styling in sync without rebuilding all markers.
  useEffect(() => {
    for (const marker of markersRef.current) {
      const el = marker.getElement();
      const lngLat = marker.getLngLat();
      const match = sites.find(
        (s) => s.longitude === lngLat.lng && s.latitude === lngLat.lat && `${s.orgId}:${s.siteId}` === selectedSiteId,
      );
      el.classList.toggle('mb-fee-pin--selected', Boolean(match));
    }
  }, [selectedSiteId, sites]);

  // Ease the map onto whichever clinic is active (hovered in the list or the
  // auto-selected nearest one). Zooms in but never out, so it feels like a
  // focus rather than a jarring reset.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !TOKEN || !selectedSiteId) return;
    const site = sites.find((s) => `${s.orgId}:${s.siteId}` === selectedSiteId);
    if (!site || site.latitude == null || site.longitude == null) return;
    map.easeTo({
      center: [site.longitude, site.latitude],
      zoom: Math.max(map.getZoom(), 14),
      duration: 500,
      essential: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId]);

  // Selected-clinic popup.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !TOKEN) return;

    if (popupRef.current) {
      suppressClose.current = true;
      popupRef.current.remove();
      popupRef.current = null;
      suppressClose.current = false;
    }

    if (!selectedSiteId) return;
    const site = sites.find((s) => `${s.orgId}:${s.siteId}` === selectedSiteId);
    if (!site || site.latitude == null || site.longitude == null) return;

    const popup = new mapboxgl.Popup({
      offset: 26,
      closeButton: true,
      closeOnClick: false,
      className: 'mb-map-popup',
      maxWidth: '280px',
      anchor: 'bottom',
    })
      .setLngLat([site.longitude, site.latitude])
      .setHTML(buildPopupHtml({ ...site, directions: site.directions || directionsUrl(site) }, t))
      .addTo(map);

    popup.on('close', () => {
      if (!suppressClose.current) onSiteSelect?.(null);
    });

    popupRef.current = popup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, sites, lang]);

  function handleSearchArea() {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    setShowSearchArea(false);
    onSearchArea?.({ lat: c.lat, lon: c.lng });
  }

  if (!TOKEN) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--mb-bg-sage)',
          color: 'var(--mb-text-secondary)',
          fontSize: '0.95rem',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        {t.mapUnavailable1}<code style={{ fontSize: '0.85rem' }}>VITE_MAPBOX_ACCESS_TOKEN</code>{t.mapUnavailable2}<code style={{ fontSize: '0.85rem' }}>.env</code>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Search this area */}
      {showSearchArea && (
        <div
          className="mb-searcharea-wrap"
          style={{
            position: 'absolute',
            top: '18px',
            left: pillLeftInset,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <button
            type="button"
            onClick={handleSearchArea}
            style={{
              pointerEvents: 'auto',
              background: '#fff',
              border: '1px solid var(--mb-border)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              borderRadius: 'var(--mb-radius-pill)',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--mb-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
            }}
          >
            <RotateCw size={15} /> {t.searchThisArea}
          </button>
        </div>
      )}

      {/* Zoom + locate */}
      <div style={{ position: 'absolute', right: '16px', bottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 5 }}>
        <button type="button" aria-label={t.zoomIn} style={CTRL_BTN} onClick={() => mapRef.current?.zoomIn()}>
          <Plus size={18} />
        </button>
        <button type="button" aria-label={t.zoomOut} style={CTRL_BTN} onClick={() => mapRef.current?.zoomOut()}>
          <Minus size={18} />
        </button>
        <button
          type="button"
          aria-label={t.useMyLocation}
          style={{ ...CTRL_BTN, marginTop: '4px', color: 'var(--mb-primary)' }}
          onClick={() => onLocate?.()}
        >
          <LocateFixed size={18} />
        </button>
      </div>
    </div>
  );
};

export default SearchMap;
