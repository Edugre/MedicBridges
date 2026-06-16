import { useCallback, useState } from 'react';

// Downtown Miami — used as the default search center when the user hasn't
// granted (or has denied) geolocation. The product is Miami-Dade focused.
export const MIAMI_CENTER = { lat: 25.7617, lon: -80.1918, label: 'Miami, FL' };

/**
 * Browser geolocation as a hook. Never rejects to the caller — on error or
 * denial it resolves with the Miami fallback and exposes `error` for the UI.
 *
 * @returns {{
 *   coords: {lat:number, lon:number, label?:string},
 *   loading: boolean,
 *   error: string|null,
 *   usingFallback: boolean,
 *   requestLocation: () => Promise<{lat:number, lon:number}>,
 * }}
 */
export function useGeolocation(initial = MIAMI_CENTER) {
  const [coords, setCoords] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(true);

  const requestLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setError('Location is not supported by this browser.');
        setUsingFallback(true);
        resolve(coords);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            label: 'Your location',
          };
          setCoords(next);
          setUsingFallback(false);
          setLoading(false);
          resolve(next);
        },
        (err) => {
          setError(
            err.code === err.PERMISSION_DENIED
              ? 'Location access denied — showing results for Miami.'
              : 'Could not get your location — showing results for Miami.'
          );
          setUsingFallback(true);
          setLoading(false);
          resolve(MIAMI_CENTER);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  }, [coords]);

  const setManualCoords = useCallback((next) => {
    setCoords(next);
    setUsingFallback(false);
    setError(null);
  }, []);

  return { coords, loading, error, usingFallback, requestLocation, setManualCoords };
}
