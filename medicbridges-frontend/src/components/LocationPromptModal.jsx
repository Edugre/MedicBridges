import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Lock, Navigation, X } from 'lucide-react';
import { geocodeZip, reverseGeocode } from '../api';
import { useSearchModal } from '../context/SearchModalContext';
import { useLang } from '../context/LangContext';
import { loadSearchLocation, saveSearchLocation } from '../lib/searchLocation';

const CONTENT = {
  en: {
    close: 'Close',
    title: 'Where should we look?',
    subtitle: 'We’ll show affordable clinics and pharmacies closest to you.',
    sheetTitle: 'Find clinics near you',
    sheetSubtitle: 'Share your location or enter a ZIP.',
    useLocation: 'Use my current location',
    locating: 'Finding your location…',
    mostAccurate: 'Most accurate results',
    denied: 'Location access is off in your browser. No problem — enter your ZIP below.',
    deniedSheet: 'Location is turned off. Enter your ZIP below instead.',
    or: 'or',
    zipLabel: 'ZIP code',
    zipLabelSheet: 'Or enter ZIP code',
    zipPlaceholder: 'e.g. 33130',
    search: 'Search',
    searchClinics: 'Search clinics',
    zipInvalid: 'Enter a 5-digit ZIP code.',
    zipNotFound: 'We couldn’t find that ZIP code. Check it and try again.',
    zipLookupFailed: 'We couldn’t look up that ZIP right now. Please try again.',
    viaGeo: 'From your current location',
    viaZip: 'From the ZIP you entered',
    yourLocation: 'Your current location',
    change: 'Change',
    showClinicsNearMe: 'Show clinics near me',
    showClinics: 'Show clinics',
    privacy: 'Used only to search — never stored.',
  },
  es: {
    close: 'Cerrar',
    title: '¿Dónde buscamos?',
    subtitle: 'Te mostraremos las clínicas y farmacias accesibles más cercanas.',
    sheetTitle: 'Encuentra clínicas cerca de ti',
    sheetSubtitle: 'Comparte tu ubicación o ingresa un código postal.',
    useLocation: 'Usar mi ubicación actual',
    locating: 'Buscando tu ubicación…',
    mostAccurate: 'Resultados más precisos',
    denied: 'El acceso a la ubicación está desactivado en tu navegador. No hay problema — ingresa tu código postal abajo.',
    deniedSheet: 'La ubicación está desactivada. Ingresa tu código postal abajo.',
    or: 'o',
    zipLabel: 'Código postal',
    zipLabelSheet: 'O ingresa tu código postal',
    zipPlaceholder: 'ej. 33130',
    search: 'Buscar',
    searchClinics: 'Buscar clínicas',
    zipInvalid: 'Ingresa un código postal de 5 dígitos.',
    zipNotFound: 'No encontramos ese código postal. Revísalo e inténtalo de nuevo.',
    zipLookupFailed: 'No pudimos buscar ese código postal ahora. Inténtalo de nuevo.',
    viaGeo: 'Desde tu ubicación actual',
    viaZip: 'Desde el código postal que ingresaste',
    yourLocation: 'Tu ubicación actual',
    change: 'Cambiar',
    showClinicsNearMe: 'Mostrar clínicas cercanas',
    showClinics: 'Mostrar clínicas',
    privacy: 'Solo se usa para buscar — nunca se guarda.',
  },
};

const MOBILE_QUERY = '(max-width: 640px)';
const ZIP_RE = /^\d{5}$/;
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

// Reopen straight to the confirmed state when a location was already picked
// this session, so returning patients can go with one click.
function initialState() {
  const saved = loadSearchLocation();
  if (saved) {
    return {
      mode: 'found',
      zip: '',
      error: '',
      lookingUp: false,
      place: saved.label,
      via: saved.via,
      coords: { lat: saved.lat, lon: saved.lon },
    };
  }
  return { mode: 'idle', zip: '', error: '', lookingUp: false, place: null, via: null, coords: null };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

function Spinner({ size, track, head }) {
  return (
    <span
      className="lp-spinner"
      style={{ width: size, height: size, border: `2px solid ${track}`, borderTopColor: head }}
    />
  );
}

// Search / Search clinics button: muted until a full ZIP is typed, then lime.
function zipButtonStyle(valid, height, extra) {
  return {
    height,
    padding: '0 20px',
    borderRadius: '13px',
    border: 'none',
    fontSize: '15px',
    fontWeight: 600,
    cursor: valid ? 'pointer' : 'default',
    transition: 'background .2s, color .2s',
    background: valid ? 'var(--mb-true-lime)' : '#F1ECE0',
    color: valid ? '#0a0a0a' : 'var(--mb-text-disabled)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    ...extra,
  };
}

const LABEL_STYLE = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: 'var(--mb-text-muted)',
};

const NOTICE_STYLE = {
  background: 'var(--mb-honey-soft)',
  border: '1px solid #F2E0C2',
  borderRadius: '13px',
  padding: '12px 14px',
  fontSize: '13px',
  lineHeight: 1.5,
  color: 'var(--mb-honey-soft-ink)',
  marginTop: '-6px',
};

function LocationPromptDialog({ onClose, onConfirm }) {
  const { lang } = useLang();
  const t = CONTENT[lang];
  const isMobile = useIsMobile();

  const [state, setState] = useState(initialState);
  const { mode, zip, error, lookingUp, place, via } = state;
  const zipValid = ZIP_RE.test(zip);

  const dialogRef = useRef(null);
  const zipRef = useRef(null);
  // Bumped on every new lookup and on unmount so late geolocation/geocoding
  // callbacks can't overwrite newer state.
  const requestRef = useRef(0);

  const patch = (next) => setState((s) => ({ ...s, ...next }));

  // Focus the dialog on open; hand focus back to the trigger on close.
  useEffect(() => {
    const trigger = document.activeElement;
    dialogRef.current?.focus();
    const requests = requestRef;
    return () => {
      requests.current += 1;
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  // Body scroll lock, Esc to dismiss, Tab trapped inside the dialog.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  // When location fails, steer the patient straight to the ZIP field.
  useEffect(() => {
    if (mode === 'denied') zipRef.current?.focus();
  }, [mode]);

  function handleUseLocation() {
    if (mode === 'locating') return;
    if (!('geolocation' in navigator)) {
      patch({ mode: 'denied', error: '' });
      return;
    }
    const id = ++requestRef.current;
    patch({ mode: 'locating', error: '', lookingUp: false });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (id !== requestRef.current) return;
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        let label = null;
        try {
          label = await reverseGeocode(lat, lon);
        } catch {
          /* the label is cosmetic — search still works from the coordinates */
        }
        if (id !== requestRef.current) return;
        patch({ mode: 'found', place: label, via: 'geo', coords: { lat, lon } });
      },
      () => {
        if (id !== requestRef.current) return;
        patch({ mode: 'denied' });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function handleZipChange(e) {
    patch({ zip: e.target.value.replace(/\D/g, '').slice(0, 5), error: '' });
  }

  async function handleZipSubmit() {
    if (lookingUp) return;
    if (!zipValid) {
      patch({ error: t.zipInvalid });
      return;
    }
    const id = ++requestRef.current;
    // A pending geolocation request is superseded by the ZIP.
    patch({ lookingUp: true, error: '', mode: mode === 'locating' ? 'idle' : mode });
    try {
      const match = await geocodeZip(zip);
      if (id !== requestRef.current) return;
      if (!match) {
        patch({ lookingUp: false, error: t.zipNotFound });
        return;
      }
      patch({
        mode: 'found',
        lookingUp: false,
        place: match.label,
        via: 'zip',
        coords: { lat: match.lat, lon: match.lon },
      });
    } catch {
      if (id !== requestRef.current) return;
      patch({ lookingUp: false, error: t.zipLookupFailed });
    }
  }

  function handleZipKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleZipSubmit();
    }
  }

  function handleChange() {
    requestRef.current += 1;
    setState({ mode: 'idle', zip: '', error: '', lookingUp: false, place: null, via: null, coords: null });
  }

  function handleShowClinics() {
    onConfirm({ ...state.coords, label: place, via });
  }

  const placeLabel = place || t.yourLocation;
  const viaLabel = via === 'zip' ? t.viaZip : t.viaGeo;
  const locating = mode === 'locating';
  const errorId = 'lp-zip-error';

  const zipInputProps = {
    ref: zipRef,
    id: 'lp-zip',
    type: 'text',
    inputMode: 'numeric',
    autoComplete: 'postal-code',
    maxLength: 5,
    placeholder: t.zipPlaceholder,
    value: zip,
    onChange: handleZipChange,
    onKeyDown: handleZipKeyDown,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    className: 'lp-input',
  };

  const errorText = error && (
    <div id={errorId} role="alert" style={{ fontSize: '12.5px', color: '#B4452F', marginTop: '7px' }}>
      {error}
    </div>
  );

  const privacyLine = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: '7px', fontSize: '12px', color: 'var(--mb-text-muted)' }}>
      <Lock size={13} strokeWidth={2.2} /> {t.privacy}
    </div>
  );

  const foundRow = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '12px' : '13px',
        padding: isMobile ? '14px' : '14px 16px',
        border: '1.5px solid var(--mb-primary)',
        background: '#F3FAF7',
        borderRadius: isMobile ? '16px' : '14px',
      }}
    >
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--mb-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Check size={19} strokeWidth={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isMobile ? '15px' : '14.5px', fontWeight: 600, color: 'var(--mb-text-primary)' }}>{placeLabel}</div>
        <div style={{ fontSize: '12.5px', color: 'var(--mb-text-secondary)', marginTop: '2px' }}>{viaLabel}</div>
      </div>
      <button
        type="button"
        onClick={handleChange}
        className="lp-text-btn"
        style={{ height: isMobile ? '44px' : 'auto', padding: '0 4px', background: 'none', border: 'none', fontSize: isMobile ? '14px' : '13px', fontWeight: 600, color: 'var(--mb-primary)', cursor: 'pointer' }}
      >
        {t.change}
      </button>
    </div>
  );

  const showClinicsButton = (
    <button
      type="button"
      onClick={handleShowClinics}
      className="lp-primary"
      style={{
        height: isMobile ? '54px' : '48px',
        borderRadius: isMobile ? '15px' : '13px',
        border: 'none',
        background: 'var(--mb-primary)',
        color: '#fff',
        fontSize: isMobile ? '16px' : '15px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      {isMobile ? t.showClinics : t.showClinicsNearMe} <ArrowRight size={17} strokeWidth={2.2} />
    </button>
  );

  const renderDesktop = () => (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lp-title"
      tabIndex={-1}
      onClick={(e) => e.stopPropagation()}
      className="lp-panel"
      style={{
        position: 'relative',
        width: '440px',
        maxWidth: '100%',
        background: '#fff',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(15,110,86,.28)',
        overflow: 'hidden',
        outline: 'none',
      }}
    >
      <div style={{ background: 'var(--mb-bg-sage)', borderBottom: '1px solid #D1E8E2', padding: '24px 28px 22px', position: 'relative' }}>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="lp-close"
          style={{ position: 'absolute', top: '14px', right: '14px', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,.7)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mb-text-secondary)', cursor: 'pointer' }}
        >
          <X size={18} strokeWidth={2.2} />
        </button>
        <h2 id="lp-title" style={{ fontSize: '23px', fontWeight: 600, letterSpacing: '-.02em', color: 'var(--mb-text-primary)', margin: '0 0 5px', paddingRight: '36px' }}>
          {t.title}
        </h2>
        <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--mb-text-secondary)', margin: 0 }}>{t.subtitle}</p>
      </div>

      <div style={{ padding: '24px 28px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {mode === 'found' ? (
          <>
            {foundRow}
            {showClinicsButton}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleUseLocation}
              aria-busy={locating}
              className="lp-primary"
              style={{ height: '52px', borderRadius: '14px', border: 'none', background: 'var(--mb-primary)', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: locating ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              {locating ? (
                <>
                  <Spinner size="17px" track="rgba(255,255,255,.35)" head="#fff" /> {t.locating}
                </>
              ) : (
                <>
                  <Navigation size={18} strokeWidth={2.2} /> {t.useLocation}
                </>
              )}
            </button>

            {mode === 'denied' && <div role="status" style={NOTICE_STYLE}>{t.denied}</div>}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--mb-text-disabled)' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--mb-border-soft)' }} />
              {t.or}
              <div style={{ flex: 1, height: '1px', background: 'var(--mb-border-soft)' }} />
            </div>

            <div>
              <label htmlFor="lp-zip" style={{ ...LABEL_STYLE, marginBottom: '8px' }}>{t.zipLabel}</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  {...zipInputProps}
                  style={{ flex: 1, minWidth: 0, height: '48px', borderRadius: '13px', padding: '0 15px', fontSize: '16px' }}
                />
                <button
                  type="button"
                  onClick={handleZipSubmit}
                  aria-busy={lookingUp}
                  style={zipButtonStyle(zipValid, '48px', { flexShrink: 0 })}
                >
                  {lookingUp && <Spinner size="14px" track="rgba(10,10,10,.2)" head="#0a0a0a" />}
                  {t.search}
                </button>
              </div>
              {errorText}
            </div>
          </>
        )}
        {privacyLine}
      </div>
    </div>
  );

  const renderSheet = () => (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lp-title"
      tabIndex={-1}
      onClick={(e) => e.stopPropagation()}
      className="lp-sheet"
      style={{
        width: '100%',
        background: '#fff',
        borderRadius: '26px 26px 0 0',
        padding: '10px 20px calc(30px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxHeight: '100%',
        overflowY: 'auto',
        outline: 'none',
      }}
    >
      <div style={{ width: '40px', height: '5px', borderRadius: '3px', background: 'var(--mb-border)', alignSelf: 'center' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginTop: '4px' }}>
        <div>
          <h2 id="lp-title" style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-.02em', color: 'var(--mb-text-primary)', margin: '0 0 5px' }}>
            {t.sheetTitle}
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.45, color: 'var(--mb-text-secondary)', margin: 0 }}>{t.sheetSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="lp-close"
          style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#F4F1EA', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mb-text-secondary)', flexShrink: 0, cursor: 'pointer' }}
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>

      {mode === 'found' ? (
        <>
          {foundRow}
          {showClinicsButton}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={handleUseLocation}
            aria-busy={locating}
            className="lp-loc-row"
            style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '14px', border: '1.5px solid var(--mb-border)', borderRadius: '16px', background: '#fff', textAlign: 'left', cursor: locating ? 'default' : 'pointer' }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--mb-bg-sage)', color: 'var(--mb-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {locating ? <Spinner size="18px" track="#D1E8E2" head="var(--mb-primary)" /> : <Navigation size={19} strokeWidth={2.2} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--mb-text-primary)' }}>{locating ? t.locating : t.useLocation}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--mb-text-muted)', marginTop: '2px' }}>{t.mostAccurate}</div>
            </div>
            <ChevronRight size={18} strokeWidth={2.2} color="var(--mb-text-disabled)" />
          </button>

          {mode === 'denied' && <div role="status" style={{ ...NOTICE_STYLE, padding: '11px 13px', lineHeight: 1.45 }}>{t.deniedSheet}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="lp-zip" style={LABEL_STYLE}>{t.zipLabelSheet}</label>
            <input
              {...zipInputProps}
              style={{ height: '54px', borderRadius: '15px', padding: '0 16px', fontSize: '17px' }}
            />
            {error && (
              <div id={errorId} role="alert" style={{ fontSize: '12.5px', color: '#B4452F' }}>{error}</div>
            )}
          </div>

          <button
            type="button"
            onClick={handleZipSubmit}
            aria-busy={lookingUp}
            style={zipButtonStyle(zipValid, '54px', { width: '100%', borderRadius: '15px', fontSize: '16px' })}
          >
            {lookingUp && <Spinner size="15px" track="rgba(10,10,10,.2)" head="#0a0a0a" />}
            {t.searchClinics}
          </button>
        </>
      )}
      {privacyLine}
    </div>
  );

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : '24px',
        background: 'rgba(37, 48, 46, 0.5)',
        backdropFilter: isMobile ? undefined : 'blur(4px)',
        WebkitBackdropFilter: isMobile ? undefined : 'blur(4px)',
      }}
    >
      {isMobile ? renderSheet() : renderDesktop()}

      <style>{`
        @keyframes lpSpin { to { transform: rotate(360deg); } }
        @keyframes lpIn {
          from { opacity: 0; transform: translateY(14px) scale(.98); }
          to { opacity: 1; transform: none; }
        }
        @keyframes lpUp {
          from { transform: translateY(100%); }
          to { transform: none; }
        }
        .lp-panel { animation: lpIn .4s cubic-bezier(.22,1,.36,1); }
        .lp-sheet { animation: lpUp .45s cubic-bezier(.22,1,.36,1); }
        .lp-spinner {
          display: inline-block;
          border-radius: 50%;
          flex-shrink: 0;
          animation: lpSpin .8s linear infinite;
        }
        .lp-primary:hover { background: var(--mb-primary-hover) !important; }
        .lp-close:hover { color: var(--mb-primary) !important; }
        .lp-text-btn:hover { color: var(--mb-primary-hover) !important; }
        .lp-loc-row:hover { border-color: var(--mb-primary) !important; }
        .lp-input {
          border: 1.5px solid var(--mb-border);
          font-family: inherit;
          font-weight: 500;
          letter-spacing: .06em;
          color: var(--mb-text-primary);
          background: #fff;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .lp-input::placeholder { color: var(--mb-text-disabled); }
        .lp-input:focus {
          border-color: var(--mb-primary);
          box-shadow: 0 0 0 4px rgba(15,110,86,.12);
        }
        .lp-panel button, .lp-sheet button { font-family: inherit; }
        @media (prefers-reduced-motion: reduce) {
          .lp-panel, .lp-sheet { animation: none; }
          .lp-spinner { animation-duration: 2s; }
        }
      `}</style>
    </div>
  );
}

/**
 * Step between "Search anonymously" and the results: asks for the device
 * location or a ZIP, then hands the chosen center to /search, which shows
 * SearchLoadingModal while the query runs.
 */
const LocationPromptModal = () => {
  const { isLocationOpen, closeModal } = useSearchModal();
  const navigate = useNavigate();

  if (!isLocationOpen) return null;

  function handleConfirm(location) {
    saveSearchLocation(location);
    closeModal();
    navigate('/search', { state: { center: location } });
  }

  // Mounted fresh on every open so the prompt starts from a clean state.
  return <LocationPromptDialog onClose={closeModal} onConfirm={handleConfirm} />;
};

export default LocationPromptModal;
