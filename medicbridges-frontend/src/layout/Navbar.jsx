import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Menu, X } from 'lucide-react';

const navLinkStyle = {
  fontWeight: 400,
  color: 'rgba(245,240,232,0.7)',
  transition: 'color 0.2s',
  fontFamily: "'Mulish', sans-serif",
  fontSize: '0.95rem',
};

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav style={{ 
      backgroundColor: '#2d3b2d',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Top bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '1rem 2rem',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400, fontSize: '1.25rem', color: '#f5f0e8', fontFamily: "'Figtree', sans-serif" }}>
          <div style={{ background: 'var(--mb-lime)', color: '#2d3b2d', padding: '0.35rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Stethoscope size={22} />
          </div>
          MedicBridges
        </Link>
        
        {/* Desktop Navigation */}
        <div className="nav-desktop" style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }}>
          <Link to="/search" style={navLinkStyle}>Find Care</Link>
          <Link to="/map" style={navLinkStyle}>Map</Link>
          <Link to="/problem" style={navLinkStyle}>Our Mission</Link>
          <Link to="/for-clinics" style={navLinkStyle}>For Clinics</Link>
          <Link to="/historias" style={navLinkStyle}>Historias</Link>
          <Link to="/patient-signup" className="mb-btn mb-btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.95rem' }}>Get Started</Link>
        </div>

        {/* Mobile Hamburger */}
        <button 
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ 
            display: 'none', 
            background: 'none', 
            border: 'none', 
            color: '#f5f0e8', 
            cursor: 'pointer',
            padding: '0.25rem',
          }}
        >
          {mobileOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="nav-mobile-menu" style={{
          display: 'none',
          flexDirection: 'column',
          gap: '0.25rem',
          padding: '0 2rem 1.5rem',
          backgroundColor: '#2d3b2d',
          borderTop: '1px solid rgba(245,240,232,0.08)',
        }}>
          <Link to="/search" onClick={() => setMobileOpen(false)} style={{ ...navLinkStyle, padding: '0.75rem 0', borderBottom: '1px solid rgba(245,240,232,0.06)' }}>Find Care</Link>
          <Link to="/map" onClick={() => setMobileOpen(false)} style={{ ...navLinkStyle, padding: '0.75rem 0', borderBottom: '1px solid rgba(245,240,232,0.06)' }}>Map</Link>
          <Link to="/problem" onClick={() => setMobileOpen(false)} style={{ ...navLinkStyle, padding: '0.75rem 0', borderBottom: '1px solid rgba(245,240,232,0.06)' }}>Our Mission</Link>
          <Link to="/for-clinics" onClick={() => setMobileOpen(false)} style={{ ...navLinkStyle, padding: '0.75rem 0', borderBottom: '1px solid rgba(245,240,232,0.06)' }}>For Clinics</Link>
          <Link to="/historias" onClick={() => setMobileOpen(false)} style={{ ...navLinkStyle, padding: '0.75rem 0', borderBottom: '1px solid rgba(245,240,232,0.06)' }}>Historias</Link>
          <Link to="/patient-signup" onClick={() => setMobileOpen(false)} className="mb-btn mb-btn-secondary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.95rem', marginTop: '0.75rem', textAlign: 'center', justifyContent: 'center' }}>Get Started</Link>
        </div>
      )}

      {/* Responsive CSS injected inline */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-toggle { display: block !important; }
          .nav-mobile-menu { display: flex !important; }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
