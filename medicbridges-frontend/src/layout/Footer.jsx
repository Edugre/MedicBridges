import React from 'react';
import { Link } from 'react-router-dom';

const footerLinkStyle = {
  fontSize: '15px',
  color: 'var(--mb-text-secondary)',
  transition: 'color 0.2s',
};

const footerHeadingStyle = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--mb-text-primary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '16px',
};

const FooterLink = ({ to, children }) => (
  <Link
    to={to}
    style={footerLinkStyle}
    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mb-primary)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mb-text-secondary)'; }}
  >
    {children}
  </Link>
);

const Footer = () => {
  return (
    <footer style={{ marginTop: 'auto', background: 'var(--mb-bg-primary)' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '64px 32px 72px' }}>
        <div
          className="footer-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
            gap: '32px',
            paddingBottom: '44px',
            borderBottom: '1px solid var(--mb-border-soft)',
          }}
        >
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontWeight: 600, fontSize: '19px', letterSpacing: '-0.01em', color: 'var(--mb-primary)' }}>
                MedicBridges
              </span>
            </div>
            <p style={{ fontSize: '14.5px', lineHeight: 1.6, color: 'var(--mb-text-muted)', margin: 0, maxWidth: '280px' }}>
              Helping people find low-cost clinics and affordable medicine in Miami-Dade, no matter their situation.
            </p>
          </div>

          {/* For Patients */}
          <div>
            <div style={footerHeadingStyle}>For Patients</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <FooterLink to="/search">Find Care</FooterLink>
              <FooterLink to="/map">Clinic Map</FooterLink>
              <FooterLink to="/patient-signup">Create Profile</FooterLink>
            </div>
          </div>

          {/* For Clinics */}
          <div>
            <div style={footerHeadingStyle}>For Clinics</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <FooterLink to="/for-clinics">Why MedicBridges</FooterLink>
              <FooterLink to="/clinic-signup">Register Your Clinic</FooterLink>
            </div>
          </div>

          {/* About */}
          <div>
            <div style={footerHeadingStyle}>About</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <FooterLink to="/privacy">Privacy &amp; your data</FooterLink>
              <FooterLink to="/problem">Our Mission</FooterLink>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '30px',
            paddingTop: '26px',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--mb-text-disabled)', margin: 0, maxWidth: '620px' }}>
            MedicBridges is a free information service and not a healthcare provider. Always confirm services, hours, and
            costs directly with the location. A non-commercial FIU student research project.
          </p>
          <div style={{ fontSize: '13px', color: 'var(--mb-text-disabled)' }}>© 2026 MedicBridges — Miami, FL</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 2rem !important;
          }
        }
        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
