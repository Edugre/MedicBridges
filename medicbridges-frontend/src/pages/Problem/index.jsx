import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Map, Pill, HeartHandshake, ArrowRight } from 'lucide-react';
import { useLang } from '../../context/LangContext';

const CONTENT = {
  en: {
    badge: "The Problem We're Solving",
    heroTitle1: 'Healthcare exists.',
    heroTitle2: "But for millions it's invisible.",
    heroSub: 'We went directly to the community to understand why. This is what we found.',
    stats: [
      { n: '44,000+', label: 'Adults aged 18 to 64 die annually\nin the US without health insurance' },
      { n: '38%', label: 'of Americans delay or avoid\ncare due to cost' },
      { n: '1 in 4', label: 'Miami-Dade residents are\nuninsured or underinsured' },
      { n: '$0', label: 'spent on patient outreach\nby most clinics' },
    ],
    blocks: [
      { Icon: Map, h: 'The Access Gap', p: "The care exists. People just can't find it.", quote: '"The problem isn\'t supply it\'s information. When you don\'t know where to go, the ER becomes your primary care doctor. That costs the system $1,200+ per visit when a community clinic would cost $0."' },
      { Icon: Pill, h: 'Medication Abandonment', p: 'Patients leave without the medications they need.', quote: '"Many community clinics dispense medications on-site at no cost through the federal 340B drug pricing program. But patients don\'t know to ask."' },
      { Icon: HeartHandshake, h: 'Mental Health Desert', p: 'Mental health care is the most invisible of all.', quote: '"For underserved communities... finding free or affordable therapy is nearly impossible not because services don\'t exist, but because the information is fragmented, buried in government websites, or simply unavailable..."' },
    ],
    voicesTitle: 'Voices from the Field',
    quotes: [
      { q: '"I didn\'t know I could see a doctor without insurance until my neighbor told me."', who: 'Patient Interview #1', where: 'Little Havana Primary Care' },
      { q: '"My doctor here gives me my blood pressure medication every time I come. I didn\'t know that was even possible."', who: 'Patient Interview #2', where: 'Hialeah Chronic Condition' },
      { q: '"Mental health in my community is not talked about. I was ashamed. But when I found out there was a free therapist who speaks Creole someone who would understand me I called the same day."', who: 'Patient Interview #3', where: 'Little Haiti Mental Health' },
    ],
    solutionTitle: 'The Solution',
    solutionLead: "That's why we built MedicBridges.",
    solutionBody: 'One platform that aggregates every free clinic, sliding-scale provider, community pharmacy, and mental health service in Miami and matches you to the right one, in your language, based on your situation.',
    findCareNow: 'Find Care Now',
    partner: 'Partner With Us',
  },
  es: {
    badge: 'El Problema que Resolvemos',
    heroTitle1: 'La atención médica existe.',
    heroTitle2: 'Pero para millones es invisible.',
    heroSub: 'Fuimos directamente a la comunidad para entender por qué. Esto es lo que encontramos.',
    stats: [
      { n: '44,000+', label: 'Adultos de 18 a 64 años mueren cada año\nen EE. UU. sin seguro médico' },
      { n: '38%', label: 'de los estadounidenses posponen o evitan\nla atención por el costo' },
      { n: '1 de cada 4', label: 'residentes de Miami-Dade no tienen seguro\no tienen seguro insuficiente' },
      { n: '$0', label: 'se gasta en alcance a pacientes\nen la mayoría de las clínicas' },
    ],
    blocks: [
      { Icon: Map, h: 'La Brecha de Acceso', p: 'La atención existe. La gente simplemente no la encuentra.', quote: '"El problema no es la oferta, es la información. Cuando no sabes a dónde ir, la sala de emergencias se convierte en tu médico de cabecera. Eso le cuesta al sistema más de $1,200 por visita cuando una clínica comunitaria costaría $0."' },
      { Icon: Pill, h: 'Abandono de Medicamentos', p: 'Los pacientes se van sin los medicamentos que necesitan.', quote: '"Muchas clínicas comunitarias entregan medicamentos en el lugar sin costo a través del programa federal de precios de medicamentos 340B. Pero los pacientes no saben que deben preguntar."' },
      { Icon: HeartHandshake, h: 'Desierto de Salud Mental', p: 'La atención de salud mental es la más invisible de todas.', quote: '"Para las comunidades desatendidas... encontrar terapia gratuita o accesible es casi imposible, no porque los servicios no existan, sino porque la información está fragmentada, enterrada en sitios web del gobierno, o simplemente no está disponible..."' },
    ],
    voicesTitle: 'Voces de la Comunidad',
    quotes: [
      { q: '"No sabía que podía ver a un médico sin seguro hasta que mi vecina me lo dijo."', who: 'Entrevista con paciente #1', where: 'Atención Primaria de Little Havana' },
      { q: '"Mi doctor aquí me da mi medicamento para la presión cada vez que vengo. No sabía que eso era posible."', who: 'Entrevista con paciente #2', where: 'Condición Crónica en Hialeah' },
      { q: '"La salud mental en mi comunidad no se habla. Me daba vergüenza. Pero cuando supe que había un terapeuta gratuito que habla creole, alguien que me entendería, llamé el mismo día."', who: 'Entrevista con paciente #3', where: 'Salud Mental en Little Haiti' },
    ],
    solutionTitle: 'La Solución',
    solutionLead: 'Por eso creamos MedicBridges.',
    solutionBody: 'Una sola plataforma que reúne cada clínica gratuita, proveedor de escala móvil, farmacia comunitaria y servicio de salud mental en Miami, y te conecta con el adecuado, en tu idioma, según tu situación.',
    findCareNow: 'Buscar Atención Ahora',
    partner: 'Colabora con Nosotros',
  },
};

const Problem = () => {
  const { lang } = useLang();
  const t = CONTENT[lang];
  return (
    <div className="page-container" style={{ padding: '0', animation: 'fadeIn 0.6s ease-out' }}>
      
      {/* Hero Section */}
      <section className="problem-hero" style={{ padding: '6rem 2rem', textAlign: 'center', backgroundColor: 'var(--mb-bg-primary)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '0.5rem 1.5rem', backgroundColor: 'var(--mb-true-lime)', color: '#000', borderRadius: 'var(--mb-radius-pill)', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
            {t.badge}
          </div>
          <h1 className="problem-heading" style={{ fontSize: '3.5rem', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            {t.heroTitle1}<br />
            <span style={{ fontStyle: 'italic', color: 'var(--mb-text-secondary)' }}>{t.heroTitle2}</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--mb-text-secondary)', lineHeight: 1.6 }}>
            {t.heroSub}
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ padding: '2.5rem 2rem', backgroundColor: 'var(--mb-primary)', width: '100%', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle background glow in the stats bar */}
        <div style={{ position: 'absolute', top: '-50%', left: '-5%', width: '300px', height: '300px', background: 'rgba(207, 241, 82, 0.1)', filter: 'blur(50px)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-50%', right: '-5%', width: '300px', height: '300px', background: 'rgba(255, 255, 255, 0.05)', filter: 'blur(50px)', borderRadius: '50%' }} />
        
        <div className="problem-stats" style={{ maxWidth: '1600px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {t.stats.map((s) => (
            <div key={s.n}>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', lineHeight: 1, display: 'inline-block', borderBottom: '3px solid var(--mb-true-lime)', paddingBottom: '6px' }}>{s.n}</div>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Blocks Section */}
      <section style={{ padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>

          {t.blocks.map(({ Icon, h, p, quote }) => (
            <div key={h} className="mb-bento-card problem-block" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--mb-lime-soft)', borderRadius: 'var(--mb-radius-sm)', color: 'var(--mb-accent)' }}>
                <Icon size={32} />
              </div>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{h}</h3>
                <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>{p}</p>
                <blockquote style={{ borderLeft: '4px solid var(--mb-border)', paddingLeft: '1rem', color: 'var(--mb-text-heading)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
                  {quote}
                </blockquote>
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* Field Research Quotes */}
      <section style={{ padding: '6rem 2rem', backgroundColor: 'var(--mb-primary)', color: '#fff' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '3rem', textAlign: 'center', color: '#fff' }}>{t.voicesTitle}</h2>

          <div className="quotes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {t.quotes.map((qt) => (
              <div key={qt.who} style={{ padding: '2rem', backgroundColor: 'rgba(245, 240, 232, 0.05)', borderRadius: 'var(--mb-radius-lg)', border: '1px solid rgba(245,240,232,0.1)' }}>
                <p style={{ fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                  {qt.q}
                </p>
                <div>{qt.who}</div>
                <div style={{ color: 'rgba(245,240,232,0.6)', fontSize: '0.9rem' }}>{qt.where}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section style={{ padding: '6rem 2rem', textAlign: 'center', backgroundColor: 'var(--mb-bg-surface)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>{t.solutionTitle}</h2>
          <p style={{ fontSize: '1.15rem', color: 'var(--mb-text-primary)', marginBottom: '1.5rem' }}>
            <em>{t.solutionLead}</em>
          </p>
          <p style={{ fontSize: '1.05rem', color: 'var(--mb-text-secondary)', marginBottom: '3rem', lineHeight: 1.6 }}>
            {t.solutionBody}
          </p>

          <div className="solution-buttons" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/patient-signup" className="mb-btn mb-btn-lime" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              {t.findCareNow} <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </Link>
            <Link to="/for-clinics" className="mb-btn mb-btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              {t.partner}
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 1024px) {
          .problem-hero { padding: 4rem 1.5rem !important; }
          .problem-heading { font-size: 2.75rem !important; }
          .problem-stats { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .problem-hero { padding: 3rem 1rem !important; }
          .problem-heading { font-size: 2rem !important; }
          .problem-stats { grid-template-columns: 1fr !important; }
          .problem-stats > div > div:first-child { font-size: 2.25rem !important; }
          .problem-block { flex-direction: column !important; }
          .quotes-grid { grid-template-columns: 1fr !important; }
          .solution-buttons { flex-direction: column !important; }
          .solution-buttons .mb-btn { width: 100% !important; justify-content: center !important; }
        }
      `}</style>

    </div>
  );
};

export default Problem;
