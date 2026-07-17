import { useEffect, useRef } from 'react';

// Cloudflare Turnstile widget. Loads the script once (shared across instances)
// and renders an explicit widget so we control lifecycle inside the modal.
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;
function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = SCRIPT_SRC;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scriptPromise = null;
      reject(new Error('Failed to load Turnstile'));
    };
    document.head.appendChild(el);
  });
  return scriptPromise;
}

/**
 * @param {object} props
 * @param {string} props.siteKey            Turnstile site key (public).
 * @param {(token: string) => void} props.onVerify   Called with the token on success.
 * @param {() => void} [props.onExpire]     Called on expiry/error (token no longer valid).
 * @param {'auto'|'light'|'dark'} [props.theme]
 */
const Turnstile = ({ siteKey, onVerify, onExpire, theme = 'auto' }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  // Keep latest callbacks without re-running the render effect.
  const cbRef = useRef({ onVerify, onExpire });
  useEffect(() => {
    cbRef.current = { onVerify, onExpire };
  });

  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token) => cbRef.current.onVerify?.(token),
          'expired-callback': () => cbRef.current.onExpire?.(),
          'error-callback': () => cbRef.current.onExpire?.(),
        });
      })
      .catch(() => {
        // Script blocked/failed — surface as an expired/absent token so the
        // caller keeps Submit disabled rather than silently allowing through.
        cbRef.current.onExpire?.();
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme]);

  return <div ref={containerRef} />;
};

export default Turnstile;
