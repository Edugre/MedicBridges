import { Link, useParams, useLocation } from 'react-router-dom';
import { Compass, Globe, Search, Home, ArrowLeft, Phone } from 'lucide-react';
import { useLang } from '../../context/LangContext';

const CONTENT = {
  en: {
    genericEyebrow: 'Error 404',
    genericTitle: 'We can’t find that page',
    genericMessage: 'The page you’re looking for may have moved, or the link might be broken. Let’s get you back to finding care.',
    websiteEyebrow: 'Website unavailable',
    websiteTitle: 'This clinic doesn’t have a website yet',
    websiteMessage: (name) => `${name ? `${name} hasn’t` : 'This clinic hasn’t'} added a website. You can still reach them by phone or get directions from their profile.`,
    backToClinic: 'Back to clinic',
    searchOthers: 'Search other clinics',
    findCare: 'Find care near you',
    goHome: 'Go home',
    phoneNote: 'Their phone number and directions are on the clinic page.',
  },
  es: {
    genericEyebrow: 'Error 404',
    genericTitle: 'No encontramos esa página',
    genericMessage: 'Es posible que la página que buscas se haya movido o que el enlace esté roto. Volvamos a ayudarte a encontrar atención.',
    websiteEyebrow: 'Sitio web no disponible',
    websiteTitle: 'Esta clínica aún no tiene sitio web',
    websiteMessage: (name) => `${name ? `${name} aún no ha` : 'Esta clínica aún no ha'} agregado un sitio web. Aún puedes comunicarte por teléfono u obtener indicaciones desde su perfil.`,
    backToClinic: 'Volver a la clínica',
    searchOthers: 'Buscar otras clínicas',
    findCare: 'Encuentra atención cerca de ti',
    goHome: 'Ir al inicio',
    phoneNote: 'Su número de teléfono y las indicaciones están en la página de la clínica.',
  },
};

/**
 * Branded not-found page, served at /404.
 *  - variant="generic" (default): unknown routes and invalid/missing clinics
 *    (both redirect here).
 *  - variant="website": a clinic that has no website. Links back to the
 *    clinic profile, where phone / directions are still available.
 */
const NotFound = ({ variant = 'generic' }) => {
  const { id } = useParams();
  const { state } = useLocation();
  const clinicName = state?.clinicName;
  const { lang } = useLang();
  const t = CONTENT[lang];

  const config = {
    generic: {
      Icon: Compass,
      eyebrow: t.genericEyebrow,
      showCode: true,
      title: t.genericTitle,
      message: t.genericMessage,
    },
    website: {
      Icon: Globe,
      eyebrow: t.websiteEyebrow,
      showCode: false,
      title: t.websiteTitle,
      message: t.websiteMessage(clinicName),
    },
  }[variant] || {};

  const { Icon, eyebrow, showCode, title, message } = config;

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 74px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px 64px',
        animation: 'fadeIn 0.5s ease-out',
      }}
    >
      {/* Decorative badge */}
      <div
        style={{
          position: 'relative',
          width: '104px',
          height: '104px',
          borderRadius: '50%',
          background: 'var(--mb-bg-sage)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '26px',
        }}
      >
        <Icon size={44} color="var(--mb-primary)" strokeWidth={1.75} />
        {variant === 'website' && (
          // Diagonal slash to read as "no website".
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '92px',
              height: '3px',
              borderRadius: '999px',
              background: 'var(--mb-honey)',
              boxShadow: '0 0 0 3px var(--mb-bg-sage)',
              transform: 'rotate(-45deg)',
            }}
          />
        )}
      </div>

      {showCode && (
        <div
          style={{
            fontSize: 'clamp(64px, 14vw, 92px)',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: 'var(--mb-primary)',
            marginBottom: '14px',
          }}
        >
          404
        </div>
      )}

      <div
        style={{
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--mb-text-muted)',
          marginBottom: '10px',
        }}
      >
        {eyebrow}
      </div>

      <h1
        style={{
          fontSize: 'clamp(22px, 4vw, 28px)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--mb-text-heading)',
          margin: '0 0 12px',
          maxWidth: '460px',
        }}
      >
        {title}
      </h1>

      <p
        style={{
          fontSize: '15px',
          lineHeight: 1.6,
          color: 'var(--mb-text-secondary)',
          margin: '0 0 28px',
          maxWidth: '440px',
        }}
      >
        {message}
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {variant === 'website' ? (
          <>
            <Link to={`/clinic/${id}`} className="mb-btn mb-btn-lime" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={16} /> {t.backToClinic}
            </Link>
            <Link to="/search" className="mb-btn mb-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} /> {t.searchOthers}
            </Link>
          </>
        ) : (
          <>
            <Link to="/search" className="mb-btn mb-btn-lime" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} /> {t.findCare}
            </Link>
            <Link to="/" className="mb-btn mb-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Home size={16} /> {t.goHome}
            </Link>
          </>
        )}
      </div>

      {variant === 'website' && (
        <p
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            marginTop: '20px',
            fontSize: '13px',
            color: 'var(--mb-text-muted)',
          }}
        >
          <Phone size={14} /> {t.phoneNote}
        </p>
      )}
    </div>
  );
};

export default NotFound;
