import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Pill, ChevronRight } from 'lucide-react';
import { formatAddress, formatDistance, humanizeCategory } from '../lib/format';

/**
 * One clinic (site) result, rendered with its parent organization context.
 * Links to the organization detail page.
 */
const ClinicCard = ({ org, site }) => {
  const distance = formatDistance(site.distance_m ?? org.distance_m);
  const address = formatAddress(site);
  const categories = (site.service_categories || []).slice(0, 4);

  return (
    <Link
      to={`/clinic/${encodeURIComponent(org.org_id)}`}
      className="mb-bento-card mb-clinic-card"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="mb-clinic-card-title" style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>
            {site.name || org.name || 'Clinic'}
          </h3>
          {org.name && site.name && org.name !== site.name && (
            <div style={{ color: 'var(--mb-text-muted)', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              {org.name}
            </div>
          )}
          {address && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--mb-text-secondary)', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
              <MapPin size={15} /> {address}
            </p>
          )}
          {site.phone && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>
              <Phone size={15} /> {site.phone}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
          {distance && (
            <span style={{ fontSize: '0.9rem', color: 'var(--mb-text-heading)', whiteSpace: 'nowrap' }}>
              {distance}
            </span>
          )}
          <ChevronRight size={20} color="var(--mb-text-muted)" />
        </div>
      </div>

      {(categories.length > 0 || site.accepts_sliding_scale || org.has_340b) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '1rem' }}>
          {org.has_340b && (
            <span style={badgeStyle}>
              <Pill size={12} style={{ marginRight: '0.25rem' }} /> 340B meds
            </span>
          )}
          {site.accepts_sliding_scale && <span style={badgeStyle}>Sliding scale</span>}
          {categories.map((c) => (
            <span key={c} style={badgeStyle}>{humanizeCategory(c)}</span>
          ))}
        </div>
      )}
    </Link>
  );
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  background: 'var(--mb-lime-soft)',
  color: 'var(--mb-accent)',
  padding: '0.25rem 0.7rem',
  borderRadius: 'var(--mb-radius-pill)',
  fontSize: '0.78rem',
};

export default ClinicCard;
