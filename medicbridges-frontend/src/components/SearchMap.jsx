import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
if (TOKEN) {
  mapboxgl.accessToken = TOKEN;
}

function createMarkerElement(isSelected) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `search-map-marker${isSelected ? ' search-map-marker--selected' : ''}`;
  el.setAttribute('aria-label', 'Clinic location');
  return el;
}

const SearchMap = ({ center, sites, selectedSiteId, onSiteSelect }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !TOKEN) return undefined;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [center.lon, center.lat],
      zoom: 11,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
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

    let markerCount = 0;
    for (const site of sites) {
      const lat = site.latitude;
      const lon = site.longitude;
      if (lat == null || lon == null) continue;

      const siteId = `${site.orgId}:${site.siteId}`;
      const el = createMarkerElement(siteId === selectedSiteId);
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

    if (markerCount > 0) {
      map.fitBounds(bounds, { padding: 72, maxZoom: 14, duration: 600 });
    }
  }, [sites, center.lat, center.lon, selectedSiteId, onSiteSelect]);

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
        Map unavailable — set <code style={{ fontSize: '0.85rem' }}>VITE_MAPBOX_ACCESS_TOKEN</code> in your <code style={{ fontSize: '0.85rem' }}>.env</code>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default SearchMap;
