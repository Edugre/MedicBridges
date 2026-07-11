import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Lock, Search, User, X } from 'lucide-react';
import { useSearchModal } from '../context/SearchModalContext';
import { useLang } from '../context/LangContext';

const CONTENT = {
  en: {
    title: 'How would you like to search?',
    subtitle: 'You can start right away with or without an account. Choose what works best for you.',
    closeModal: 'Close modal',
    searchAnon: 'Search Anonymously',
    anonDesc: 'Find clinics and pharmacies instantly with just your ZIP code. No account, no login, no information stored.',
    whatYoullSee: "What you'll see:",
    anonFeatures: ['Nearby clinics and pharmacies', 'Hours, location, and phone', 'General sliding-scale info'],
    limitedTo: 'Limited to:',
    limitedDesc: 'No estimated discount, no saved search history, limited filters.',
    createAccount: 'Create Account',
    accountDesc: 'Create a free account to unlock personalized features and save your searches.',
    accountBenefitsLabel: 'Account benefits:',
    accountFeatures: ['Save your favorite clinics', 'Get personalized cost estimates', 'See contract pharmacy networks', 'Get personalized recommendations'],
    secureTitle: 'Your information is secure',
    secureDesc: 'Encrypted and never sold. Used only to personalize your experience.',
    close: 'Close',
    startRightAway: 'Start right away — no account needed.',
    recommended: 'Recommended',
    searchAnonMobile: 'Search anonymously',
    zipOnly: 'Just your ZIP code — nothing stored',
    chips: ['Nearby clinics', 'Hours & phone', 'Sliding-scale info'],
    createAccountMobile: 'Create an account',
    soon: 'Soon',
    saveClinics: 'Save clinics & get cost estimates',
    accountsSoon: 'Accounts coming soon',
    trustLine: 'Free · Confidential · No login required',
  },
  es: {
    title: '¿Cómo te gustaría buscar?',
    subtitle: 'Puedes empezar de inmediato con o sin cuenta. Elige lo que mejor te funcione.',
    closeModal: 'Cerrar ventana',
    searchAnon: 'Buscar de Forma Anónima',
    anonDesc: 'Encuentra clínicas y farmacias al instante solo con tu código postal. Sin cuenta, sin registro, sin guardar información.',
    whatYoullSee: 'Lo que verás:',
    anonFeatures: ['Clínicas y farmacias cercanas', 'Horarios, ubicación y teléfono', 'Información general de escala móvil'],
    limitedTo: 'Limitado a:',
    limitedDesc: 'Sin descuento estimado, sin historial de búsquedas guardado, filtros limitados.',
    createAccount: 'Crear Cuenta',
    accountDesc: 'Crea una cuenta gratuita para desbloquear funciones personalizadas y guardar tus búsquedas.',
    accountBenefitsLabel: 'Beneficios de la cuenta:',
    accountFeatures: ['Guarda tus clínicas favoritas', 'Obtén estimados de costo personalizados', 'Ve redes de farmacias por contrato', 'Recibe recomendaciones personalizadas'],
    secureTitle: 'Tu información está segura',
    secureDesc: 'Cifrada y nunca vendida. Se usa solo para personalizar tu experiencia.',
    close: 'Cerrar',
    startRightAway: 'Empieza de inmediato — no se necesita cuenta.',
    recommended: 'Recomendado',
    searchAnonMobile: 'Buscar de forma anónima',
    zipOnly: 'Solo tu código postal — nada se guarda',
    chips: ['Clínicas cercanas', 'Horarios y teléfono', 'Info de escala móvil'],
    createAccountMobile: 'Crear una cuenta',
    soon: 'Pronto',
    saveClinics: 'Guarda clínicas y obtén estimados',
    accountsSoon: 'Cuentas próximamente',
    trustLine: 'Gratis · Confidencial · Sin registro',
  },
};

const sectionLabel = {
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--mb-primary)',
  marginBottom: '14px',
};

function FeatureList({ label, items }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={sectionLabel}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
        {items.map((item) => (
          <div key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Check size={16} color="var(--mb-primary)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--mb-text-secondary)' }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconBox({ children }) {
  return (
    <div
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '14px',
        background: 'var(--mb-bg-sage)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

const SearchOptionsModal = () => {
  const { isOpen, closeModal } = useSearchModal();
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const { lang } = useLang();
  const t = CONTENT[lang];

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  function handleAnonymousClick() {
    closeModal();
    navigate('/search');
  }

  return (
    <div
      role="presentation"
      onClick={closeModal}
      className="search-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background: 'rgba(37, 48, 46, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="search-modal search-modal-panel search-modal-desktop"
        style={{
          position: 'relative',
          background: '#fff',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(15,110,86,0.15)',
          maxWidth: '920px',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'var(--mb-bg-sage)',
            borderBottom: '1px solid #D1E8E2',
            padding: '32px 40px',
            position: 'relative',
          }}
        >
          <h2
            id="search-modal-title"
            style={{ fontSize: '28px', fontWeight: 600, margin: '0 0 8px', color: 'var(--mb-text-primary)' }}
          >
            {t.title}
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--mb-text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '520px' }}>
            {t.subtitle}
          </p>
          <button
            type="button"
            onClick={closeModal}
            aria-label={t.closeModal}
            className="search-modal-close"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              color: 'var(--mb-text-secondary)',
              cursor: 'pointer',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Two-column content */}
        <div className="search-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '480px' }}>
          {/* Anonymous */}
          <div
            style={{
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--mb-border-soft)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <IconBox>
                <Search size={24} color="var(--mb-primary)" strokeWidth={2} />
              </IconBox>
              <h3 style={{ fontSize: '22px', fontWeight: 600, margin: 0, color: 'var(--mb-text-primary)' }}>
                {t.searchAnon}
              </h3>
            </div>

            <p style={{ fontSize: '15.5px', lineHeight: 1.62, color: 'var(--mb-text-secondary)', margin: '0 0 26px' }}>
              {t.anonDesc}
            </p>

            <FeatureList
              label={t.whatYoullSee}
              items={t.anonFeatures}
            />

            <div
              style={{
                background: 'var(--mb-bg-primary)',
                border: '1px solid var(--mb-border)',
                borderRadius: '13px',
                padding: '14px 16px',
                marginBottom: '32px',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--mb-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                {t.limitedTo}
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--mb-text-secondary)' }}>
                {t.limitedDesc}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAnonymousClick}
              className="search-modal-cta"
              style={{
                marginTop: 'auto',
                width: '100%',
                height: '50px',
                border: 'none',
                borderRadius: '13px',
                background: 'var(--mb-primary)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {t.searchAnon} <ArrowRight size={18} />
            </button>
          </div>

          {/* Create Account */}
          <div
            style={{
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, rgba(15,110,86,0.02) 0%, rgba(31,158,117,0.02) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <IconBox>
                <User size={24} color="var(--mb-primary)" strokeWidth={2} />
              </IconBox>
              <h3 style={{ fontSize: '22px', fontWeight: 600, margin: 0, color: 'var(--mb-text-primary)' }}>
                {t.createAccount}
              </h3>
            </div>

            <p style={{ fontSize: '15.5px', lineHeight: 1.62, color: 'var(--mb-text-secondary)', margin: '0 0 26px' }}>
              {t.accountDesc}
            </p>

            <FeatureList
              label={t.accountBenefitsLabel}
              items={t.accountFeatures}
            />

            <div
              style={{
                background: '#fff',
                border: '1.5px solid var(--mb-primary)',
                borderRadius: '13px',
                padding: '14px 16px',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--mb-primary)',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                <Lock size={14} strokeWidth={2.5} />
                {t.secureTitle}
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--mb-primary)' }}>
                {t.secureDesc}
              </div>
            </div>

            <button
              type="button"
              disabled
              title="Coming soon"
              style={{
                marginTop: 'auto',
                width: '100%',
                height: '50px',
                border: 'none',
                borderRadius: '13px',
                background: 'var(--mb-primary)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '16px',
                cursor: 'not-allowed',
                opacity: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {t.createAccount} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== Mobile bottom sheet ===== */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="search-modal-sheet"
      >
        <div className="search-sheet-grab" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '6px' }}>
          <h2 id="search-sheet-title" style={{ fontSize: '21px', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.2, margin: 0, color: 'var(--mb-text-primary)' }}>
            {t.title}
          </h2>
          <button
            type="button"
            onClick={closeModal}
            aria-label={t.close}
            className="search-sheet-close"
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F1ECE0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mb-text-secondary)', flexShrink: 0, cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--mb-text-secondary)', lineHeight: 1.45, margin: '0 0 20px' }}>
          {t.startRightAway}
        </p>

        {/* Primary: anonymous */}
        <div style={{ position: 'relative', border: '1.5px solid var(--mb-primary)', background: '#F3FAF7', borderRadius: '18px', padding: '18px 18px 20px' }}>
          <span style={{ position: 'absolute', top: '-11px', left: '18px', background: 'var(--mb-honey)', color: '#3a2403', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '999px' }}>
            {t.recommended}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'var(--mb-bg-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Search size={22} color="var(--mb-primary)" strokeWidth={2} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, lineHeight: 1.15, margin: 0, color: 'var(--mb-text-primary)' }}>{t.searchAnonMobile}</h3>
              <div style={{ fontSize: '13px', color: 'var(--mb-text-secondary)', marginTop: '2px' }}>{t.zipOnly}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '16px' }}>
            {t.chips.map((chip) => (
              <span key={chip} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--mb-primary)', background: 'var(--mb-bg-sage)', padding: '5px 10px', borderRadius: '999px' }}>
                <Check size={12} strokeWidth={3} /> {chip}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAnonymousClick}
            className="search-sheet-cta"
            style={{ width: '100%', height: '52px', border: 'none', borderRadius: '14px', background: 'var(--mb-primary)', color: '#fff', fontWeight: 600, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {t.searchAnonMobile} <ArrowRight size={18} />
          </button>
        </div>

        {/* Secondary: create account (coming soon) */}
        <div style={{ marginTop: '14px', border: '1px solid var(--mb-border)', background: 'var(--mb-bg-primary)', borderRadius: '18px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#EFEAE0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={20} color="var(--mb-text-muted)" strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#3B4642', margin: 0 }}>{t.createAccountMobile}</h3>
                <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--mb-text-muted)', background: '#EFEAE0', padding: '3px 9px', borderRadius: '999px' }}>{t.soon}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--mb-text-muted)', marginTop: '2px' }}>{t.saveClinics}</div>
            </div>
          </div>
          <button
            type="button"
            disabled
            style={{ width: '100%', height: '48px', border: '1.5px solid #CBD3CE', borderRadius: '14px', background: 'transparent', color: 'var(--mb-text-secondary)', fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'not-allowed' }}
          >
            {t.accountsSoon}
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: '12.5px', color: 'var(--mb-text-muted)', marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Lock size={13} /> {t.trustLine}
        </div>
      </div>

      <style>{`
        .search-modal-close:hover {
          color: var(--mb-primary);
        }
        .search-modal-cta:hover {
          background: var(--mb-primary-hover);
        }
        .search-sheet-cta:hover { background: var(--mb-primary-hover); }
        .search-sheet-close:hover { color: var(--mb-primary); }

        /* Bottom sheet is mobile-only */
        .search-modal-sheet { display: none; }

        @media (max-width: 720px) {
          .search-modal-overlay {
            align-items: flex-end !important;
            justify-content: stretch !important;
            padding: 0 !important;
          }
          .search-modal-desktop { display: none !important; }
          .search-modal-sheet {
            display: block;
            width: 100%;
            background: #fff;
            border-radius: 26px 26px 0 0;
            box-shadow: 0 -12px 40px rgba(0,0,0,.2);
            padding: 10px 20px calc(20px + env(safe-area-inset-bottom));
            animation: sheet-up 0.26s ease-out;
          }
          .search-sheet-grab {
            width: 40px; height: 5px; border-radius: 999px;
            background: #D8D2C4; margin: 4px auto 16px;
          }
        }

        @keyframes sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SearchOptionsModal;
