import React from 'react';
import { ArrowUpRight, Lock, Handshake, DollarSign } from 'lucide-react';
import { useLang } from '../../context/LangContext';

const IMAGES = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1581579438747-104c53d7fbc4?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&h=400&fit=crop',
];

const CONTENT = {
  en: {
    eyebrow: 'Patient Experiences',
    title: 'Historias',
    heroSub: 'Real stories from patients who found the care they needed in Miami through MedicBridges.',
    sectionTitle: 'Strong communities, thriving lives.',
    readMore: 'Read More',
    stories: [
      { title: "Maria's Story", subtitle: 'Little Havana — Primary Care', quote: "I didn't know I could see a doctor without insurance until my neighbor told me. Now I have a primary care physician who speaks my language." },
      { title: "David's Journey", subtitle: 'Hialeah — Chronic Condition', quote: "My doctor here gives me my blood pressure medication every time I come. I didn't know that was even possible for someone with my income." },
      { title: 'Finding Mental Health', subtitle: 'Little Haiti — Mental Health', quote: 'When I found out there was a free therapist who speaks Creole — someone who would understand me — I called the same day.' },
      { title: "A Family's Relief", subtitle: 'Overtown — Pediatrics', quote: "My kids hadn't seen a doctor in over two years. MedicBridges helped us find a clinic where the whole family could be seen — for free." },
      { title: 'Medication Access', subtitle: 'Allapattah — Pharmacy', quote: 'I was paying $200 a month for my diabetes medication. Now I get it for free through the 340B program at my community clinic.' },
      { title: 'Prenatal Care', subtitle: "Homestead — Women's Health", quote: 'Being pregnant without insurance was terrifying. The clinic MedicBridges found gave me prenatal care, ultrasounds — everything I needed.' },
    ],
    values: [
      { title: 'Confidentiality', body: 'Your privacy matters; we keep your information safe.' },
      { title: 'Inclusivity', body: 'Programs that engage various communities in every language.' },
      { title: 'Affordability', body: 'Sliding scale options to ensure services are budget-friendly.' },
    ],
  },
  es: {
    eyebrow: 'Experiencias de Pacientes',
    title: 'Historias',
    heroSub: 'Historias reales de pacientes que encontraron la atención que necesitaban en Miami a través de MedicBridges.',
    sectionTitle: 'Comunidades fuertes, vidas prósperas.',
    readMore: 'Leer Más',
    stories: [
      { title: 'La Historia de María', subtitle: 'Little Havana — Atención Primaria', quote: 'No sabía que podía ver a un médico sin seguro hasta que mi vecina me lo dijo. Ahora tengo un médico de cabecera que habla mi idioma.' },
      { title: 'El Camino de David', subtitle: 'Hialeah — Condición Crónica', quote: 'Mi doctor aquí me da mi medicamento para la presión cada vez que vengo. No sabía que eso era posible para alguien con mis ingresos.' },
      { title: 'Encontrando Salud Mental', subtitle: 'Little Haiti — Salud Mental', quote: 'Cuando supe que había un terapeuta gratuito que habla creole — alguien que me entendería — llamé el mismo día.' },
      { title: 'El Alivio de una Familia', subtitle: 'Overtown — Pediatría', quote: 'Mis hijos no habían visto a un médico en más de dos años. MedicBridges nos ayudó a encontrar una clínica donde toda la familia pudo ser atendida — gratis.' },
      { title: 'Acceso a Medicamentos', subtitle: 'Allapattah — Farmacia', quote: 'Pagaba $200 al mes por mi medicamento para la diabetes. Ahora lo recibo gratis a través del programa 340B en mi clínica comunitaria.' },
      { title: 'Atención Prenatal', subtitle: 'Homestead — Salud de la Mujer', quote: 'Estar embarazada sin seguro era aterrador. La clínica que MedicBridges encontró me dio atención prenatal, ecografías — todo lo que necesitaba.' },
    ],
    values: [
      { title: 'Confidencialidad', body: 'Tu privacidad importa; mantenemos tu información segura.' },
      { title: 'Inclusión', body: 'Programas que involucran a diversas comunidades en todos los idiomas.' },
      { title: 'Accesibilidad', body: 'Opciones de escala móvil para que los servicios se ajusten a tu presupuesto.' },
    ],
  },
};

const VALUE_ICONS = [Lock, Handshake, DollarSign];

// Historias page — dark green card grid inspired by Mentara layout
const Historias = () => {
  const { lang } = useLang();
  const t = CONTENT[lang];
  const stories = t.stories.map((s, i) => ({ ...s, image: IMAGES[i] }));

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out' }}>

      {/* Hero — cream section */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center', backgroundColor: 'var(--mb-bg-primary)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-lime-soft)', color: 'var(--mb-accent)', borderRadius: 'var(--mb-radius-pill)', marginBottom: '1rem' }}>
            {t.eyebrow}
          </div>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            <em>{t.title}</em>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--mb-text-secondary)', maxWidth: '800px', margin: '0 auto' }}>
            {t.heroSub}
          </p>
        </div>
      </section>

      {/* Deepwell teal card grid */}
      <section style={{ padding: '4rem 2rem', backgroundColor: 'var(--mb-primary)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '2.25rem', color: '#fff' }}>
              <em>{t.sectionTitle}</em>
            </h2>
          </div>

          <div className="historias-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {stories.map((story, i) => (
              <div key={i} style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--mb-radius-lg)',
                border: '1px solid rgba(255,255,255,0.12)',
                overflow: 'hidden',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Image */}
                <div style={{
                  width: '100%',
                  height: '200px',
                  overflow: 'hidden',
                }}>
                  <img 
                    src={story.image} 
                    alt={story.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem', color: '#fff' }}>{story.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', marginBottom: '1rem' }}>{story.subtitle}</p>
                  <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '1.25rem' }}>
                    "{story.quote}"
                  </p>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 1rem',
                    backgroundColor: 'var(--mb-honey)',
                    color: 'var(--mb-honey-ink)',
                    borderRadius: 'var(--mb-radius-btn)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}>
                    {t.readMore} <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values bar — deeper teal with icons */}
      <section style={{ padding: '4rem 2rem', backgroundColor: 'var(--mb-primary-hover)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div className="values-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            {t.values.map((v, i) => {
              const Icon = VALUE_ICONS[i];
              return (
                <div key={v.title} style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 'var(--mb-radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ marginBottom: '1rem' }}><Icon size={28} color="var(--mb-honey)" /></div>
                  <h3 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>{v.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>{v.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 1024px) {
          .historias-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .historias-grid { grid-template-columns: 1fr !important; }
          .values-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

    </div>
  );
};

export default Historias;
