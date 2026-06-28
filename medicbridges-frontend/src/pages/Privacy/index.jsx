import React from 'react';

const Privacy = () => {
  return (
    <div className="page-container" style={{ padding: '4rem 2rem', maxWidth: '1200px', animation: 'fadeIn 0.6s ease-out' }}>
      
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-bg-surface-hover)', color: 'var(--mb-text-secondary)', borderRadius: 'var(--mb-radius-pill)', marginBottom: '1rem', border: '1px solid var(--mb-border)' }}>
          Florida International University — Student Research Project
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Privacy Policy & Terms of Use</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)' }}>MedicBridges | Last updated: March 2026</p>
        <p style={{ marginTop: '0.5rem', color: 'var(--mb-accent)' }}><em>Non-commercial. Non-profit. Educational purposes only.</em></p>
      </div>

      <div className="mb-bento-card privacy-card" style={{ padding: '3rem' }}>
        
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Summary</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
          We are FIU students building this platform to help people find medical care. We collect only what is necessary, never sell your data, and you are here because you choose to be — not because anyone required you. This platform is a non-commercial academic prototype and is not a substitute for professional medical advice.
        </p>

        <hr style={{ border: 'none', borderTop: '1px solid var(--mb-border)', margin: '2rem 0' }} />

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Who We Are</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Built by students at FIU for academic research. MedicBridges is not a healthcare provider, clinic, hospital, nor an insurance agency.
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Purpose of the Platform</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          This platform aggregates publicly available and voluntarily submitted data regarding community clinics, free clinics, and sliding-scale services to help uninsured and underinsured patients find care.
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Voluntary Use</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Use of this platform is strictly voluntary. No patient or clinic is required to register or use this platform.
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Data We Collect</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          We collect basic information for matching only (e.g., ZIP code, general insurance status, age range). We <strong>never</strong> ask for social security numbers, full medical records, payment information, or official IDs.
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>How We Use Your Data</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Data is only used for matching patients to clinics, anonymized research for our FIU capstone, and platform improvements. Your data is <strong>never sold</strong> or used for targeted advertising.
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Data Storage & Security</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Your data is stored securely and is not shared with third parties outside of the specific clinic you choose to connect with.
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Your Rights</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          You can request full data deletion at any time by contacting us.
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Medical Disclaimer</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          This platform does not provide medical advice, diagnosis, or treatment. Always seek the advice of a physician or qualified health provider with any questions you may have regarding a medical condition. In an emergency, call 911 immediately.
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Contact</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          For questions, data deletion requests, or concerns, please contact our student team at: <a href="mailto:medibridge@fiu.edu" style={{ fontWeight: 600 }}>medibridge@fiu.edu</a>
        </p>

        <div style={{ padding: '1rem', backgroundColor: 'var(--mb-bg-primary)', borderRadius: 'var(--mb-radius-sm)', marginTop: '3rem' }}>
          <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            By using this platform, you confirm you have read and understood this policy, your use is voluntary, and you understand this is a student research project with no commercial intent.
          </p>
        </div>

      </div>

      <style>{`
        @media (max-width: 640px) {
          .privacy-card { padding: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
};

export default Privacy;
