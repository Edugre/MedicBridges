import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Lock, Search, User, X } from 'lucide-react';
import { useSearchModal } from '../context/SearchModalContext';

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
        className="search-modal search-modal-panel"
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
            How would you like to search?
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--mb-text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '520px' }}>
            You can start right away with or without an account. Choose what works best for you.
          </p>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close modal"
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
                Search Anonymously
              </h3>
            </div>

            <p style={{ fontSize: '15.5px', lineHeight: 1.62, color: 'var(--mb-text-secondary)', margin: '0 0 26px' }}>
              Find clinics and pharmacies instantly with just your ZIP code. No account, no login, no information stored.
            </p>

            <FeatureList
              label="What you'll see:"
              items={[
                'Nearby clinics and pharmacies',
                'Hours, location, and phone',
                'General sliding-scale info',
              ]}
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
                Limited to:
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--mb-text-secondary)' }}>
                No estimated discount, no saved search history, limited filters.
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
              Search Anonymously <ArrowRight size={18} />
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
                Create Account
              </h3>
            </div>

            <p style={{ fontSize: '15.5px', lineHeight: 1.62, color: 'var(--mb-text-secondary)', margin: '0 0 26px' }}>
              Create a free account to unlock personalized features and save your searches.
            </p>

            <FeatureList
              label="Account benefits:"
              items={[
                'Save your favorite clinics',
                'Get personalized cost estimates',
                'See contract pharmacy networks',
                'Get personalized recommendations',
              ]}
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
                Your information is secure
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--mb-primary)' }}>
                Encrypted and never sold. Used only to personalize your experience.
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
              Create Account <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .search-modal-close:hover {
          color: var(--mb-primary);
        }
        .search-modal-cta:hover {
          background: var(--mb-primary-hover);
        }
        @media (max-width: 720px) {
          .search-modal-grid {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
          }
          .search-modal-grid > div:first-child {
            border-right: none !important;
            border-bottom: 1px solid var(--mb-border-soft);
          }
        }
      `}</style>
    </div>
  );
};

export default SearchOptionsModal;
