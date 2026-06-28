import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Phone, Globe, ArrowLeft, Check, ExternalLink, Pill, AlertCircle, Building2 } from 'lucide-react';
import { getOrganization } from '../../api';
import { formatAddress, formatDistance, humanizeCategory } from '../../lib/format';

const Clinic = () => {
  const { id } = useParams();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    getOrganization(id, { signal: controller.signal })
      .then((data) => setOrg(data))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(
          err.code === 'not_found'
            ? 'This clinic could not be found.'
            : err.message || 'Could not load this clinic.'
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  const sites = org?.sites || [];
  const primary = sites[0];
  const pharmacies = org?.contract_pharmacies || [];
  const allCategories = [...new Set(sites.flatMap((s) => s.service_categories || []))];
  const slidingScale = sites.some((s) => s.accepts_sliding_scale);

  return (
    <div className="page-container" style={{ padding: '3rem 2rem', maxWidth: '1200px', animation: 'fadeIn 0.6s ease-out' }}>
      <Link to="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
        <ArrowLeft size={18} /> Back to search results
      </Link>

      {loading && (
        <div className="mb-bento-card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--mb-text-muted)' }}>
          Loading clinic details…
        </div>
      )}

      {!loading && error && (
        <div className="mb-bento-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <AlertCircle size={40} color="var(--mb-text-muted)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{error}</h2>
          <Link to="/search" className="mb-btn mb-btn-secondary" style={{ marginTop: '1rem' }}>Back to search</Link>
        </div>
      )}

      {!loading && !error && org && (
        <>
          {/* Clinic Header */}
          <div className="mb-bento-card" style={{ marginBottom: '2rem' }}>
            <div className="clinic-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{primary?.name || org.name || 'Clinic'}</h1>
                {primary && formatAddress(primary) && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-text-secondary)' }}>
                    <MapPin size={16} /> {formatAddress(primary)}
                    {primary.distance_m != null && (
                      <span style={{ color: 'var(--mb-text-muted)' }}>· {formatDistance(primary.distance_m)} away</span>
                    )}
                  </p>
                )}
              </div>
              <div className="clinic-badges" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {org.has_340b && <span style={badge}>340B Meds</span>}
                {slidingScale && <span style={badge}>Sliding Scale</span>}
                {primary?.center_type && <span style={badge}>{primary.center_type}</span>}
              </div>
            </div>
          </div>

          {/* Contact + Services grid */}
          <div className="clinic-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="mb-bento-card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
                <Phone size={20} color="var(--mb-accent)" /> Contact
              </h3>
              {primary?.phone ? (
                <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '0.5rem' }}>
                  <a href={`tel:${primary.phone}`}>{primary.phone}</a>
                </p>
              ) : (
                <p style={{ color: 'var(--mb-text-muted)', marginBottom: '0.5rem' }}>No phone listed</p>
              )}
              {(primary?.website || org.website) && (
                <a href={primary?.website || org.website} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <Globe size={16} /> Visit Website <ExternalLink size={14} />
                </a>
              )}
            </div>

            <div className="mb-bento-card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
                <Building2 size={20} color="var(--mb-accent)" /> Organization
              </h3>
              <p style={{ color: 'var(--mb-text-secondary)' }}>{org.name || '—'}</p>
              {org.grant_number && (
                <p style={{ color: 'var(--mb-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Grant #{org.grant_number}</p>
              )}
            </div>
          </div>

          {/* Services */}
          {allCategories.length > 0 && (
            <div className="mb-bento-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Services Offered</h3>
              <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {allCategories.map((service) => (
                  <div key={service} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-text-secondary)' }}>
                    <Check size={16} color="var(--mb-accent)" /> {humanizeCategory(service)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other locations */}
          {sites.length > 1 && (
            <div className="mb-bento-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>All Locations ({sites.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sites.map((s) => (
                  <div key={s.site_id} style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--mb-border)' }}>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div style={{ color: 'var(--mb-text-secondary)', fontSize: '0.9rem' }}>{formatAddress(s)}</div>
                    {s.phone && <div style={{ color: 'var(--mb-text-muted)', fontSize: '0.9rem' }}>{s.phone}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 340B Pharmacies */}
          {pharmacies.length > 0 && (
            <div className="mb-bento-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1.5rem' }}>
                <Pill size={20} color="var(--mb-accent)" /> 340B Contract Pharmacies ({pharmacies.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pharmacies.map((p) => (
                  <div key={p.pharmacy_id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--mb-border)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ color: 'var(--mb-text-secondary)', fontSize: '0.9rem' }}>{formatAddress(p)}</div>
                    </div>
                    {p.distance_m != null && (
                      <span style={{ color: 'var(--mb-text-muted)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{formatDistance(p.distance_m)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .clinic-info-grid { grid-template-columns: 1fr !important; }
          .clinic-header { flex-direction: column !important; }
          .services-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

const badge = {
  background: 'var(--mb-lime-soft)',
  color: 'var(--mb-accent)',
  padding: '0.35rem 0.85rem',
  borderRadius: 'var(--mb-radius-pill)',
  fontSize: '0.85rem',
};

export default Clinic;
