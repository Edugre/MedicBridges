import React, { useState } from 'react';
import { ChevronDown, Check, UserX, ShieldCheck, EyeOff } from 'lucide-react';
import heroImage from '../../assets/hero-clinic.png';
import { useSearchModal } from '../../context/SearchModalContext';

const label = {
  fontSize: '16px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: 'var(--mb-primary)',
};

const STEPS = [
  {
    n: '01',
    color: 'var(--mb-primary)',
    title: 'Tell us a little about you',
    body: "Your ZIP, household size, and the care you need. An estimate of your income is all it takes — no proof required.",
  },
  {
    n: '02',
    color: 'var(--mb-primary)',
    title: 'See your matches instantly',
    body: 'We rank nearby clinics and pharmacies by what you likely qualify for, with clear costs and hours on every result.',
  },
  {
    n: '03',
    color: 'var(--mb-honey)',
    title: 'Get care for less',
    body: "Call, get directions, and ask for the sliding-scale program at check-in. We'll show you exactly what to say.",
  },
];

const ELIGIBILITY = [
  {
    title: 'No proof of income needed to start',
    body: 'Begin care first; most clinics sort out paperwork later.',
  },
  {
    title: 'No insurance required',
    body: 'Uninsured patients are welcome at every clinic we list.',
  },
  {
    title: 'Everyone is served',
    body: 'Community health centers care for you regardless of immigration status.',
  },
];

const PRIVACY = [
  {
    icon: <UserX size={22} color="var(--mb-primary)" strokeWidth={2} />,
    title: 'No account, no login',
    body: 'Use the whole tool without signing up or giving us your name.',
  },
  {
    icon: <ShieldCheck size={22} color="var(--mb-primary)" strokeWidth={2} />,
    title: 'We never sell your data',
    body: 'No ads, no data brokers. Your income is used only to match programs.',
  },
  {
    icon: <EyeOff size={22} color="var(--mb-primary)" strokeWidth={2} />,
    title: 'Nothing is shared',
    body: "Your answers aren't sent to clinics or anyone else without your say-so.",
  },
];

const FAQS = [
  {
    q: 'Is this really free?',
    a: "Yes. MedicBridges is completely free to use. We don't run ads and we don't sell your information — this is a public-good tool, not a business that profits from your visit.",
  },
  {
    q: 'Do I need insurance?',
    a: 'No. Many of the clinics and pharmacies we list serve people with no insurance at all, and charge based on what you can afford.',
  },
  {
    q: 'Will I have to prove my income?',
    a: 'Not to begin. Most clinics let you start care and complete any sliding-scale paperwork afterward. We only ask for an estimate so we can show what you likely qualify for.',
  },
  {
    q: "What if I'm undocumented?",
    a: 'Community health centers care for everyone, regardless of immigration status. MedicBridges never asks about it, and your answers are never shared.',
  },
];

const Home = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const { openModal } = useSearchModal();
  const toggle = (i) => setOpenIndex((cur) => (cur === i ? -1 : i));

  return (
    <div className="landing-fade-in">

      {/* ============ HERO ============ */}
      <section id="hero" style={{ maxWidth: '1200px', margin: '0 auto', padding: '104px 32px 72px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '26px', ...label }}>
          Care that's within reach
        </div>
        <h1 className="hero-h1" style={{ fontSize: '72px', fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 24px', textWrap: 'balance' }}>
          Find low-cost care and affordable medicine, close to home.
        </h1>
        <p style={{ fontSize: '24px', lineHeight: 1.6, color: 'var(--mb-text-secondary)', margin: '0 auto 36px', maxWidth: '800px', textWrap: 'pretty' }}>
          Answer a few simple questions and we'll match you to clinics and pharmacies you may qualify for. Most people finish in about two minutes.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
          <button
            type="button"
            onClick={openModal}
            className="mb-btn mb-btn-lime"
            style={{ height: '58px', padding: '0 34px', borderRadius: '13px', fontSize: '17.5px' }}
          >
            Find care near me <span style={{ fontSize: '19px' }}>→</span>
          </button>
          <div style={{ fontSize: '14.5px', color: 'var(--mb-text-muted)', letterSpacing: '0.01em' }}>
            Free &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; No login required
          </div>
        </div>
      </section>

      {/* ============ IMAGE BAND ============ */}
      <section style={{ maxWidth: '1600px', margin: '0 auto 8px', padding: '0 32px' }}>
        <div style={{ height: '430px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--mb-border)' }}>
          <img
            src={heroImage}
            alt="A community health worker talking with a patient at a community health center"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
          />
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" style={{ maxWidth: '1600px', margin: '0 auto', padding: '104px 32px 96px' }}>
        <div style={{ maxWidth: '800px', margin: '0 0 64px' }}>
          <div style={{ ...label, marginBottom: '16px' }}>How it works</div>
          <h2 style={{ fontSize: '48px', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.08, margin: 0, textWrap: 'balance' }}>
            Three simple steps to care you can afford.
          </h2>
        </div>
        <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px' }}>
          {STEPS.map((step) => (
            <div key={step.n} style={{ borderTop: `2px solid ${step.color}`, paddingTop: '24px' }}>
              <div style={{ fontSize: '54px', fontWeight: 600, color: step.color, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '18px' }}>
                {step.n}
              </div>
              <h3 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 11px' }}>{step.title}</h3>
              <p style={{ fontSize: '18px', lineHeight: 1.62, color: 'var(--mb-text-secondary)', margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ COST & ELIGIBILITY ============ */}
      <section id="cost" style={{ background: 'var(--mb-true-lime-soft)' }}>
        <div className="cost-grid" style={{ maxWidth: '1600px', margin: '0 auto', padding: '96px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '72px', alignItems: 'center' }}>
          <div>
            <div style={{ ...label, marginBottom: '16px' }}>Cost &amp; eligibility</div>
            <h2 style={{ fontSize: '48px', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 20px', lineHeight: 1.1, textWrap: 'balance' }}>
              You probably qualify — and you won't pay full price.
            </h2>
            <p style={{ fontSize: '20px', lineHeight: 1.62, color: '#41504A', margin: '0 0 32px', maxWidth: '480px' }}>
              Sliding-scale clinics set your fee based on what you earn and how many people you support. Many visits cost very little, and some are free.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {ELIGIBILITY.map((item) => (
                <div key={item.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--mb-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    <Check size={14} />
                  </span>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{item.title}</div>
                    <div style={{ fontSize: '17px', color: 'var(--mb-text-secondary)', lineHeight: 1.5, marginTop: '2px' }}>{item.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estimate card */}
          <div style={{ background: 'var(--mb-bg-surface)', border: '1px solid var(--mb-border)', borderRadius: '22px', padding: '32px', boxShadow: 'var(--mb-shadow-lg)' }}>
            <div style={{ fontSize: '15px', color: 'var(--mb-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
              Estimate · household of 3
            </div>
            <div style={{ fontSize: '17px', color: 'var(--mb-text-secondary)', marginBottom: '26px' }}>A primary-care visit on a sliding scale</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: '112px', background: '#F4F1EA', border: '1px solid var(--mb-border-soft)', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '32px', fontWeight: 600, color: 'var(--mb-text-disabled)', textDecoration: 'line-through' }}>$180</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '13.5px', color: 'var(--mb-text-muted)', marginTop: '11px' }}>Full price</div>
              </div>
              <div style={{ fontSize: '22px', color: '#C9C2B2', paddingBottom: '42px' }}>→</div>
              <div style={{ flex: 1 }}>
                <div style={{ height: '112px', background: 'var(--mb-true-lime)', border: '1.5px solid var(--mb-primary)', borderRadius: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 600, color: 'var(--mb-primary)', letterSpacing: '-0.02em' }}>$25</span>
                  <span style={{ fontSize: '11px', color: 'var(--mb-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Lowest tier</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '13.5px', color: 'var(--mb-primary)', fontWeight: 600, marginTop: '11px' }}>What you'd likely pay</div>
              </div>
            </div>
            <div style={{ background: 'var(--mb-honey-soft)', borderRadius: '13px', padding: '14px 16px', marginTop: '22px', fontSize: '13.5px', lineHeight: 1.55, color: 'var(--mb-honey-soft-ink)' }}>
              Your actual fee depends on income and household size. We'll show your likely tier before you ever call.
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRIVACY ============ */}
      <section id="privacy" style={{ maxWidth: '1600px', margin: '0 auto', padding: '104px 32px 96px' }}>
        <div style={{ maxWidth: '800px', margin: '0 0 60px' }}>
          <div style={{ ...label, marginBottom: '16px' }}>Private by design</div>
          <h2 style={{ fontSize: '48px', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.08, margin: '0 0 14px', textWrap: 'balance' }}>
            Your information stays yours.
          </h2>
          <p style={{ fontSize: '20px', lineHeight: 1.6, color: 'var(--mb-text-secondary)', margin: 0 }}>
            Look for help without worrying about who's watching.
          </p>
        </div>
        <div className="privacy-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '44px' }}>
          {PRIVACY.map((item) => (
            <div key={item.title} style={{ borderTop: '1px solid var(--mb-border-soft)', paddingTop: '26px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'var(--mb-true-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                {item.icon}
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 600, margin: '0 0 9px' }}>{item.title}</h3>
              <p style={{ fontSize: '18px', lineHeight: 1.6, color: 'var(--mb-text-secondary)', margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px 96px' }}>
        <div style={{ margin: '0 0 40px' }}>
          <div style={{ ...label, marginBottom: '16px' }}>Real questions, real answers</div>
          <h2 style={{ fontSize: '48px', fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>The things people actually ask.</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQS.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.q} style={{ background: 'var(--mb-bg-surface)', border: '1px solid var(--mb-border)', borderRadius: '16px', overflow: 'hidden' }}>
                <button
                  onClick={() => toggle(i)}
                  aria-expanded={open}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    width: '100%',
                    padding: '22px 24px',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    color: 'var(--mb-text-primary)',
                  }}
                >
                  <span style={{ fontSize: '22px', fontWeight: 600 }}>{item.q}</span>
                  <ChevronDown
                    size={22}
                    color="var(--mb-primary)"
                    style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  />
                </button>
                {open && (
                  <p style={{ fontSize: '18px', lineHeight: 1.62, color: 'var(--mb-text-secondary)', margin: 0, padding: '0 24px 24px' }}>
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 32px 96px' }}>
        <div
          className="cta-block"
          style={{ background: 'var(--mb-primary)', borderRadius: '28px', padding: '60px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px', alignItems: 'center', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: '-40px', right: '-30px', width: '180px', height: '180px', borderRadius: '50%', background: 'var(--mb-secondary)', opacity: 0.35 }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: '44px', fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: '0 0 14px', lineHeight: 1.12, textWrap: 'balance' }}>
              Ready when you are. It takes about two minutes.
            </h2>
            <p style={{ fontSize: '20px', lineHeight: 1.55, color: '#C2E4D9', margin: 0 }}>
              No login, no insurance, no pressure. Find the care and medicine you can afford.
            </p>
          </div>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
            <button
              type="button"
              onClick={openModal}
              className="mb-btn mb-btn-lime"
              style={{ height: '58px', padding: '0 30px', borderRadius: '13px', fontSize: '17px' }}
            >
              Find care near me <span style={{ fontSize: '19px' }}>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 980px) {
          .cost-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .cta-block { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 760px) {
          .hero-h1 { font-size: 40px !important; }
          .how-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .privacy-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 640px) {
          .cta-block { padding: 36px 28px !important; }
        }
      `}</style>

    </div>
  );
};

export default Home;
