import { useState } from 'react';
import { ChevronDown, Check, UserX, ShieldCheck, EyeOff } from 'lucide-react';
import heroImage from '../../assets/hero-clinic.png';
import { useSearchModal } from '../../context/SearchModalContext';
import { useLang } from '../../context/LangContext';

const label = {
  fontSize: '16px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: 'var(--mb-primary)',
};

const CONTENT = {
  en: {
    eyebrow: "Care that's within reach",
    heroTitle: 'Find low-cost care and affordable medicine, close to home.',
    heroSub: "Answer a few simple questions and we'll match you to clinics and pharmacies you may qualify for. Most people finish in about two minutes.",
    heroCta: 'Find care near me',
    heroBadge: 'Free · Confidential · No login required',
    howLabel: 'How it works',
    howTitle: 'Three simple steps to care you can afford.',
    steps: [
      { n: '01', color: 'var(--mb-primary)', title: 'Tell us a little about you', body: "Your ZIP, household size, and the care you need. An estimate of your income is all it takes — no proof required." },
      { n: '02', color: 'var(--mb-primary)', title: 'See your matches instantly', body: 'We rank nearby clinics and pharmacies by what you likely qualify for, with clear costs and hours on every result.' },
      { n: '03', color: 'var(--mb-honey)', title: 'Get care for less', body: "Call, get directions, and ask for the sliding-scale program at check-in. We'll show you exactly what to say." },
    ],
    costLabel: 'Cost & eligibility',
    costTitle: "You probably qualify — and you won't pay full price.",
    costSub: "Sliding-scale clinics set your fee based on what you earn and how many people you support. Many visits cost very little, and some are free.",
    eligibility: [
      { title: 'No proof of income needed to start', body: 'Begin care first; most clinics sort out paperwork later.' },
      { title: 'No insurance required', body: 'Uninsured patients are welcome at every clinic we list.' },
      { title: 'Everyone is served', body: 'Community health centers care for you regardless of immigration status.' },
    ],
    estimateLabel: 'Estimate · household of 3',
    estimateSub: 'A primary-care visit on a sliding scale',
    fullPrice: 'Full price',
    likelyPay: "What you'd likely pay",
    estimateNote: "Your actual fee depends on income and household size. We'll show your likely tier before you ever call.",
    privacyLabel: 'Private by design',
    privacyTitle: 'Your information stays yours.',
    privacySub: "Look for help without worrying about who's watching.",
    privacy: [
      { title: 'No account, no login', body: 'Use the whole tool without signing up or giving us your name.' },
      { title: 'We never sell your data', body: 'No ads, no data brokers. Your income is used only to match programs.' },
      { title: 'Nothing is shared', body: "Your answers aren't sent to clinics or anyone else without your say-so." },
    ],
    faqLabel: 'Real questions, real answers',
    faqTitle: 'The things people actually ask.',
    faqs: [
      { q: 'Is this really free?', a: "Yes. MedicBridges is completely free to use. We don't run ads and we don't sell your information — this is a public-good tool, not a business that profits from your visit." },
      { q: 'Do I need insurance?', a: 'No. Many of the clinics and pharmacies we list serve people with no insurance at all, and charge based on what you can afford.' },
      { q: 'Will I have to prove my income?', a: 'Not to begin. Most clinics let you start care and complete any sliding-scale paperwork afterward. We only ask for an estimate so we can show what you likely qualify for.' },
      { q: "What if I'm undocumented?", a: 'Community health centers care for everyone, regardless of immigration status. MedicBridges never asks about it, and your answers are never shared.' },
    ],
    ctaTitle: 'Ready when you are. It takes about two minutes.',
    ctaSub: 'No login, no insurance, no pressure. Find the care and medicine you can afford.',
  },
  es: {
    eyebrow: 'Atención médica a tu alcance',
    heroTitle: 'Encuentra atención médica de bajo costo y medicamentos accesibles, cerca de ti.',
    heroSub: 'Responde unas preguntas sencillas y te conectaremos con clínicas y farmacias para las que puedes calificar. La mayoría termina en unos dos minutos.',
    heroCta: 'Encuentra atención cerca de mí',
    heroBadge: 'Gratis · Confidencial · Sin registro requerido',
    howLabel: 'Cómo funciona',
    howTitle: 'Tres pasos simples para recibir atención que puedes pagar.',
    steps: [
      { n: '01', color: 'var(--mb-primary)', title: 'Cuéntanos un poco sobre ti', body: "Tu código postal, el tamaño de tu hogar y el cuidado que necesitas. Solo necesitamos un estimado de tus ingresos — sin comprobantes." },
      { n: '02', color: 'var(--mb-primary)', title: 'Ve tus opciones al instante', body: 'Clasificamos las clínicas y farmacias cercanas según lo que probablemente califiques, con costos y horarios claros en cada resultado.' },
      { n: '03', color: 'var(--mb-honey)', title: 'Recibe atención por menos', body: "Llama, obtén indicaciones y pide el programa de escala móvil al registrarte. Te mostraremos exactamente qué decir." },
    ],
    costLabel: 'Costo y elegibilidad',
    costTitle: 'Probablemente calificas — y no pagarás el precio completo.',
    costSub: 'Las clínicas con escala móvil fijan tu tarifa según lo que ganas y cuántas personas dependes de ti. Muchas visitas cuestan muy poco, y algunas son gratuitas.',
    eligibility: [
      { title: 'No necesitas comprobante de ingresos para empezar', body: 'Comienza la atención primero; la mayoría de las clínicas resuelve el papeleo después.' },
      { title: 'No se requiere seguro médico', body: 'Los pacientes sin seguro son bienvenidos en todas las clínicas que listamos.' },
      { title: 'Se atiende a todos', body: 'Los centros de salud comunitaria te atienden sin importar tu estatus migratorio.' },
    ],
    estimateLabel: 'Estimado · hogar de 3 personas',
    estimateSub: 'Una visita de atención primaria con escala móvil',
    fullPrice: 'Precio completo',
    likelyPay: 'Lo que probablemente pagarías',
    estimateNote: 'Tu tarifa real depende de tus ingresos y el tamaño de tu hogar. Te mostraremos tu nivel probable antes de que llames.',
    privacyLabel: 'Privacidad por diseño',
    privacyTitle: 'Tu información es tuya.',
    privacySub: 'Busca ayuda sin preocuparte por quién te observa.',
    privacy: [
      { title: 'Sin cuenta ni registro', body: 'Usa la herramienta completa sin registrarte ni darnos tu nombre.' },
      { title: 'Nunca vendemos tus datos', body: 'Sin anuncios ni corredores de datos. Tus ingresos solo se usan para encontrar programas.' },
      { title: 'Nada se comparte', body: 'Tus respuestas no se envían a clínicas ni a nadie más sin tu autorización.' },
    ],
    faqLabel: 'Preguntas reales, respuestas reales',
    faqTitle: 'Lo que la gente realmente pregunta.',
    faqs: [
      { q: '¿Es realmente gratis?', a: 'Sí. MedicBridges es completamente gratuito. No publicamos anuncios ni vendemos tu información — es una herramienta de bien público, no un negocio.' },
      { q: '¿Necesito seguro médico?', a: 'No. Muchas de las clínicas y farmacias que listamos atienden a personas sin seguro y cobran según lo que puedes pagar.' },
      { q: '¿Tendré que comprobar mis ingresos?', a: 'No para comenzar. La mayoría de las clínicas te permite iniciar la atención y completar el papeleo de escala móvil después. Solo pedimos un estimado para mostrarte lo que probablemente calificas.' },
      { q: '¿Qué pasa si soy indocumentado?', a: 'Los centros de salud comunitaria atienden a todos sin importar el estatus migratorio. MedicBridges nunca pregunta al respecto, y tus respuestas nunca se comparten.' },
    ],
    ctaTitle: 'Listo cuando tú lo estés. Solo toma unos dos minutos.',
    ctaSub: 'Sin registro, sin seguro, sin presión. Encuentra la atención médica y los medicamentos que puedes costear.',
  },
};

const PRIVACY_ICONS = [
  <UserX size={22} color="var(--mb-primary)" strokeWidth={2} />,
  <ShieldCheck size={22} color="var(--mb-primary)" strokeWidth={2} />,
  <EyeOff size={22} color="var(--mb-primary)" strokeWidth={2} />,
];

const Home = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const { openModal } = useSearchModal();
  const { lang } = useLang();
  const t = CONTENT[lang];
  const toggle = (i) => setOpenIndex((cur) => (cur === i ? -1 : i));

  return (
    <div className="landing-fade-in">

      {/* ============ HERO ============ */}
      <section id="hero" className="lp-hero" style={{ maxWidth: '1200px', margin: '0 auto', padding: '104px 32px 72px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '26px', ...label }}>
          {t.eyebrow}
        </div>
        <h1 className="hero-h1" style={{ fontSize: '72px', fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 24px', textWrap: 'balance' }}>
          {t.heroTitle}
        </h1>
        <p className="lp-hero-sub" style={{ fontSize: '24px', lineHeight: 1.6, color: 'var(--mb-text-secondary)', margin: '0 auto 36px', maxWidth: '800px', textWrap: 'pretty' }}>
          {t.heroSub}
        </p>
        <div className="lp-hero-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
          <button
            type="button"
            onClick={openModal}
            className="mb-btn mb-btn-lime lp-hero-cta"
            style={{ height: '58px', padding: '0 34px', borderRadius: '13px', fontSize: '17.5px' }}
          >
            {t.heroCta} <span style={{ fontSize: '19px' }}>→</span>
          </button>
          <div className="lp-hero-badge" style={{ fontSize: '14.5px', color: 'var(--mb-text-muted)', letterSpacing: '0.01em' }}>
            {t.heroBadge}
          </div>
        </div>
      </section>

      {/* ============ IMAGE BAND ============ */}
      <section className="lp-imgband" style={{ maxWidth: '1600px', margin: '0 auto 8px', padding: '0 32px' }}>
        <div className="lp-imgband-box" style={{ height: '430px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--mb-border)' }}>
          <img
            src={heroImage}
            alt="A community health worker talking with a patient at a community health center"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
          />
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="lp-how" style={{ maxWidth: '1600px', margin: '0 auto', padding: '104px 32px 96px' }}>
        <div className="lp-how-head" style={{ maxWidth: '800px', margin: '0 0 64px' }}>
          <div style={{ ...label, marginBottom: '16px' }}>{t.howLabel}</div>
          <h2 className="lp-h2" style={{ fontSize: '48px', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.08, margin: 0, textWrap: 'balance' }}>
            {t.howTitle}
          </h2>
        </div>
        <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px' }}>
          {t.steps.map((step) => (
            <div key={step.n} style={{ borderTop: `2px solid ${step.color}`, paddingTop: '24px' }}>
              <div className="lp-step-n" style={{ fontSize: '54px', fontWeight: 600, color: step.color, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '18px' }}>
                {step.n}
              </div>
              <h3 className="lp-step-t" style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 11px' }}>{step.title}</h3>
              <p className="lp-step-b" style={{ fontSize: '18px', lineHeight: 1.62, color: 'var(--mb-text-secondary)', margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ COST & ELIGIBILITY ============ */}
      <section id="cost" style={{ background: 'var(--mb-true-lime-soft)' }}>
        <div className="cost-grid" style={{ maxWidth: '1600px', margin: '0 auto', padding: '96px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '72px', alignItems: 'center' }}>
          <div>
            <div style={{ ...label, marginBottom: '16px' }}>{t.costLabel}</div>
            <h2 className="lp-h2" style={{ fontSize: '48px', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 20px', lineHeight: 1.1, textWrap: 'balance' }}>
              {t.costTitle}
            </h2>
            <p className="lp-cost-sub" style={{ fontSize: '20px', lineHeight: 1.62, color: '#41504A', margin: '0 0 32px', maxWidth: '480px' }}>
              {t.costSub}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {t.eligibility.map((item) => (
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
          <div className="lp-est-card" style={{ background: 'var(--mb-bg-surface)', border: '1px solid var(--mb-border)', borderRadius: '22px', padding: '32px', boxShadow: 'var(--mb-shadow-lg)' }}>
            <div style={{ fontSize: '15px', color: 'var(--mb-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
              {t.estimateLabel}
            </div>
            <div style={{ fontSize: '17px', color: 'var(--mb-text-secondary)', marginBottom: '26px' }}>{t.estimateSub}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <div className="lp-est-tile" style={{ height: '112px', background: '#F4F1EA', border: '1px solid var(--mb-border-soft)', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '32px', fontWeight: 600, color: 'var(--mb-text-disabled)', textDecoration: 'line-through' }}>$180</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '13.5px', color: 'var(--mb-text-muted)', marginTop: '11px' }}>{t.fullPrice}</div>
              </div>
              <div style={{ fontSize: '22px', color: '#C9C2B2', paddingBottom: '42px' }}>→</div>
              <div style={{ flex: 1 }}>
                <div className="lp-est-tile" style={{ height: '112px', background: 'var(--mb-true-lime)', border: '1.5px solid var(--mb-primary)', borderRadius: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 600, color: 'var(--mb-primary)', letterSpacing: '-0.02em' }}>$25</span>
                  <span style={{ fontSize: '11px', color: 'var(--mb-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Lowest tier</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '13.5px', color: 'var(--mb-primary)', fontWeight: 600, marginTop: '11px' }}>{t.likelyPay}</div>
              </div>
            </div>
            <div style={{ background: 'var(--mb-honey-soft)', borderRadius: '13px', padding: '14px 16px', marginTop: '22px', fontSize: '13.5px', lineHeight: 1.55, color: 'var(--mb-honey-soft-ink)' }}>
              {t.estimateNote}
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRIVACY ============ */}
      <section id="privacy" className="lp-privacy" style={{ maxWidth: '1600px', margin: '0 auto', padding: '104px 32px 96px' }}>
        <div className="lp-privacy-head" style={{ maxWidth: '800px', margin: '0 0 60px' }}>
          <div style={{ ...label, marginBottom: '16px' }}>{t.privacyLabel}</div>
          <h2 className="lp-h2" style={{ fontSize: '48px', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.08, margin: '0 0 14px', textWrap: 'balance' }}>
            {t.privacyTitle}
          </h2>
          <p className="lp-privacy-sub" style={{ fontSize: '20px', lineHeight: 1.6, color: 'var(--mb-text-secondary)', margin: 0 }}>
            {t.privacySub}
          </p>
        </div>
        <div className="privacy-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '44px' }}>
          {t.privacy.map((item, idx) => (
            <div key={item.title} style={{ borderTop: '1px solid var(--mb-border-soft)', paddingTop: '26px' }}>
              <div className="lp-priv-ico" style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'var(--mb-true-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                {PRIVACY_ICONS[idx]}
              </div>
              <h3 className="lp-step-t" style={{ fontSize: '22px', fontWeight: 600, margin: '0 0 9px' }}>{item.title}</h3>
              <p className="lp-step-b" style={{ fontSize: '18px', lineHeight: 1.6, color: 'var(--mb-text-secondary)', margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="lp-faq" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px 96px' }}>
        <div style={{ margin: '0 0 40px' }}>
          <div style={{ ...label, marginBottom: '16px' }}>{t.faqLabel}</div>
          <h2 className="lp-h2" style={{ fontSize: '48px', fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>{t.faqTitle}</h2>
        </div>
        <div className="lp-faq-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {t.faqs.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.q} className="lp-faq-item" style={{ background: 'var(--mb-bg-surface)', border: '1px solid var(--mb-border)', borderRadius: '16px', overflow: 'hidden' }}>
                <button
                  onClick={() => toggle(i)}
                  aria-expanded={open}
                  className="lp-faq-q"
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
                  <span className="lp-faq-qt" style={{ fontSize: '22px', fontWeight: 600 }}>{item.q}</span>
                  <ChevronDown
                    size={22}
                    color="var(--mb-primary)"
                    style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  />
                </button>
                {open && (
                  <p className="lp-faq-a" style={{ fontSize: '18px', lineHeight: 1.62, color: 'var(--mb-text-secondary)', margin: 0, padding: '0 24px 24px' }}>
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="lp-cta" style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 32px 96px' }}>
        <div
          className="cta-block"
          style={{ background: 'var(--mb-primary)', borderRadius: '28px', padding: '60px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px', alignItems: 'center', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: '-40px', right: '-30px', width: '180px', height: '180px', borderRadius: '50%', background: 'var(--mb-secondary)', opacity: 0.35 }} />
          <div style={{ position: 'relative' }}>
            <h2 className="lp-cta-h2" style={{ fontSize: '44px', fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: '0 0 14px', lineHeight: 1.12, textWrap: 'balance' }}>
              {t.ctaTitle}
            </h2>
            <p className="lp-cta-sub" style={{ fontSize: '20px', lineHeight: 1.55, color: '#C2E4D9', margin: 0 }}>
              {t.ctaSub}
            </p>
          </div>
          <div className="lp-cta-actions" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
            <button
              type="button"
              onClick={openModal}
              className="mb-btn mb-btn-lime lp-cta-btn"
              style={{ height: '58px', padding: '0 30px', borderRadius: '13px', fontSize: '17px' }}
            >
              {t.heroCta} <span style={{ fontSize: '19px' }}>→</span>
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

        /* ===== Mobile reflow (~390px phone) ===== */
        @media (max-width: 760px) {
          /* Section headings share one mobile size */
          .lp-h2 { font-size: 27px !important; line-height: 1.12 !important; }

          /* Hero */
          .lp-hero { padding: 26px 22px 30px !important; }
          .hero-h1 { font-size: 33px !important; line-height: 1.08 !important; margin-bottom: 16px !important; }
          .lp-hero-sub { font-size: 16px !important; line-height: 1.55 !important; margin-bottom: 24px !important; }
          .lp-hero-actions { gap: 14px !important; }
          .lp-hero-cta { width: 100% !important; height: 54px !important; font-size: 16.5px !important; padding: 0 !important; }
          .lp-hero-badge { font-size: 13px !important; }

          /* Image band */
          .lp-imgband { padding: 0 22px 34px !important; }
          .lp-imgband-box { height: 220px !important; border-radius: 20px !important; }

          /* How it works */
          .lp-how { padding: 8px 22px 40px !important; }
          .lp-how-head { margin-bottom: 26px !important; }
          .how-grid { grid-template-columns: 1fr !important; gap: 26px !important; }
          .lp-step-n { font-size: 38px !important; margin-bottom: 10px !important; }
          .lp-step-t { font-size: 19px !important; margin-bottom: 7px !important; }
          .lp-step-b { font-size: 15px !important; line-height: 1.55 !important; }

          /* Cost & eligibility */
          .cost-grid { padding: 38px 22px !important; gap: 28px !important; }
          .lp-cost-sub { font-size: 15.5px !important; margin-bottom: 24px !important; }
          .lp-est-card { padding: 22px !important; border-radius: 20px !important; }
          .lp-est-tile { height: 96px !important; }

          /* Privacy */
          .lp-privacy { padding: 38px 22px 40px !important; }
          .lp-privacy-head { margin-bottom: 26px !important; }
          .lp-privacy-sub { font-size: 15.5px !important; }
          .privacy-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .lp-priv-ico { width: 44px !important; height: 44px !important; margin-bottom: 14px !important; }

          /* FAQ */
          .lp-faq { padding: 8px 22px 40px !important; }
          .lp-faq-list { gap: 10px !important; }
          .lp-faq-item { border-radius: 15px !important; }
          .lp-faq-q { padding: 17px 18px !important; }
          .lp-faq-qt { font-size: 15.5px !important; }
          .lp-faq-a { font-size: 15px !important; line-height: 1.55 !important; padding: 0 18px 18px !important; }

          /* CTA */
          .lp-cta { padding: 0 22px 34px !important; }
          .cta-block { padding: 34px 26px !important; border-radius: 26px !important; }
          .lp-cta-h2 { font-size: 27px !important; line-height: 1.14 !important; }
          .lp-cta-sub { font-size: 15.5px !important; }
          .lp-cta-actions { align-items: stretch !important; }
          .lp-cta-btn { width: 100% !important; height: 54px !important; font-size: 16px !important; padding: 0 !important; }
        }
      `}</style>

    </div>
  );
};

export default Home;
