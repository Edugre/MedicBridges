import React from 'react';
import { ArrowUpRight, Lock, Handshake, DollarSign } from 'lucide-react';

// Historias page — dark green card grid inspired by Mentara layout
const Historias = () => {
  const stories = [
    {
      title: "Maria's Story",
      subtitle: "Little Havana — Primary Care",
      quote: "I didn't know I could see a doctor without insurance until my neighbor told me. Now I have a primary care physician who speaks my language.",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=400&fit=crop",
    },
    {
      title: "David's Journey",
      subtitle: "Hialeah — Chronic Condition",
      quote: "My doctor here gives me my blood pressure medication every time I come. I didn't know that was even possible for someone with my income.",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop",
    },
    {
      title: "Finding Mental Health",
      subtitle: "Little Haiti — Mental Health",
      quote: "When I found out there was a free therapist who speaks Creole — someone who would understand me — I called the same day.",
      image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=400&fit=crop",
    },
    {
      title: "A Family's Relief",
      subtitle: "Overtown — Pediatrics",
      quote: "My kids hadn't seen a doctor in over two years. MedicBridges helped us find a clinic where the whole family could be seen — for free.",
      image: "https://images.unsplash.com/photo-1581579438747-104c53d7fbc4?w=600&h=400&fit=crop",
    },
    {
      title: "Medication Access",
      subtitle: "Allapattah — Pharmacy",
      quote: "I was paying $200 a month for my diabetes medication. Now I get it for free through the 340B program at my community clinic.",
      image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600&h=400&fit=crop",
    },
    {
      title: "Prenatal Care",
      subtitle: "Homestead — Women's Health",
      quote: "Being pregnant without insurance was terrifying. The clinic MedicBridges found gave me prenatal care, ultrasounds — everything I needed.",
      image: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&h=400&fit=crop",
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out' }}>

      {/* Hero — cream section */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center', backgroundColor: 'var(--mb-bg-primary)' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-lime-soft)', color: 'var(--mb-accent)', borderRadius: 'var(--mb-radius-pill)', marginBottom: '1rem' }}>
            Patient Experiences
          </div>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            <em>Historias</em>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--mb-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Real stories from patients who found the care they needed in Miami through MedicBridges.
          </p>
        </div>
      </section>

      {/* Dark green card grid — Mentara-style */}
      <section style={{ padding: '4rem 2rem', backgroundColor: '#2d3b2d' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '2.25rem', color: '#f5f0e8' }}>
              <em>Strong communities, thriving lives.</em>
            </h2>
          </div>

          <div className="historias-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {stories.map((story, i) => (
              <div key={i} style={{
                backgroundColor: 'rgba(245, 240, 232, 0.06)',
                borderRadius: 'var(--mb-radius-lg)',
                border: '1px solid rgba(245,240,232,0.1)',
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
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem', color: '#f5f0e8' }}>{story.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(245,240,232,0.5)', marginBottom: '1rem' }}>{story.subtitle}</p>
                  <p style={{ fontSize: '0.95rem', color: 'rgba(245,240,232,0.75)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '1.25rem' }}>
                    "{story.quote}"
                  </p>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 1rem',
                    backgroundColor: 'var(--mb-lime)',
                    color: '#2d3b2d',
                    borderRadius: 'var(--mb-radius-btn)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}>
                    Read More <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values bar — dark green with icons */}
      <section style={{ padding: '4rem 2rem', backgroundColor: '#243524' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="values-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(245,240,232,0.05)', borderRadius: 'var(--mb-radius-lg)', border: '1px solid rgba(245,240,232,0.08)' }}>
              <div style={{ marginBottom: '1rem' }}><Lock size={28} color="var(--mb-lime)" /></div>
              <h3 style={{ color: '#f5f0e8', fontSize: '1.15rem', marginBottom: '0.5rem' }}>Confidentiality</h3>
              <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '0.9rem' }}>Your privacy matters; we keep your information safe.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(245,240,232,0.05)', borderRadius: 'var(--mb-radius-lg)', border: '1px solid rgba(245,240,232,0.08)' }}>
              <div style={{ marginBottom: '1rem' }}><Handshake size={28} color="var(--mb-lime)" /></div>
              <h3 style={{ color: '#f5f0e8', fontSize: '1.15rem', marginBottom: '0.5rem' }}>Inclusivity</h3>
              <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '0.9rem' }}>Programs that engage various communities in every language.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(245,240,232,0.05)', borderRadius: 'var(--mb-radius-lg)', border: '1px solid rgba(245,240,232,0.08)' }}>
              <div style={{ marginBottom: '1rem' }}><DollarSign size={28} color="var(--mb-lime)" /></div>
              <h3 style={{ color: '#f5f0e8', fontSize: '1.15rem', marginBottom: '0.5rem' }}>Affordability</h3>
              <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '0.9rem' }}>Sliding scale options to ensure services are budget-friendly.</p>
            </div>
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
