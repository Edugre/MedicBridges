import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, TrendingUp, Users, Shield, Target, Activity, MapPin } from 'lucide-react';

const ForClinics = () => {
  return (
    <div className="page-container" style={{ padding: '0', animation: 'fadeIn 0.6s ease-out' }}>
      
      {/* Hero Section */}
      <section className="fc-hero" style={{ padding: '6rem 2rem', textAlign: 'center', backgroundColor: 'var(--mb-bg-primary)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-lime-soft)', color: 'var(--mb-accent)', borderRadius: 'var(--mb-radius-pill)', marginBottom: '1.5rem' }}>
            For Healthcare Providers
          </div>
          <h1 className="fc-heading" style={{ fontSize: '3.5rem', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Reach patients who <br />
            <span style={{ fontStyle: 'italic', color: 'var(--mb-text-secondary)' }}>actually need you.</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--mb-text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            MedicBridges routes pre-screened, Medicaid-eligible uninsured patients directly to your clinic. Reduce no-shows, fill open slots, and reduce your outreach costs.
          </p>
          
          <div className="fc-hero-btns" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem', flexWrap: 'wrap' }}>
            <Link to="/clinic-signup" className="mb-btn mb-btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              List Your Clinic Free <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </Link>
            <a href="#pricing" className="mb-btn mb-btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              See Pricing Plans
            </a>
          </div>

          <div className="fc-trust" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', color: 'var(--mb-text-secondary)', fontSize: '0.95rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} color="var(--mb-accent)"/> Free listing, no credit card</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} color="var(--mb-accent)"/> No long-term contract</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} color="var(--mb-accent)"/> Live in 24 hours</span>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ borderTop: '1px solid var(--mb-border)', borderBottom: '1px solid var(--mb-border)', padding: '2rem', backgroundColor: 'var(--mb-bg-surface)' }}>
        <div className="fc-stats" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', textAlign: 'center', flexWrap: 'wrap', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '2rem', color: 'var(--mb-text-heading)' }}>50+</div>
            <div style={{ color: 'var(--mb-text-secondary)' }}>Miami clinics</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', color: 'var(--mb-text-heading)' }}>$0</div>
            <div style={{ color: 'var(--mb-text-secondary)' }}>to start</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', color: 'var(--mb-text-heading)' }}>24h</div>
            <div style={{ color: 'var(--mb-text-secondary)' }}>to go live</div>
          </div>
        </div>
      </section>

      {/* Image Placeholder */}
      <section style={{ padding: '4rem 2rem' }}>
         <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="image-placeholder" style={{ minHeight: '400px' }}>
              [Dashboard / UI Platform Screenshot]
            </div>
         </div>
      </section>

      {/* Why MedicBridges */}
      <section style={{ padding: '6rem 2rem', backgroundColor: 'var(--mb-bg-primary)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Why MedicBridges</h2>
            <p style={{ fontSize: '1.15rem', color: 'var(--mb-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
              Built for Miami-Dade community health. More visibility, better-matched patients, no long-term lock-in.
            </p>
          </div>

          <div className="fc-why-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div className="mb-bento-card">
              <MapPin size={32} color="var(--mb-accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Local Focus — Miami Only</h3>
              <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6 }}>We don't spread thin nationally. Every patient on MedicBridges is in Miami-Dade.</p>
            </div>
            <div className="mb-bento-card">
              <Shield size={32} color="var(--mb-accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Medicaid Specialization</h3>
              <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6 }}>Built exclusively for Medicaid, sliding-scale, and uninsured patients.</p>
            </div>
            <div className="mb-bento-card">
              <Target size={32} color="var(--mb-accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Pre-Screened Leads</h3>
              <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6 }}>Patients are matched to your eligibility criteria before they arrive.</p>
            </div>
            <div className="mb-bento-card">
              <Users size={32} color="var(--mb-accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Community Trust</h3>
              <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6 }}>Built with patient interviews and community input.</p>
            </div>
            <div className="mb-bento-card">
              <Activity size={32} color="var(--mb-accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>No Long-Term Contracts</h3>
              <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6 }}>Start with a free listing. Upgrade when you see results.</p>
            </div>
            <div className="mb-bento-card">
              <TrendingUp size={32} color="var(--mb-accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Analytics Dashboard</h3>
              <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6 }}>Track profile views, patient connections, and conversion rates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '6rem 2rem', backgroundColor: 'var(--mb-bg-surface)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Transparent Pricing</h2>
            <p style={{ fontSize: '1.15rem', color: 'var(--mb-text-secondary)' }}>Start free. Upgrade when you're ready. No long-term contracts, ever.</p>
          </div>

          <div className="fc-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {/* Basic Plan */}
            <div className="mb-bento-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Basic</h3>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Free</div>
              <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '2rem' }}>Always free to get started</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1 }}>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Listed in the directory</li>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Basic profile</li>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Services and hours displayed</li>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Patients can find and call you</li>
              </ul>
              <Link to="/clinic-signup" className="mb-btn mb-btn-outline" style={{ width: '100%', justifyContent: 'center' }}>Get Started Free</Link>
            </div>

            {/* Featured Plan */}
            <div className="mb-bento-card" style={{ display: 'flex', flexDirection: 'column', border: '2px solid var(--mb-accent)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--mb-honey)', color: 'var(--mb-honey-ink)', padding: '0.25rem 1rem', borderRadius: 'var(--mb-radius-pill)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>Most Popular for FQHCs</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Featured</h3>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>$99<span style={{ fontSize: '1.25rem', color: 'var(--mb-text-secondary)' }}>/mo</span></div>
              <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '2rem' }}>Everything in Basic, plus:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1 }}>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Top placement in search</li>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> AI matching enabled</li>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Subscriber notifications</li>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Basic analytics dashboard</li>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> AI match badge</li>
              </ul>
              <Link to="/clinic-signup" className="mb-btn mb-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>Upgrade to Featured</Link>
            </div>

            {/* Partner Plan */}
            <div className="mb-bento-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Partner</h3>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>$299<span style={{ fontSize: '1.25rem', color: 'var(--mb-text-secondary)' }}>/mo</span></div>
              <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '2rem' }}>For health networks & hospitals</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1 }}>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Priority patient routing</li>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Full intake form integration</li>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Advanced analytics + exports</li>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Dedicated account manager</li>
                <li style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}><Check size={20} color="var(--mb-accent)" /> Multi-location support</li>
              </ul>
              <Link to="/clinic-signup" className="mb-btn mb-btn-outline" style={{ width: '100%', justifyContent: 'center' }}>Contact Sales</Link>
            </div>
          </div>
        </div>
      </section>
      
      <style>{`
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
