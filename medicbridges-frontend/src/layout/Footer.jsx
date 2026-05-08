import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ 
      marginTop: 'auto',
      padding: '4rem 2rem 2rem', 
      backgroundColor: 'var(--mb-accent)',
      color: 'rgba(255,255,255,0.7)',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
          
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--mb-primary)', color: 'white', padding: '0.3rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stethoscope size={18} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.15rem', color: 'white' }}>MedicBridges</span>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              Connecting patients with free and low-cost healthcare in Miami-Dade.
            </p>
          </div>

          {/* For Patients */}
          <div>
            <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 600 }}>For Patients</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/search" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Find Care</Link>
              <Link to="/map" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Clinic Map</Link>
              <Link to="/patient-signup" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Create Profile</Link>
              <Link to="/historias" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Historias</Link>
            </div>
          </div>

          {/* For Clinics */}
          <div>
            <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 600 }}>For Clinics</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/for-clinics" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Why MedicBridges</Link>
              <Link to="/clinic-signup" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Register Your Clinic</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 600 }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Privacy Policy</Link>
              <Link to="/problem" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Our Mission</Link>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
          © 2026 MedicBridges — Miami, FL. A non-commercial FIU student research project.
        </div>

      </div>
    </footer>
  );
};

export default Footer;
