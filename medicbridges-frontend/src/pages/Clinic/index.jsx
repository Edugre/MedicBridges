import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MapPin, Phone, Globe, ArrowLeft, Check, ExternalLink, Pill,
  AlertCircle, Building2, Send, Bookmark, ChevronDown,
} from 'lucide-react';
import { getOrganization } from '../../api';
import { formatAddress, formatDistance, humanizeCategory, directionsUrl } from '../../lib/format';

const Clinic = () => {
  const { id } = useParams();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);

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
  const allCategories = [...new Set(sites.flatMap((s) => s.service_categories || []))];
  const slidingScale = sites.some((s) => s.accepts_sliding_scale);
  const website = primary?.website || org?.website;
  const address = primary && formatAddress(primary);
  const directions = primary && directionsUrl(primary);

  return (
    <div className="clinic-page" style={{ maxWidth: '1180px', margin: '0 auto', padding: '26px 34px 38px', animation: 'fadeIn 0.6s ease-out' }}>
      <Link to="/search" className="clinic-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: 'var(--mb-text-secondary)', fontSize: '13.5px', fontWeight: 500, marginBottom: '18px' }}>
        <ArrowLeft size={17} /> Back to search results
      </Link>

      {loading && (
        <div className="dcard" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--mb-text-muted)' }}>
          Loading clinic details…
        </div>
      )}

      {!loading && error && (
        <div className="dcard" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <AlertCircle size={40} color="var(--mb-text-muted)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{error}</h2>
          <Link to="/search" className="mb-btn mb-btn-secondary" style={{ marginTop: '1rem' }}>Back to search</Link>
        </div>
      )}

      {!loading && !error && org && (
        <>
          {/* ---------- Hero ---------- */}
          <div className="dcard clinic-hero" style={{ padding: 0, overflow: 'hidden', display: 'flex', marginBottom: '22px' }}>
            <div className="clinic-hero-body" style={{ flex: 1, minWidth: 0, padding: '26px 28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '12px' }}>
                {org.has_340b && (
                  <span className="badge b-honey"><Pill size={12} /> 340B meds</span>
                )}
                {slidingScale && <span className="badge b-sage">Sliding scale</span>}
                {primary?.center_type && <span className="badge b-neu">{primary.center_type}</span>}
              </div>

              <h1 style={{ fontSize: '29px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '8px' }}>
                {primary?.name || org.name || 'Clinic'}
              </h1>

              {address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--mb-text-secondary)', fontSize: '14.5px' }}>
                  <MapPin size={16} color="var(--mb-primary)" style={{ flexShrink: 0 }} />
                  <span>{address}
                    {primary.distance_m != null && (
                      <span style={{ color: 'var(--mb-text-muted)' }}> · {formatDistance(primary.distance_m)} away</span>
                    )}
                  </span>
                </div>
              )}

              <div className="clinic-actions" style={{ display: 'flex', gap: '10px', marginTop: '22px', flexWrap: 'wrap' }}>
                {directions && (
                  <a className="abtn teal" href={directions} target="_blank" rel="noreferrer">
                    <Send size={15} /> Get directions
                  </a>
                )}
                {primary?.phone && (
                  <a className="abtn" href={`tel:${primary.phone}`}>
                    <Phone size={15} /> {primary.phone}
                  </a>
                )}
                {website && (
                  <a className="abtn" href={website} target="_blank" rel="noreferrer">
                    <Globe size={15} /> Website
                  </a>
                )}
                <button
                  type="button"
                  className="abtn"
                  aria-pressed={saved}
                  aria-label={saved ? 'Saved' : 'Save clinic'}
                  onClick={() => setSaved((s) => !s)}
                  style={{ width: '44px', padding: 0, color: saved ? 'var(--mb-primary)' : undefined }}
                >
                  <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            {/* Location snapshot (decorative placeholder) */}
            <div className="clinic-map mapmini" aria-hidden="true">
              <div style={{ position: 'absolute', right: '-40px', top: '-30px', width: '240px', height: '280px', background: '#D3E6E2', borderRadius: '44% 52% 46% 56%', transform: 'rotate(14deg)' }} />
              <div style={{ position: 'absolute', left: '20px', bottom: '30px', width: '140px', height: '100px', background: '#DEE8CB', borderRadius: '22px' }} />
              <div className="road-h" style={{ top: '34%' }} />
              <div className="road-v" style={{ left: '52%' }} />
              <div className="pin" style={{ left: '52%', top: '44%' }}><MapPin size={12} /> You&apos;re here</div>
            </div>
          </div>

          {/* ---------- Two-column body ---------- */}
          <div className="clinic-body" style={{ display: 'flex', gap: '22px', alignItems: 'flex-start' }}>
            {/* Main column */}
            <div className="clinic-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {allCategories.length > 0 && (
                <div className="dcard">
                  <div className="sech">Services offered</div>
                  <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 28px' }}>
                    {allCategories.map((service) => (
                      <div key={service} className="svc">
                        <span className="tick"><Check size={12} strokeWidth={3} /></span>
                        {humanizeCategory(service)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="dcard">
                <div className="sech"><Building2 size={18} color="var(--mb-primary)" /> About the organization</div>
                <p style={{ fontSize: '14.5px', lineHeight: 1.6, color: 'var(--mb-text-secondary)' }}>
                  Operated by <strong style={{ color: 'var(--mb-text-primary)' }}>{org.name || '—'}</strong>.
                </p>
                {org.grant_number && (
                  <div style={{ display: 'flex', gap: '28px', marginTop: '16px', fontSize: '13px', color: 'var(--mb-text-muted)' }}>
                    <span>HRSA Grant #{org.grant_number}</span>
                  </div>
                )}
              </div>

              {sites.length > 1 && (
                <div className="dcard">
                  <button
                    type="button"
                    className="sech loc-toggle"
                    aria-expanded={locationsOpen}
                    onClick={() => setLocationsOpen((o) => !o)}
                    style={{ marginBottom: locationsOpen ? '16px' : 0 }}
                  >
                    <MapPin size={18} color="var(--mb-primary)" />
                    <span style={{ flex: 1, textAlign: 'left' }}>Other locations ({sites.length})</span>
                    <ChevronDown size={18} className="loc-chevron" style={{ transform: locationsOpen ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  {locationsOpen && sites.map((s) => (
                    <div key={s.site_id} className="loc">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14.5px' }}>{s.name}</div>
                        <div style={{ color: 'var(--mb-text-secondary)', fontSize: '13.5px', marginTop: '2px' }}>
                          {[formatAddress(s), s.phone].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {s.distance_m != null && (
                        <div style={{ color: 'var(--mb-primary)', fontWeight: 600, fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                          {formatDistance(s.distance_m)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right rail */}
            <div className="clinic-rail" style={{ width: '330px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {(slidingScale || org.has_340b) && (
                <div className="dcard glance-card">
                  <div className="sech">At a glance</div>
                  {slidingScale && (
                    <div className="glance"><span style={{ color: '#3B4642' }}>Sliding-scale fees</span><span className="yes"><Check size={15} strokeWidth={3} /> Yes</span></div>
                  )}
                  {org.has_340b && (
                    <div className="glance"><span style={{ color: '#3B4642' }}>On-site 340B pharmacy</span><span className="yes"><Check size={15} strokeWidth={3} /> Yes</span></div>
                  )}
                </div>
              )}

              {(primary?.phone || website || address) && (
                <div className="dcard">
                  <div className="sech">Contact</div>
                  {primary?.phone && (
                    <a className="kv" href={`tel:${primary.phone}`}>
                      <span className="ic"><Phone size={17} /></span>
                      <div><div className="lab">Phone</div><div className="val">{primary.phone}</div></div>
                    </a>
                  )}
                  {website && (
                    <a className="kv" href={website} target="_blank" rel="noreferrer">
                      <span className="ic"><Globe size={17} /></span>
                      <div>
                        <div className="lab">Website</div>
                        <div className="val" style={{ color: 'var(--mb-primary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} <ExternalLink size={13} />
                        </div>
                      </div>
                    </a>
                  )}
                  {address && (
                    <div className="kv">
                      <span className="ic"><MapPin size={17} /></span>
                      <div><div className="lab">Address</div><div className="val">{address}</div></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .clinic-back:hover { color: var(--mb-primary); }
        .dcard {
          background: var(--mb-bg-surface);
          border: 1px solid var(--mb-border);
          border-radius: 18px;
          padding: 22px 24px;
        }
        .sech {
          font-size: 16px; font-weight: 600; color: var(--mb-text-primary);
          letter-spacing: -0.01em; display: flex; align-items: center; gap: 8px;
          margin-bottom: 16px;
        }
        .badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 11px; border-radius: 999px; font-size: 12px; font-weight: 600;
        }
        .b-honey { background: var(--mb-honey-soft); color: #B87814; border: 1px solid #F2E0C2; }
        .b-sage { background: var(--mb-lime-soft); color: var(--mb-primary); }
        .b-neu { background: #F4F1EA; color: var(--mb-text-secondary); }
        .abtn {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          height: 44px; padding: 0 18px; border-radius: 12px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          border: 1px solid var(--mb-border); background: var(--mb-bg-surface);
          color: var(--mb-text-primary); text-decoration: none;
        }
        .abtn:hover { background: var(--mb-bg-surface-hover); color: var(--mb-text-primary); }
        .abtn.teal { background: var(--mb-primary); border-color: var(--mb-primary); color: #fff; }
        .abtn.teal:hover { background: var(--mb-primary-hover); color: #fff; }
        .svc {
          display: flex; align-items: center; gap: 9px;
          font-size: 14px; color: #3B4642; padding: 9px 0;
        }
        .svc .tick {
          width: 22px; height: 22px; border-radius: 7px;
          background: var(--mb-lime-soft); color: var(--mb-primary);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .kv {
          display: flex; align-items: flex-start; gap: 11px;
          padding: 11px 0; border-bottom: 1px solid #F1ECE1; text-decoration: none;
        }
        .kv:last-child { border-bottom: none; }
        .kv .ic { color: var(--mb-primary); flex-shrink: 0; margin-top: 1px; }
        .kv .lab {
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em;
          text-transform: uppercase; color: var(--mb-text-muted); margin-bottom: 2px;
        }
        .kv .val { font-size: 14px; font-weight: 500; color: var(--mb-text-primary); line-height: 1.4; }
        .loc-toggle {
          width: 100%; background: none; border: none; padding: 0;
          cursor: pointer; font: inherit;
        }
        .loc-toggle .loc-chevron { color: var(--mb-text-muted); transition: transform 0.2s ease; flex-shrink: 0; }
        .loc-toggle:hover .loc-chevron { color: var(--mb-primary); }
        .loc {
          display: flex; justify-content: space-between; gap: 14px;
          padding: 14px 0; border-bottom: 1px solid #F1ECE1;
        }
        .loc:last-child { border-bottom: none; padding-bottom: 0; }
        .glance-card { background: var(--mb-lime-soft); border-color: #CDEDE1; }
        .glance {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid #D3E9E0; font-size: 13.5px;
        }
        .glance:last-child { border-bottom: none; }
        .yes { color: var(--mb-primary); font-weight: 700; display: inline-flex; align-items: center; gap: 5px; }
        .mapmini {
          position: relative; background: #E7E2D7; overflow: hidden;
          width: 360px; flex-shrink: 0;
        }
        .mapmini .road-h { position: absolute; left: -6%; right: -6%; height: 8px; background: #F6F2EA; }
        .mapmini .road-v { position: absolute; top: -6%; bottom: -6%; width: 8px; background: #F6F2EA; }
        .mapmini .pin {
          position: absolute; transform: translate(-50%, -100%);
          background: var(--mb-honey); color: #3a2403; padding: 5px 10px;
          border-radius: 999px; font-size: 11.5px; font-weight: 700;
          box-shadow: 0 8px 22px rgba(239,159,39,.45); border: 2px solid #fff;
          white-space: nowrap; display: flex; align-items: center; gap: 4px;
        }
        @media (max-width: 768px) {
          .clinic-page { padding: 16px 15px 26px; }
          .clinic-hero { flex-direction: column; }
          .clinic-hero-body { order: 2; padding: 16px 15px 4px; }
          .clinic-map { order: 1; width: 100% !important; height: 170px; }
          .clinic-actions .abtn { flex: 1; }
          .clinic-body { flex-direction: column; }
          .clinic-rail { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Clinic;
