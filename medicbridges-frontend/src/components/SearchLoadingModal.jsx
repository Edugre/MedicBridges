import React, { useEffect, useState } from 'react';
import { MapPin, Search, ListChecks, X } from 'lucide-react';

const STEPS = [
  { icon: MapPin, label: 'Locating you' },
  { icon: Search, label: 'Searching clinics' },
  { icon: ListChecks, label: 'Ranking results' },
];

const STATUS_TEXT = [
  'Pinpointing your area',
  'Scanning nearby clinics',
  'Sorting your best matches',
  'All set — showing results',
];

const TIPS = [
  'Community health centers often set fees on a sliding scale — you pay based on your income, not your insurance.',
  '340B pharmacies can cut prescription prices dramatically. We flag every one we find.',
  "Federally Qualified Health Centers can't turn you away if you're unable to pay.",
  'No account, ever. Your ZIP is used only to search — it’s never stored.',
];

const FILL_WIDTH = ['0px', 'calc(50% - 70px)', 'calc(100% - 140px)', 'calc(100% - 140px)'];

const nodeState = (index, activeStep) => {
  if (index < activeStep) return 'done';
  if (index === activeStep) return 'active';
  return 'pending';
};

const NODE_BG = { pending: '#EAF4EF', active: 'var(--mb-primary)', done: 'var(--mb-primary)' };
const NODE_BORDER = { pending: '#D1E8E2', active: 'var(--mb-primary)', done: 'var(--mb-primary)' };
const NODE_ICON = { pending: '#9AA8A2', active: '#fff', done: '#fff' };
const LABEL_COLOR = { pending: '#A6A7A0', active: 'var(--mb-primary)', done: 'var(--mb-text-primary)' };

const SearchLoadingModal = ({ open, onCancel }) => {
  const [step, setStep] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  // Advance the phase steps on a short timed sequence while open.
  useEffect(() => {
    if (!open) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 900);
    const t2 = setTimeout(() => setStep(2), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open]);

  // Rotate the "Good to know" tip.
  useEffect(() => {
    if (!open) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTipIndex(0);
    const id = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 3900);
    return () => clearInterval(id);
  }, [open]);

  // Body scroll lock + Esc to cancel the in-flight search.
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onCancel) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="search-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(37, 48, 46, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-loading-title"
        aria-live="polite"
        className="search-modal-panel"
        style={{
          position: 'relative',
          width: '520px',
          maxWidth: '100%',
          background: '#fff',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(15,110,86,0.28)',
          overflow: 'hidden',
        }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel search"
            className="slm-close"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              color: 'var(--mb-text-muted)',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        )}

        {/* Header */}
        <div style={{ padding: '30px 34px 6px', textAlign: 'center' }}>
          <h2
            id="search-loading-title"
            style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0, color: 'var(--mb-text-primary)' }}
          >
            Finding care near you
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--mb-text-secondary)', margin: '8px 0 0' }}>
            Hang tight — this usually takes a few seconds.
          </p>
        </div>

        {/* Horizontal step bar */}
        <div style={{ padding: '28px 40px 4px', display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {/* Track line */}
          <div style={{ position: 'absolute', left: '70px', right: '70px', top: '48px', height: '2px', borderRadius: '2px', background: '#E6E1D6' }} />
          {/* Fill line */}
          <div
            style={{
              position: 'absolute',
              left: '70px',
              top: '48px',
              height: '2px',
              borderRadius: '2px',
              background: 'var(--mb-primary)',
              width: FILL_WIDTH[step],
              transition: 'width 0.5s ease',
            }}
          />
          {STEPS.map((s, i) => {
            const state = nodeState(i, step);
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                style={{ width: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', zIndex: 1 }}
              >
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '13px',
                      border: '1.5px solid',
                      background: NODE_BG[state],
                      borderColor: NODE_BORDER[state],
                      color: NODE_ICON[state],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.3s ease, border-color 0.3s ease, color 0.3s ease',
                    }}
                  >
                    <Icon size={18} strokeWidth={2.2} />
                  </div>
                  {state === 'active' && (
                    <span
                      className="slm-pulse"
                      style={{
                        position: 'absolute',
                        inset: '-5px',
                        borderRadius: '16px',
                        border: '2px solid var(--mb-primary)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textAlign: 'center',
                    lineHeight: 1.25,
                    color: LABEL_COLOR[state],
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Status line */}
        <div style={{ padding: '6px 34px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px' }}>
          <span className="slm-spinner" />
          <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mb-primary)' }}>{STATUS_TEXT[step]}</span>
        </div>

        {/* Tip card + reassurance footer */}
        <div style={{ padding: '22px 34px 30px' }}>
          <div style={{ background: 'var(--mb-honey-soft)', border: '1px solid #F2E0C2', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B87814' }}>
              Good to know
            </div>
            <p style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--mb-honey-soft-ink)', margin: '6px 0 0' }}>
              {TIPS[tipIndex]}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px 10px',
              marginTop: '18px',
              fontSize: '11.5px',
              color: 'var(--mb-text-muted)',
            }}
          >
            <span>Free for patients</span>
            <span style={{ color: '#D1E8E2' }}>•</span>
            <span>No account needed</span>
            <span style={{ color: '#D1E8E2' }}>•</span>
            <span>Your info is never stored</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slmSpin { to { transform: rotate(360deg); } }
        @keyframes slmStepPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .slm-spinner {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid #E1F5EE;
          border-top-color: var(--mb-primary);
          border-right-color: var(--mb-primary);
          animation: slmSpin 0.9s linear infinite;
          flex-shrink: 0;
        }
        .slm-pulse {
          animation: slmStepPulse 1.6s ease-out infinite;
        }
        .slm-close:hover {
          color: var(--mb-primary);
          background: var(--mb-bg-sage);
        }
        @media (prefers-reduced-motion: reduce) {
          .slm-spinner,
          .slm-pulse {
            animation: none;
          }
          .slm-pulse { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SearchLoadingModal;
