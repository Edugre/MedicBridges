// The last search center the patient picked, kept for this browser tab only
// (sessionStorage) so the location prompt and /search can reuse it. Never
// sent to the server beyond the search query itself.
const STORAGE_KEY = 'mb-search-location';

/** @returns {{lat:number, lon:number, label:string|null, via:'geo'|'zip'}|null} */
export function loadSearchLocation() {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
    if (parsed && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon)) return parsed;
  } catch {
    /* ignore storage / parse failures */
  }
  return null;
}

export function saveSearchLocation(location) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
}
