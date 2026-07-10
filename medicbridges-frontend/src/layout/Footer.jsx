import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';

const CONTENT = {
  en: {
    brandDesc: "Helping people find low-cost clinics and affordable medicine in Miami-Dade, no matter their situation.",
    forPatients: "For Patients",
    findCare: "Find Care",
    clinicMap: "Clinic Map",
    createProfile: "Create Profile",
    forClinics: "For Clinics",
    whyMb: "Why MedicBridges",
    regClinic: "Register Your Clinic",
    about: "About",
    privacyLink: "Privacy & your data",
    mission: "Our Mission",
    disclaimer: "MedicBridges is a free information service and not a healthcare provider. Always confirm services, hours, and costs directly with the location. A non-commercial FIU student research project.",
    privacyBtn: "Privacy Notice",
    copyright: "© 2026 MedicBridges — Miami, FL"
  },
  es: {
    brandDesc: "Ayudando a las personas a encontrar clínicas de bajo costo y medicamentos asequibles en Miami-Dade, sin importar su situación.",
    forPatients: "Para Pacientes",
    findCare: "Encontrar Atención",
    clinicMap: "Mapa de Clínicas",
    createProfile: "Crear Perfil",
    forClinics: "Para Clínicas",
    whyMb: "Por Qué MedicBridges",
    regClinic: "Registre su Clínica",
    about: "Acerca de",
    privacyLink: "Privacidad y sus datos",
    mission: "Nuestra Misión",
    disclaimer: "MedicBridges es un servicio de información gratuito y no un proveedor de atención médica. Confirme siempre los servicios, horarios y costos directamente con la ubicación. Un proyecto de investigación estudiantil no comercial de FIU.",
    privacyBtn: "Aviso de Privacidad",
    copyright: "© 2026 MedicBridges — Miami, FL"
  }
};

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
  const { lang } = useLang();
  const t = CONTENT[lang];

  return (
    <footer style={{ marginTop: 'auto', background: 'var(--mb-bg-primary)' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '64px 32px 72px' }}>
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
              {t.brandDesc}
            </p>
          </div>

          {/* For Patients */}
          <div>
            <div style={footerHeadingStyle}>{t.forPatients}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <FooterLink to="/search">{t.findCare}</FooterLink>
              <FooterLink to="/map">{t.clinicMap}</FooterLink>
              <FooterLink to="/patient-signup">{t.createProfile}</FooterLink>
            </div>
          </div>

          {/* For Clinics */}
          <div>
            <div style={footerHeadingStyle}>{t.forClinics}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <FooterLink to="/for-clinics">{t.whyMb}</FooterLink>
              <FooterLink to="/clinic-signup">{t.regClinic}</FooterLink>
            </div>
          </div>

          {/* About */}
          <div>
            <div style={footerHeadingStyle}>{t.about}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <FooterLink to="/privacy">{t.privacyLink}</FooterLink>
              <FooterLink to="/problem">{t.mission}</FooterLink>
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
          <div style={{ flex: 1, maxWidth: '800px' }}>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--mb-text-disabled)', margin: '0 0 16px 0' }}>
              {t.disclaimer}
            </p>

          </div>
          <div style={{ fontSize: '13px', color: 'var(--mb-text-disabled)' }}>{t.copyright}</div>
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
