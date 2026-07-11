import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, TrendingUp, Users, Shield, Target, Activity, MapPin } from 'lucide-react';
import { useLang } from '../../context/LangContext';

const CONTENT = {
  en: {
    badge: 'For Healthcare Providers',
    heroTitle1: 'Reach patients who',
    heroTitle2: 'actually need you.',
    heroSub: 'MedicBridges routes pre-screened, Medicaid-eligible uninsured patients directly to your clinic. Reduce no-shows, fill open slots, and reduce your outreach costs.',
    listFree: 'List Your Clinic Free',
    seePricing: 'See Pricing Plans',
    trust: ['Free listing, no credit card', 'No long-term contract', 'Live in 24 hours'],
    stats: [
      { n: '50+', label: 'Miami clinics' },
      { n: '$0', label: 'to start' },
      { n: '24h', label: 'to go live' },
    ],
    whyTitle: 'Why MedicBridges',
    whySub: 'Built for Miami-Dade community health. More visibility, better-matched patients, no long-term lock-in.',
    why: [
      { Icon: MapPin, h: 'Local Focus Miami Only', p: "We don't spread thin nationally. Every patient on MedicBridges is in Miami-Dade." },
      { Icon: Shield, h: 'Medicaid Specialization', p: 'Built exclusively for Medicaid, sliding-scale, and uninsured patients.' },
      { Icon: Target, h: 'Pre-Screened Leads', p: 'Patients are matched to your eligibility criteria before they arrive.' },
      { Icon: Users, h: 'Community Trust', p: 'Built with patient interviews and community input.' },
      { Icon: Activity, h: 'No Long-Term Contracts', p: 'Start with a free listing. Upgrade when you see results.' },
      { Icon: TrendingUp, h: 'Analytics Dashboard', p: 'Track profile views, patient connections, and conversion rates.' },
    ],
    pricingTitle: 'Transparent Pricing',
    pricingSub: "Start free. Upgrade when you're ready. No long-term contracts, ever.",
    mostPopular: 'Most Popular for FQHCs',
    perMo: '/mo',
    plans: [
      { name: 'Basic', price: 'Free', tagline: 'Always free to get started', features: ['Listed in the directory', 'Basic profile', 'Services and hours displayed', 'Patients can find and call you'], cta: 'Get Started Free', variant: 'outline' },
      { name: 'Featured', price: '$99', tagline: 'Everything in Basic, plus:', features: ['Top placement in search', 'AI matching enabled', 'Subscriber notifications', 'Basic analytics dashboard', 'AI match badge'], cta: 'Upgrade to Featured', variant: 'lime', featured: true },
      { name: 'Partner', price: '$299', tagline: 'For health networks & hospitals', features: ['Priority patient routing', 'Full intake form integration', 'Advanced analytics + exports', 'Dedicated account manager', 'Multi-location support'], cta: 'Contact Sales', variant: 'outline' },
    ],
  },
  es: {
    badge: 'Para Proveedores de Salud',
    heroTitle1: 'Llega a los pacientes que',
    heroTitle2: 'realmente te necesitan.',
    heroSub: 'MedicBridges dirige pacientes sin seguro, pre-evaluados y elegibles para Medicaid directamente a tu clínica. Reduce las ausencias, llena los espacios disponibles y baja tus costos de alcance.',
    listFree: 'Publica tu Clínica Gratis',
    seePricing: 'Ver Planes de Precios',
    trust: ['Publicación gratuita, sin tarjeta de crédito', 'Sin contrato a largo plazo', 'En línea en 24 horas'],
    stats: [
      { n: '50+', label: 'clínicas de Miami' },
      { n: '$0', label: 'para empezar' },
      { n: '24h', label: 'para activarse' },
    ],
    whyTitle: 'Por qué MedicBridges',
    whySub: 'Creado para la salud comunitaria de Miami-Dade. Más visibilidad, pacientes mejor emparejados, sin compromisos a largo plazo.',
    why: [
      { Icon: MapPin, h: 'Enfoque Local Solo Miami', p: 'No nos dispersamos a nivel nacional. Cada paciente en MedicBridges está en Miami-Dade.' },
      { Icon: Shield, h: 'Especialización en Medicaid', p: 'Creado exclusivamente para pacientes de Medicaid, escala móvil y sin seguro.' },
      { Icon: Target, h: 'Contactos Pre-Evaluados', p: 'Los pacientes se emparejan con tus criterios de elegibilidad antes de llegar.' },
      { Icon: Users, h: 'Confianza de la Comunidad', p: 'Creado con entrevistas a pacientes y aportes de la comunidad.' },
      { Icon: Activity, h: 'Sin Contratos a Largo Plazo', p: 'Comienza con una publicación gratuita. Mejora tu plan cuando veas resultados.' },
      { Icon: TrendingUp, h: 'Panel de Análisis', p: 'Sigue las vistas de perfil, las conexiones con pacientes y las tasas de conversión.' },
    ],
    pricingTitle: 'Precios Transparentes',
    pricingSub: 'Comienza gratis. Mejora tu plan cuando estés listo. Sin contratos a largo plazo, nunca.',
    mostPopular: 'El Más Popular para FQHCs',
    perMo: '/mes',
    plans: [
      { name: 'Básico', price: 'Gratis', tagline: 'Siempre gratis para empezar', features: ['Aparece en el directorio', 'Perfil básico', 'Servicios y horarios visibles', 'Los pacientes pueden encontrarte y llamarte'], cta: 'Empezar Gratis', variant: 'outline' },
      { name: 'Destacado', price: '$99', tagline: 'Todo lo del plan Básico, más:', features: ['Ubicación superior en búsquedas', 'Coincidencia con IA activada', 'Notificaciones a suscriptores', 'Panel de análisis básico', 'Insignia de coincidencia con IA'], cta: 'Mejorar a Destacado', variant: 'lime', featured: true },
      { name: 'Socio', price: '$299', tagline: 'Para redes de salud y hospitales', features: ['Enrutamiento prioritario de pacientes', 'Integración completa del formulario de admisión', 'Análisis avanzados + exportaciones', 'Gerente de cuenta dedicado', 'Soporte para múltiples ubicaciones'], cta: 'Contactar a Ventas', variant: 'outline' },
    ],
  },
};

const ForClinics = () => {
  const { lang } = useLang();
  const t = CONTENT[lang];
  return (
    <div className="page-container" style={{ padding: '0', animation: 'fadeIn 0.6s ease-out' }}>

      {/* Hero Section */}
      <section className="fc-hero" style={{
        padding: '6rem 2rem',
        textAlign: 'center',
        backgroundColor: 'var(--mb-bg-primary)',
        backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(207, 241, 82, 0.15), transparent 60%), radial-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 30px 30px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-lime-soft)', color: 'var(--mb-accent)', borderRadius: 'var(--mb-radius-pill)', marginBottom: '1.5rem' }}>
            {t.badge}
          </div>
          <h1 className="fc-heading" style={{ fontSize: '3.5rem', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            {t.heroTitle1} <br />
            <span style={{ fontStyle: 'italic', color: 'var(--mb-text-secondary)' }}>{t.heroTitle2}</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--mb-text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            {t.heroSub}
          </p>

          <div className="fc-hero-btns" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem', flexWrap: 'wrap' }}>
            <Link to="/clinic-signup" className="mb-btn mb-btn-lime" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              {t.listFree} <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </Link>
            <a href="#pricing" className="mb-btn mb-btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              {t.seePricing}
            </a>
          </div>

          <div className="fc-trust" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', color: 'var(--mb-text-secondary)', fontSize: '0.95rem', flexWrap: 'wrap' }}>
            {t.trust.map((item) => (
              <span key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} color="var(--mb-accent)"/> {item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ padding: '2.5rem 2rem', backgroundColor: 'var(--mb-primary)', width: '100%', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle background glow in the stats bar */}
        <div style={{ position: 'absolute', top: '-50%', left: '-5%', width: '300px', height: '300px', background: 'rgba(207, 241, 82, 0.1)', filter: 'blur(50px)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-50%', right: '-5%', width: '300px', height: '300px', background: 'rgba(255, 255, 255, 0.05)', filter: 'blur(50px)', borderRadius: '50%' }} />

        <div className="fc-stats" style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', textAlign: 'center', flexWrap: 'wrap', gap: '3rem', position: 'relative', zIndex: 1 }}>
          {t.stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', lineHeight: 1, display: 'inline-block', borderBottom: '3px solid var(--mb-true-lime)', paddingBottom: '6px' }}>{s.n}</div>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>


      {/* Why MedicBridges */}
      <section style={{ padding: '6rem 2rem', backgroundColor: 'var(--mb-bg-primary)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10%', right: '5%', width: '400px', height: '400px', background: 'rgba(207, 241, 82, 0.08)', filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '500px', height: '500px', background: 'rgba(0, 0, 0, 0.02)', filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{t.whyTitle}</h2>
            <p style={{ fontSize: '1.15rem', color: 'var(--mb-text-secondary)', maxWidth: '800px', margin: '0 auto' }}>
              {t.whySub}
            </p>
          </div>

          <div className="fc-why-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {t.why.map(({ Icon, h, p }) => (
              <div key={h} className="mb-bento-card">
                <Icon size={32} color="var(--mb-accent)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{h}</h3>
                <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6 }}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '6rem 2rem', backgroundColor: 'var(--mb-bg-surface)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '80%', background: 'radial-gradient(circle, rgba(207, 241, 82, 0.05) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{t.pricingTitle}</h2>
            <p style={{ fontSize: '1.15rem', color: 'var(--mb-text-secondary)' }}>{t.pricingSub}</p>
          </div>

          <div className="fc-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {t.plans.map((plan) => (
              <div
                key={plan.name}
                className={`mb-bento-card pricing-card${plan.featured ? ' featured-card' : ''}`}
                style={{ display: 'flex', flexDirection: 'column', ...(plan.featured ? { border: '2px solid var(--mb-primary)', position: 'relative' } : {}) }}
              >
                {plan.featured && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--mb-true-lime)', color: 'var(--mb-primary)', padding: '0.25rem 1rem', borderRadius: 'var(--mb-radius-pill)', fontSize: '0.875rem', whiteSpace: 'nowrap', fontWeight: 600 }}>{t.mostPopular}</div>
                )}
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{plan.name}</h3>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                  {plan.price}
                  {plan.price.startsWith('$') && (
                    <span style={{ fontSize: '1.25rem', color: 'var(--mb-text-secondary)' }}>{t.perMo}</span>
                  )}
                </div>
                <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '2rem' }}>{plan.tagline}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> {f}</li>
                  ))}
                </ul>
                <Link to="/clinic-signup" className={`mb-btn mb-btn-${plan.variant}`} style={{ width: '100%', justifyContent: 'center' }}>{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .pricing-card {
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .pricing-card:hover {
          transform: translateY(-5px);
          border-color: var(--mb-true-lime);
          box-shadow: 0 10px 30px rgba(207, 241, 82, 0.2);
        }
        .featured-card:hover {
          border-color: var(--mb-primary);
          box-shadow: 0 10px 30px rgba(0, 71, 62, 0.15);
        }
        @media (max-width: 1024px) {
          .fc-hero { padding: 4rem 1.5rem !important; }
          .fc-heading { font-size: 2.75rem !important; }
          .fc-why-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .fc-hero { padding: 3rem 1rem !important; }
          .fc-heading { font-size: 2rem !important; }
          .fc-hero-btns { flex-direction: column !important; align-items: center !important; }
          .fc-hero-btns .mb-btn, .fc-hero-btns a { width: 100% !important; justify-content: center !important; text-align: center !important; }
          .fc-trust { flex-direction: column !important; align-items: center !important; gap: 0.75rem !important; }
          .fc-why-grid { grid-template-columns: 1fr !important; }
          .fc-pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

    </div>
  );
};

export default ForClinics;
