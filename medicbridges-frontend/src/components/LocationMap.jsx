import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Maximize2, X, Send, MapPin } from 'lucide-react';
import { useLang } from '../context/LangContext';

const CONTENT = {
  en: {
    expandMap: (name) => `Expand map${name ? ` for ${name}` : ''}`,
    expand: 'Expand',
    mapFor: (name) => `Map for ${name || 'clinic'}`,
    closeMap: 'Close map',
    getDirections: 'Get directions',
  },
  es: {
    expandMap: (name) => `Ampliar mapa${name ? ` de ${name}` : ''}`,
    expand: 'Ampliar',
    mapFor: (name) => `Mapa de ${name || 'la clínica'}`,
    closeMap: 'Cerrar mapa',
    getDirections: 'Obtener indicaciones',
  },
};

const TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
if (TOKEN) {
  mapboxgl.accessToken = TOKEN;
}

// Zoomed out enough to show the surrounding neighborhood for context; the
// expanded modal zooms in a little closer.
const INLINE_ZOOM = 12;
const MODAL_ZOOM = 14;

// Classic teardrop map pin whose tip sits exactly on the coordinate.
const PIN_SVG = `
<svg width="30" height="39" viewBox="-1 -1 26 34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z"
        fill="#0F6E56" stroke="#fff" stroke-width="1.75"/>
  <circle cx="12" cy="12" r="4.5" fill="#fff"/>
</svg>`;

function addClinicMarker(map, lon, lat) {
  const el = document.createElement('div');
  el.className = 'mb-clinic-pin';
  el.innerHTML = PIN_SVG;
  new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lon, lat]).addTo(map);
}

/**
 * Clinic location map. Renders a compact, non-interactive map inline and
 * expands into a full interactive map modal when clicked.
 */
const LocationMap = ({ latitude, longitude, name, address, directions }) => {
  const inlineRef = useRef(null);
  const inlineMap = useRef(null);
  const modalRef = useRef(null);
  const modalMap = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const { lang } = useLang();
  const t = CONTENT[lang];

  const hasCoords = latitude != null && longitude != null;

  // Inline preview map.
  useEffect(() => {
    if (!TOKEN || !hasCoords || !inlineRef.current || inlineMap.current) return undefined;
    const map = new mapboxgl.Map({
      container: inlineRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [longitude, latitude],
      zoom: INLINE_ZOOM,
      interactive: false,
      attributionControl: false,
    });
    addClinicMarker(map, longitude, latitude);
    inlineMap.current = map;
    return () => {
      map.remove();
      inlineMap.current = null;
    };
  }, [hasCoords, latitude, longitude]);

  // Expanded interactive map.
  useEffect(() => {
    if (!expanded || !TOKEN || !hasCoords || !modalRef.current || modalMap.current) return undefined;
    const map = new mapboxgl.Map({
      container: modalRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [longitude, latitude],
      zoom: MODAL_ZOOM,
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    addClinicMarker(map, longitude, latitude);
    modalMap.current = map;
    // The container is measured only after the modal paints.
    const timer = setTimeout(() => map.resize(), 0);
    return () => {
      clearTimeout(timer);
      map.remove();
      modalMap.current = null;
    };
  }, [expanded, hasCoords, latitude, longitude]);

  // Close the modal on Escape.
  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Fallback when the map can't render (no token or missing coordinates).
  if (!TOKEN || !hasCoords) {
    return (
      <div
        className="clinic-map"
        style={{
          position: 'relative',
          background: 'var(--mb-bg-sage)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: 'var(--mb-text-secondary)',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <MapPin size={26} color="var(--mb-primary)" />
        {address && <span style={{ fontSize: '13px', maxWidth: '240px' }}>{address}</span>}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="clinic-map clinic-map-btn"
        onClick={() => setExpanded(true)}
        aria-label={t.expandMap(name)}
      >
        <div ref={inlineRef} style={{ position: 'absolute', inset: 0 }} />
        <span className="clinic-map-expand">
          <Maximize2 size={14} /> {t.expand}
        </span>
      </button>

      {expanded && (
        <div
          className="clinic-map-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t.mapFor(name)}
          onClick={() => setExpanded(false)}
        >
          <div className="clinic-map-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div ref={modalRef} style={{ width: '100%', height: '100%' }} />
            <button
              type="button"
              className="clinic-map-close"
              onClick={() => setExpanded(false)}
              aria-label={t.closeMap}
            >
              <X size={20} />
            </button>
            {directions && (
              <a
                className="clinic-map-dir mb-btn mb-btn-lime"
                href={directions}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
              >
                <Send size={15} /> {t.getDirections}
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LocationMap;
