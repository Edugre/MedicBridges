import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Map, Pill, HeartHandshake, ArrowRight } from 'lucide-react';

const Problem = () => {
  return (
    <div className="page-container" style={{ padding: '0', animation: 'fadeIn 0.6s ease-out' }}>
      
      {/* Hero Section */}
      <section style={{ padding: '6rem 2rem', textAlign: 'center', backgroundColor: 'var(--mb-bg-primary)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-accent)', color: 'white', borderRadius: 'var(--mb-radius-pill)', fontWeight: 600, marginBottom: '1.5rem' }}>
            The Problem We're Solving
          </div>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Healthcare exists.<br />
            <span style={{ color: 'var(--mb-text-secondary)' }}>But for millions — it's invisible.</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--mb-text-secondary)', marginBottom: '0', lineHeight: 1.6 }}>
            We went directly to the community to understand why. This is what we found.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '4rem 2rem', backgroundColor: 'var(--mb-bg-surface)', borderBottom: '1px solid var(--mb-border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--mb-text-heading)', marginBottom: '0.5rem' }}>44,000+</div>
            <div style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.5 }}>Adults aged 18–64 die annually in the US due to lack of health insurance</div>
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--mb-text-heading)', marginBottom: '0.5rem' }}>38%</div>
            <div style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.5 }}>of Americans delay or avoid care due to cost</div>
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--mb-text-heading)', marginBottom: '0.5rem' }}>1 in 4</div>
            <div style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.5 }}>Miami-Dade residents are uninsured or underinsured</div>
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--mb-text-heading)', marginBottom: '0.5rem' }}>$0</div>
            <div style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.5 }}>spent on patient-facing outreach by most community clinics</div>
          </div>
        </div>
      </section>

      {/* Blocks Section */}
      <section style={{ padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          <div className="mb-bento-card" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--mb-radius-sm)', color: 'var(--mb-primary)' }}>
              <Map size={32} />
            </div>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>The Access Gap</h3>
              <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>The care exists. People just can't find it.</p>
              <blockquote style={{ borderLeft: '4px solid var(--mb-border)', paddingLeft: '1rem', color: 'var(--mb-text-heading)', fontStyle: 'italic', margin: 0 }}>
                "The problem isn't supply — it's information. When you don't know where to go, the ER becomes your primary care doctor. That costs the system $1,200+ per visit when a community clinic would cost $0."
              </blockquote>
            </div>
          </div>

          <div className="mb-bento-card" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--mb-radius-sm)', color: 'var(--mb-primary)' }}>
              <Pill size={32} />
            </div>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Medication Abandonment</h3>
              <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>Patients leave without the medications they need.</p>
              <blockquote style={{ borderLeft: '4px solid var(--mb-border)', paddingLeft: '1rem', color: 'var(--mb-text-heading)', fontStyle: 'italic', margin: 0 }}>
                "Many community clinics dispense medications on-site at no cost through the federal 340B drug pricing program. But patients don't know to ask."
              </blockquote>
            </div>
          </div>

          <div className="mb-bento-card" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--mb-radius-sm)', color: 'var(--mb-primary)' }}>
              <HeartHandshake size={32} />
            </div>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Mental Health Desert</h3>
              <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>Mental health care is the most invisible of all.</p>
              <blockquote style={{ borderLeft: '4px solid var(--mb-border)', paddingLeft: '1rem', color: 'var(--mb-text-heading)', fontStyle: 'italic', margin: 0 }}>
                "For underserved communities... finding free or affordable therapy is nearly impossible — not because services don't exist, but because the information is fragmented, buried in government websites, or simply unavailable..."
              </blockquote>
            </div>
          </div>

        </div>
      </section>

      {/* Field Research Quotes */}
      <section style={{ padding: '6rem 2rem', backgroundColor: 'var(--mb-accent)', color: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '3rem', textAlign: 'center', color: 'white' }}>Voices from the Field</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div style={{ padding: '2rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--mb-radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                "I didn't know I could see a doctor without insurance until my neighbor told me."
              </p>
              <div style={{ fontWeight: 600 }}>Patient Interview #1</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Little Havana — Primary Care</div>
            </div>

            <div style={{ padding: '2rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--mb-radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                "My doctor here gives me my blood pressure medication every time I come. I didn't know that was even possible."
              </p>
              <div style={{ fontWeight: 600 }}>Patient Interview #2</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Hialeah — Chronic Condition</div>
            </div>

            <div style={{ padding: '2rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--mb-radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                "Mental health in my community is not talked about. I was ashamed. But when I found out there was a free therapist who speaks Creole — someone who would understand me — I called the same day."
              </p>
              <div style={{ fontWeight: 600 }}>Patient Interview #3</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Little Haiti — Mental Health</div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section style={{ padding: '6rem 2rem', textAlign: 'center', backgroundColor: 'var(--mb-bg-surface)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>The Solution</h2>
          <p style={{ fontSize: '1.25rem', color: 'var(--mb-text-primary)', marginBottom: '1.5rem', fontWeight: 500 }}>
            That's why we built MedicBridges.
          </p>
          <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)', marginBottom: '3rem', lineHeight: 1.6 }}>
            One platform that aggregates every free clinic, sliding-scale provider, community pharmacy, and mental health service in Miami — and matches you to the right one, in your language, based on your situation.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/patient-signup" className="mb-btn mb-btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Find Care Now <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </Link>
            <Link to="/for-clinics" className="mb-btn mb-btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Partner With Us
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Problem;
