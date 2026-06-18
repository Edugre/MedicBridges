import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useSearchModal } from '../context/SearchModalContext';

const navLinkStyle = {
  fontSize: '15px',
  fontWeight: 500,
  color: 'var(--mb-text-secondary)',
  transition: 'color 0.2s',
};

const disabledBtnStyle = {
  opacity: 0.55,
  cursor: 'not-allowed',
};

const NAV_LINKS = [
  { to: '/search', label: 'Find Care' },
  { to: '/map', label: 'Map' },
  { to: '/problem', label: 'Our Mission' },
  { to: '/for-clinics', label: 'For Clinics' },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openModal } = useSearchModal();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(251,247,240,0.86)',
        backdropFilter: 'saturate(1.3) blur(10px)',
        WebkitBackdropFilter: 'saturate(1.3) blur(10px)',
        borderBottom: '1px solid var(--mb-border-soft)',
      }}
    >
      <div
        style={{
          maxWidth: '1160px',
          margin: '0 auto',
          minHeight: '74px',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '21px', letterSpacing: '-0.01em', color: 'var(--mb-primary)' }}>
            MedicBridges
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="nav-desktop" style={{ display: 'flex', gap: '34px', alignItems: 'center' }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={navLinkStyle}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mb-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mb-text-secondary)'; }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#F1ECE0', borderRadius: '999px', padding: '3px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mb-text-primary)', background: '#fff', borderRadius: '999px', padding: '4px 12px' }}>EN</span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--mb-text-muted)', padding: '4px 12px', cursor: 'pointer' }}>ES</span>
          </div>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="mb-btn mb-btn-outline"
            style={{ height: '42px', padding: '0 18px', borderRadius: '11px', fontSize: '15px', fontWeight: 500, ...disabledBtnStyle }}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={openModal}
            className="mb-btn mb-btn-primary"
            style={{ height: '42px', padding: '0 21px', borderRadius: '11px', fontSize: '15px', fontWeight: 500 }}
          >
            Find care
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--mb-text-primary)',
            cursor: 'pointer',
            padding: '0.25rem',
          }}
        >
          {mobileOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div
          className="nav-mobile-menu"
          style={{
            display: 'none',
            flexDirection: 'column',
            gap: '0.25rem',
            padding: '0 2rem 1.5rem',
            background: 'rgba(251,247,240,0.96)',
            borderTop: '1px solid var(--mb-border-soft)',
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              style={{ ...navLinkStyle, padding: '0.85rem 0', borderBottom: '1px solid var(--mb-border-soft)' }}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            disabled
            title="Coming soon"
            className="mb-btn mb-btn-outline"
            style={{ marginTop: '0.75rem', fontSize: '15px', fontWeight: 500, ...disabledBtnStyle }}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => { setMobileOpen(false); openModal(); }}
            className="mb-btn mb-btn-primary"
            style={{ marginTop: '0.75rem', fontSize: '15px', fontWeight: 500 }}
          >
            Find care
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 880px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-toggle { display: block !important; }
          .nav-mobile-menu { display: flex !important; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
