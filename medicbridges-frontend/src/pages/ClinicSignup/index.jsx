import React from 'react';
import { ArrowRight } from 'lucide-react';

const ClinicSignup = () => {
  return (
    <div className="page-container" style={{ padding: '4rem 2rem', maxWidth: '1200px', animation: 'fadeIn 0.6s ease-out' }}>
      
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-lime-soft)', color: 'var(--mb-accent)', borderRadius: 'var(--mb-radius-pill)', marginBottom: '1rem' }}>
          For Healthcare Providers
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Register Your Clinic</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)' }}>
          Start reaching pre-screened Medicaid and uninsured patients in Miami. Get listed free — upgrade when you see results.
        </p>
      </div>

      <div className="mb-bento-card">
        <form onSubmit={(e) => e.preventDefault()}>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>Clinic Information</h2>
          
          <div className="mb-input-group">
            <label className="mb-label">Clinic / Organization Name *</label>
            <input type="text" className="mb-input" placeholder="e.g. Community Health Center of Miami" required />
          </div>

          <div className="mb-input-group">
            <label className="mb-label">Type of Clinic *</label>
            <select className="mb-select" required>
              <option value="">Select type...</option>
              <option value="fqhc">FQHC / Community Health Center</option>
              <option value="free">Free Clinic</option>
              <option value="mental">Mental Health Center</option>
              <option value="pharmacy">Community Pharmacy</option>
              <option value="hospital">Hospital / Health System</option>
              <option value="planned_parenthood">Planned Parenthood / Reproductive Health</option>
              <option value="dental">Dental Clinic</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">ZIP Code *</label>
              <input type="text" className="mb-input" placeholder="e.g. 33101" required />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">Phone Number *</label>
              <input type="tel" className="mb-input" placeholder="(305) 555-0123" required />
            </div>
          </div>

          <div className="mb-input-group">
            <label className="mb-label">Full Address *</label>
            <input type="text" className="mb-input" placeholder="123 Main St, Miami, FL" required />
          </div>

          <div className="mb-input-group">
            <label className="mb-label">Website (optional)</label>
            <input type="url" className="mb-input" placeholder="https://..." />
          </div>

          <div className="mb-input-group">
            <label className="mb-label">Operating Hours *</label>
            <input type="text" className="mb-input" placeholder="e.g. Mon-Fri: 8am - 5pm" required />
          </div>

          <div className="mb-input-group">
            <label className="mb-label">Brief Description</label>
            <textarea className="mb-textarea" rows="4" placeholder="Tell patients a little about your clinic..."></textarea>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>Contact Person</h2>
          
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">Full Name *</label>
              <input type="text" className="mb-input" required />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">Role / Title *</label>
              <input type="text" className="mb-input" placeholder="e.g. Clinic Director" required />
            </div>
          </div>
          
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">Email *</label>
              <input type="email" className="mb-input" required />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">Direct Phone</label>
              <input type="tel" className="mb-input" />
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>Services Offered</h2>
          <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>Select all services your clinic provides:</p>
          
          <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <label className="mb-checkbox-label"><input type="checkbox" /> Primary Care</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Dental</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Mental Health / Therapy</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Pharmacy / Medications</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Women's Health</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Pediatrics</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Vision</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> HIV/AIDS</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Substance Abuse</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Chronic Disease Mgmt</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Prenatal / OB-GYN</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Vaccinations</label>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>Insurance & Pricing</h2>
          <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>Which patients do you serve?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            <label className="mb-checkbox-label"><input type="checkbox" /> Uninsured patients</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Medicaid</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Medicare</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Sliding-scale fees</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Marketplace / ACA</label>
          </div>

          <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>Do you dispense medications on-site?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            <label className="mb-checkbox-label"><input type="radio" name="medications" /> Yes — free or low-cost meds available</label>
            <label className="mb-checkbox-label"><input type="radio" name="medications" /> Yes — 340B drug pricing program</label>
            <label className="mb-checkbox-label"><input type="radio" name="medications" /> No</label>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>Languages Spoken</h2>
          <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '3rem' }}>
            <label className="mb-checkbox-label"><input type="checkbox" defaultChecked /> English</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Spanish / Espanol</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Haitian Creole</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Portuguese</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Other</label>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>Choose Your Plan</h2>
          <div className="plan-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
            <label className="mb-bento-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer', border: '1px solid var(--mb-accent)' }}>
              <input type="radio" name="plan" defaultChecked style={{ marginTop: '0.25rem' }} />
              <div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Basic (Free)</div>
                <div style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>Listed in directory, Patients can find and call you.</div>
              </div>
            </label>
            <label className="mb-bento-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer' }}>
              <input type="radio" name="plan" style={{ marginTop: '0.25rem' }} />
              <div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Featured ($99 /mo)</div>
                <div style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>Top placement, AI matching, and basic analytics.</div>
              </div>
            </label>
            <label className="mb-bento-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer' }}>
              <input type="radio" name="plan" style={{ marginTop: '0.25rem' }} />
              <div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Partner ($299 /mo)</div>
                <div style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>For networks & hospitals with advanced needs.</div>
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <button type="submit" className="mb-btn mb-btn-secondary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
              Submit — We'll Reach Out in 24h <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </button>
            <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.85rem', maxWidth: '500px' }}>
              Your information is private and never sold. MedicBridges is a non-commercial academic prototype.
            </p>
          </div>

        </form>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .form-row { grid-template-columns: 1fr !important; }
          .checkbox-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default ClinicSignup;
