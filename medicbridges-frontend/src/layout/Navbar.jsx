import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Menu, X } from 'lucide-react';

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '1rem 2rem',
      backgroundColor: 'var(--mb-bg-surface)',
      borderBottom: '1px solid var(--mb-border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.25rem', color: 'var(--mb-text-primary)' }}>
        <div style={{ background: 'var(--mb-primary)', color: 'white', padding: '0.35rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stethoscope size={22} />
        </div>
        MedicBridges
      </Link>
      
      {/* Desktop Navigation */}
      <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }}>
        <Link to="/search" style={{ fontWeight: 500, color: 'var(--mb-text-secondary)', transition: 'color 0.2s' }}>Find Care</Link>
        <Link to="/map" style={{ fontWeight: 500, color: 'var(--mb-text-secondary)', transition: 'color 0.2s' }}>Map</Link>
        <Link to="/problem" style={{ fontWeight: 500, color: 'var(--mb-text-secondary)', transition: 'color 0.2s' }}>Our Mission</Link>
        <Link to="/for-clinics" style={{ fontWeight: 500, color: 'var(--mb-text-secondary)', transition: 'color 0.2s' }}>For Clinics</Link>
        <Link to="/historias" style={{ fontWeight: 500, color: 'var(--mb-text-secondary)', transition: 'color 0.2s' }}>Historias</Link>
        <Link to="/patient-signup" className="mb-btn mb-btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.95rem' }}>Get Started</Link>
      </div>
    </nav>
  );
};

export default Navbar;
