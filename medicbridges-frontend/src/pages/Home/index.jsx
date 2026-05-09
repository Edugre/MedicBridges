import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, MapPin, Shield, Heart, Users, Stethoscope, Check, Lock, Handshake, DollarSign, Sparkles } from 'lucide-react';

const Home = () => {
  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out' }}>

      {/* Hero Section */}
      <section className="hero-section" style={{ padding: '8rem 2rem 6rem', textAlign: 'center', backgroundColor: 'var(--mb-bg-primary)', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle background accent */}
        <div style={{ position: 'absolute', top: '-200px', right: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,59,45,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-150px', left: '-150px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(197,232,71,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-lime-soft)', color: 'var(--mb-accent)', borderRadius: 'var(--mb-radius-pill)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Free for Patients — Always
          </div>
          
          <h1 className="hero-heading" style={{ fontSize: '4rem', marginBottom: '1.5rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Find free healthcare<br />
            <span style={{ fontStyle: 'italic', color: 'var(--mb-text-secondary)' }}>in Miami.</span>
          </h1>
          
          <p style={{ fontSize: '1.15rem', color: 'var(--mb-text-secondary)', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 3rem' }}>
            MedicBridges connects uninsured and Medicaid patients to free clinics, pharmacies, therapists, and specialists — in your language, near you.
          </p>

          <div className="hero-buttons" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <Link to="/search" className="mb-btn mb-btn-secondary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
              Find Care Now <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </Link>
            <Link to="/for-clinics" className="mb-btn mb-btn-outline" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
              I'm a Clinic
            </Link>
          </div>

          <div className="hero-trust" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', color: 'var(--mb-text-muted)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={14} color="var(--mb-accent)" /> No login required</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={14} color="var(--mb-accent)" /> 100% free</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={14} color="var(--mb-accent)" /> Miami-Dade focused</span>
          </div>
        </div>
      </section>

      {/* Hero Image Placeholder */}
      <section style={{ padding: '0 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '-3rem auto 0' }}>
          <div className="image-placeholder" style={{ minHeight: '400px', borderRadius: 'var(--mb-radius-lg)', boxShadow: 'var(--mb-shadow-lg)' }}>
            [Platform Screenshot / Hero Image]
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ padding: '4rem 2rem' }}>
        <div className="stats-grid" style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2.5rem', color: 'var(--mb-accent)' }}>50+</div>
            <div style={{ color: 'var(--mb-text-secondary)' }}>Clinics Listed</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', color: 'var(--mb-accent)' }}>100%</div>
            <div style={{ color: 'var(--mb-text-secondary)' }}>Free for Patients</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', color: 'var(--mb-accent)' }}>4+</div>
            <div style={{ color: 'var(--mb-text-secondary)' }}>Languages Supported</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', color: 'var(--mb-accent)' }}>24h</div>
            <div style={{ color: 'var(--mb-text-secondary)' }}>Clinic Setup Time</div>
          </div>
        </div>
      </section>

      {/* What You Can Find Section */}
      <section style={{ padding: '6rem 2rem', backgroundColor: 'var(--mb-bg-surface)', borderTop: '1px solid var(--mb-border)', borderBottom: '1px solid var(--mb-border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>What you can find</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
              All the care you need, aggregated into one place — filtered by your insurance, language, and location.
            </p>
          </div>


          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div className="mb-bento-card" style={{ textAlign: 'center' }}>
              <Stethoscope size={36} color="var(--mb-accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Primary Care</h3>
              <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>FQHCs and community health centers that serve the uninsured.</p>
            </div>
            <div className="mb-bento-card" style={{ textAlign: 'center' }}>
              <Heart size={36} color="var(--mb-accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Mental Health</h3>
              <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>Free therapy, counseling, and substance abuse programs.</p>
            </div>
            <div className="mb-bento-card" style={{ textAlign: 'center' }}>
              <Shield size={36} color="var(--mb-accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Pharmacy & Meds</h3>
              <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>Clinics with on-site meds through the 340B program — often at $0.</p>
            </div>
            <div className="mb-bento-card" style={{ textAlign: 'center' }}>
              <Users size={36} color="var(--mb-accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Women's & Children's</h3>
              <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>OB-GYN, prenatal care, pediatrics, and reproductive health services.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section — Mentara-style dark green split layout */}
      <section style={{ backgroundColor: '#2d3b2d', padding: '0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="about-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '500px' }}>
            {/* Image side */}
            <div style={{ overflow: 'hidden' }}>
              <img 
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop"
                alt="Healthcare consultation"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: '400px' }}
                onError={(e) => { e.target.parentElement.style.backgroundColor = 'rgba(245,240,232,0.05)'; e.target.style.display = 'none'; }}
              />
            </div>
            {/* Text side */}
            <div style={{ padding: '4rem 3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <Sparkles size={18} color="var(--mb-lime)" />
                <span style={{ color: 'rgba(245,240,232,0.6)', fontSize: '0.9rem' }}>About MedicBridges</span>
              </div>
              <h2 style={{ fontSize: '2.5rem', color: '#f5f0e8', marginBottom: '1.5rem', lineHeight: 1.15 }}>
                <em>Bridging the gap to care, one patient at a time.</em>
              </h2>
              <p style={{ color: 'rgba(245,240,232,0.7)', lineHeight: 1.7, marginBottom: '2rem', fontSize: '1.05rem' }}>
                MedicBridges aggregates every free and low-cost healthcare resource in Miami-Dade into one searchable platform. We match patients to the right provider based on language, location, insurance status, and the type of care they need.
              </p>
              <div>
                <Link to="/problem" className="mb-btn" style={{ backgroundColor: 'var(--mb-lime)', color: '#2d3b2d', padding: '0.75rem 1.5rem' }}>
                  Know Us More <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                </Link>
              </div>

              {/* Values row */}
              <div className="values-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(245,240,232,0.1)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '0.5rem' }}><Lock size={24} color="var(--mb-lime)" /></div>
                  <h4 style={{ color: '#f5f0e8', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Confidentiality</h4>
                  <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '0.8rem' }}>Your privacy matters; we keep your information safe.</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '0.5rem' }}><Handshake size={24} color="var(--mb-lime)" /></div>
                  <h4 style={{ color: '#f5f0e8', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Inclusivity</h4>
                  <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '0.8rem' }}>Programs that engage various communities.</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '0.5rem' }}><DollarSign size={24} color="var(--mb-lime)" /></div>
                  <h4 style={{ color: '#f5f0e8', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Affordability</h4>
                  <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '0.8rem' }}>Sliding scale options to ensure budget-friendly care.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>How it works</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)' }}>Find the right care in three simple steps.</p>
          </div>

          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--mb-lime-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem', color: 'var(--mb-accent)' }}>1</div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Search</h3>
              <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>Enter your ZIP code, insurance status, and what kind of care you need.</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--mb-lime-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem', color: 'var(--mb-accent)' }}>2</div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Get Matched</h3>
              <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>We show you clinics that match your criteria — filtered by language, distance, and services.</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--mb-lime-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem', color: 'var(--mb-accent)' }}>3</div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Connect</h3>
              <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>Call, visit, or follow the clinic directly. No middleman, no cost.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Teaser */}
      <section style={{ padding: '6rem 2rem', backgroundColor: '#2d3b2d', color: '#f5f0e8', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: '#f5f0e8' }}>
            1 in 4 Miami residents lack adequate health coverage.
          </h2>
          <p style={{ fontSize: '1.1rem', marginBottom: '2.5rem', color: 'rgba(245,240,232,0.7)', lineHeight: 1.6 }}>
            The care exists. People just can't find it. We went to the community to understand why — and built MedicBridges to fix it.
          </p>
          <Link to="/problem" className="mb-btn" style={{ backgroundColor: 'var(--mb-lime)', color: '#2d3b2d', padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Read the Full Story <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Ready to find care?</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)', marginBottom: '2.5rem' }}>
            MedicBridges is free for patients, always. Start your search now or create a profile to get matched automatically.
          </p>
          <div className="cta-buttons" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/search" className="mb-btn mb-btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              <Search size={20} style={{ marginRight: '0.5rem' }} /> Search Clinics
            </Link>
            <Link to="/patient-signup" className="mb-btn mb-btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Create My Profile
            </Link>
          </div>
        </div>
      </section>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 1024px) {
          .hero-section { padding: 5rem 1.5rem 4rem !important; }
          .hero-heading { font-size: 3rem !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .steps-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 1.5rem !important; }
          .about-split { grid-template-columns: 1fr !important; }
          .about-split > div:last-child { padding: 3rem 2rem !important; }
        }
        @media (max-width: 640px) {
          .hero-section { padding: 4rem 1rem 3rem !important; }
          .hero-heading { font-size: 2.25rem !important; }
          .hero-buttons { flex-direction: column !important; align-items: center !important; }
          .hero-buttons .mb-btn { width: 100% !important; justify-content: center !important; }
          .hero-trust { flex-direction: column !important; align-items: center !important; gap: 0.75rem !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 1.5rem !important; }
          .stats-grid > div > div:first-child { font-size: 2rem !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .about-split > div:last-child { padding: 2rem 1.25rem !important; }
          .about-split > div:last-child h2 { font-size: 1.75rem !important; }
          .values-row { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
          .cta-buttons { flex-direction: column !important; }
          .cta-buttons .mb-btn { width: 100% !important; justify-content: center !important; }
        }
      `}</style>

    </div>
  );
};

export default Home;
