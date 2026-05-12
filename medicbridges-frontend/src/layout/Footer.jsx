import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';

const footerLinkStyle = { color: 'rgba(245,240,232,0.6)', fontSize: '0.9rem', fontFamily: "'DM Serif Text', Georgia, serif" };
const footerHeadingStyle = { color: '#f5f0e8', marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 400, fontFamily: "'DM Serif Display', Georgia, serif" };

const Footer = () => {
  return (
    <footer style={{ 
      marginTop: 'auto',
      padding: '4rem 2rem 2rem', 
      backgroundColor: '#1a2e1a',
      color: 'rgba(245,240,232,0.7)',
      fontFamily: "'DM Serif Text', Georgia, serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
          
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--mb-lime)', color: '#2d3b2d', padding: '0.3rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stethoscope size={18} />
              </div>
              <span style={{ fontWeight: 400, fontSize: '1.15rem', color: '#f5f0e8', fontFamily: "'DM Serif Display', Georgia, serif" }}>MedicBridges</span>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              Connecting patients with free and low-cost healthcare in Miami-Dade.
            </p>
          </div>

          {/* For Patients */}
          <div>
            <h4 style={footerHeadingStyle}>For Patients</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/search" style={footerLinkStyle}>Find Care</Link>
              <Link to="/map" style={footerLinkStyle}>Clinic Map</Link>
              <Link to="/patient-signup" style={footerLinkStyle}>Create Profile</Link>
              <Link to="/historias" style={footerLinkStyle}>Historias</Link>
            </div>
          </div>

          {/* For Clinics */}
          <div>
            <h4 style={footerHeadingStyle}>For Clinics</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/for-clinics" style={footerLinkStyle}>Why MedicBridges</Link>
              <Link to="/clinic-signup" style={footerLinkStyle}>Register Your Clinic</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 style={footerHeadingStyle}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/privacy" style={footerLinkStyle}>Privacy Policy</Link>
              <Link to="/problem" style={footerLinkStyle}>Our Mission</Link>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(245,240,232,0.1)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'rgba(245,240,232,0.4)' }}>
          © 2026 MedicBridges — Miami, FL. A non-commercial FIU student research project.
        </div>

      </div>

      <style>{`
        @media (max-width: 640px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
