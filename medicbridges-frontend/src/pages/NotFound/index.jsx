import { Link, useParams, useLocation } from 'react-router-dom';
import { Compass, Globe, Search, Home, ArrowLeft, Phone } from 'lucide-react';

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

  const config = {
    generic: {
      Icon: Compass,
      eyebrow: 'Error 404',
      showCode: true,
      title: 'We can’t find that page',
      message:
        'The page you’re looking for may have moved, or the link might be broken. Let’s get you back to finding care.',
    },
    website: {
      Icon: Globe,
      eyebrow: 'Website unavailable',
      showCode: false,
      title: 'This clinic doesn’t have a website yet',
      message: `${clinicName ? `${clinicName} hasn’t` : 'This clinic hasn’t'} added a website. You can still reach them by phone or get directions from their profile.`,
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
              <ArrowLeft size={16} /> Back to clinic
            </Link>
            <Link to="/search" className="mb-btn mb-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} /> Search other clinics
            </Link>
          </>
        ) : (
          <>
            <Link to="/search" className="mb-btn mb-btn-lime" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} /> Find care near you
            </Link>
            <Link to="/" className="mb-btn mb-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Home size={16} /> Go home
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
          <Phone size={14} /> Their phone number and directions are on the clinic page.
        </p>
      )}
    </div>
  );
};

export default NotFound;
