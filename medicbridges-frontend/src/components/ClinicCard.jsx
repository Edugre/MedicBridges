import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Pill, Navigation } from 'lucide-react';
import { formatAddress, formatDistance, humanizeCategory, directionsUrl } from '../lib/format';
import { useLang } from '../context/LangContext';

const CONTENT = {
  en: { clinic: 'Clinic', meds340b: '340B meds', slidingScale: 'Sliding scale', call: 'Call', directions: 'Directions' },
  es: { clinic: 'Clínica', meds340b: 'Medicamentos 340B', slidingScale: 'Escala móvil', call: 'Llamar', directions: 'Indicaciones' },
};

const badgeBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 9px',
  borderRadius: 'var(--mb-radius-pill)',
  fontSize: '11.5px',
  fontWeight: 600,
};

const actionBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '5px',
  flex: 1,
  padding: '8px 12px',
  borderRadius: '10px',
  fontSize: '12.5px',
  fontWeight: 600,
  textDecoration: 'none',
  cursor: 'pointer',
};

/**
 * Dense clinic (site) result card for the map-first search drawer.
 * The body navigates to the organization detail page; Call / Directions
 * are independent actions. `selected` mirrors the hovered/selected map pin.
 */
const ClinicCard = ({ org, site, selected = false, onMouseEnter, onMouseLeave, width }) => {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = CONTENT[lang];
  const distance = formatDistance(site.distance_m ?? org.distance_m);
  const address = formatAddress(site);
  const categories = (site.service_categories || []).slice(0, 4);
  const directions = directionsUrl(site);

  const openDetail = () => navigate(`/clinic/${encodeURIComponent(org.org_id)}`);

  return (
    <div
      className="mb-clinic-card-v2"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail();
        }
      }}
      role="button"
      tabIndex={0}
      style={{
        background: '#fff',
        border: '1px solid var(--mb-border)',
        borderRadius: '16px',
        padding: '14px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        cursor: 'pointer',
        outline: selected ? '2px solid var(--mb-honey)' : '2px solid transparent',
        outlineOffset: '-1px',
        flexShrink: width ? 0 : undefined,
        width: width || undefined,
        transition: 'outline-color 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '15.5px',
              fontWeight: 600,
              color: 'var(--mb-text-primary)',
              lineHeight: 1.25,
              ...(width ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : null),
            }}
          >
            {site.name || org.name || t.clinic}
          </div>
          {address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--mb-text-secondary)', fontSize: '12.5px', marginTop: '3px' }}>
              <MapPin size={13} style={{ flexShrink: 0 }} /> <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</span>
            </div>
          )}
        </div>
        {distance && (
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mb-primary)', whiteSpace: 'nowrap' }}>
            {distance}
          </div>
        )}
      </div>

      {/* Badge row */}
      {(org.has_340b || site.accepts_sliding_scale || categories.length > 0) && (
        <div style={{ display: 'flex', flexWrap: width ? 'nowrap' : 'wrap', gap: '6px', overflow: width ? 'hidden' : undefined }}>
          {org.has_340b && (
            <span style={{ ...badgeBase, background: 'var(--mb-honey-soft)', color: '#B87814', border: '1px solid #F2E0C2' }}>
              <Pill size={11} /> {t.meds340b}
            </span>
          )}
          {site.accepts_sliding_scale && (
            <span style={{ ...badgeBase, background: 'var(--mb-bg-sage)', color: 'var(--mb-primary)' }}>
              {t.slidingScale}
            </span>
          )}
          {categories.map((c) => (
            <span key={c} style={{ ...badgeBase, background: 'var(--mb-bg-surface-hover)', color: 'var(--mb-text-secondary)' }}>
              {humanizeCategory(c)}
            </span>
          ))}
        </div>
      )}

      {/* Actions row */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
        <a
          href={site.phone ? `tel:${site.phone}` : undefined}
          onClick={(e) => e.stopPropagation()}
          aria-disabled={!site.phone}
          style={{
            ...actionBase,
            border: '1px solid var(--mb-border)',
            background: '#fff',
            color: 'var(--mb-text-primary)',
            opacity: site.phone ? 1 : 0.5,
            pointerEvents: site.phone ? 'auto' : 'none',
          }}
        >
          <Phone size={13} /> {t.call}
        </a>
        <a
          href={directions || undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-disabled={!directions}
          style={{
            ...actionBase,
            border: 'none',
            background: 'var(--mb-primary)',
            color: '#fff',
            opacity: directions ? 1 : 0.5,
            pointerEvents: directions ? 'auto' : 'none',
          }}
        >
          <Navigation size={13} /> {t.directions}
        </a>
      </div>
    </div>
  );
};

export default ClinicCard;
