// ZIP / coordinate geocoding via the Mapbox Geocoding v6 API. Uses the same
// public token as the maps; nothing is sent to our backend.
const TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
const BASE_URL = 'https://api.mapbox.com/search/geocode/v6';

async function mapboxGet(path, params, signal) {
  if (!TOKEN) throw new Error('Geocoding is unavailable (missing Mapbox token).');
  const qs = new URLSearchParams({ ...params, access_token: TOKEN });
  const resp = await fetch(`${BASE_URL}${path}?${qs}`, { signal });
  if (!resp.ok) throw new Error(`Geocoding failed with status ${resp.status}`);
  const body = await resp.json();
  return body?.features?.[0] || null;
}

// "Miami, FL 33130" from a postcode feature, degrading gracefully.
function postcodeLabel(feature) {
  const props = feature?.properties || {};
  const zip = props.name || '';
  const city = props.context?.place?.name;
  const state = props.context?.region?.region_code;
  const area = [city, state].filter(Boolean).join(', ');
  return [area, zip].filter(Boolean).join(' ') || null;
}

/**
 * Resolve a 5-digit US ZIP to its center point.
 * @returns {Promise<{lat:number, lon:number, label:string, zip:string}|null>}
 *   null when Mapbox has no match for the ZIP.
 */
export async function geocodeZip(zip, { signal } = {}) {
  const feature = await mapboxGet(
    '/forward',
    { q: zip, types: 'postcode', country: 'us', limit: '1' },
    signal,
  );
  if (!feature || feature.properties?.name !== zip) return null;
  const [lon, lat] = feature.geometry.coordinates;
  return { lat, lon, zip, label: postcodeLabel(feature) || `ZIP ${zip}` };
}

/**
 * Best-effort "City, ST ZIP" label for a coordinate.
 * @returns {Promise<string|null>} null when there's no postcode match.
 */
export async function reverseGeocode(lat, lon, { signal } = {}) {
  const feature = await mapboxGet(
    '/reverse',
    { latitude: String(lat), longitude: String(lon), types: 'postcode', limit: '1' },
    signal,
  );
  return postcodeLabel(feature);
}
