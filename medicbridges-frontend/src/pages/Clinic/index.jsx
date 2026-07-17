import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  MapPin, Phone, Globe, ArrowLeft, Check, ExternalLink, Pill,
  AlertCircle, Building2, Send, Bookmark, ChevronDown, Flag,
} from 'lucide-react';
import { getOrganization } from '../../api';
import { formatAddress, formatDistance, humanizeCategory, directionsUrl } from '../../lib/format';
import LocationMap from '../../components/LocationMap';
import ReportIssueModal from '../../components/ReportIssueModal';
import { useLang } from '../../context/LangContext';

const CONTENT = {
  en: {
    backToResults: 'Back to search results',
    loading: 'Loading clinic details…',
    loadError: 'We couldn’t load this clinic. Please try again in a moment.',
    backToSearch: 'Back to search',
    meds340b: '340B meds',
    slidingScale: 'Sliding scale',
    clinic: 'Clinic',
    away: (d) => ` · ${d} away`,
    getDirections: 'Get directions',
    directions: 'Directions',
    call: 'Call',
    website: 'Website',
    saved: 'Saved',
    saveClinic: 'Save clinic',
    servicesOffered: 'Services offered',
    aboutOrg: 'About the organization',
    operatedByPre: 'Operated by ',
    operatedByPost: '.',
    hrsaGrant: (n) => `HRSA Grant #${n}`,
    otherLocations: (n) => `Other locations (${n})`,
    atAGlance: 'At a glance',
    slidingScaleFees: 'Sliding-scale fees',
    onSite340b: 'On-site 340B pharmacy',
    yes: 'Yes',
    contact: 'Contact',
    phone: 'Phone',
    address: 'Address',
    reportProblem: 'Report a problem',
  },
  es: {
    backToResults: 'Volver a los resultados',
    loading: 'Cargando detalles de la clínica…',
    loadError: 'No pudimos cargar esta clínica. Inténtalo de nuevo en un momento.',
    backToSearch: 'Volver a la búsqueda',
    meds340b: 'Medicamentos 340B',
    slidingScale: 'Escala móvil',
    clinic: 'Clínica',
    away: (d) => ` · a ${d}`,
    getDirections: 'Obtener indicaciones',
    directions: 'Indicaciones',
    call: 'Llamar',
    website: 'Sitio web',
    saved: 'Guardada',
    saveClinic: 'Guardar clínica',
    servicesOffered: 'Servicios ofrecidos',
    aboutOrg: 'Sobre la organización',
    operatedByPre: 'Operada por ',
    operatedByPost: '.',
    hrsaGrant: (n) => `Subvención HRSA #${n}`,
    otherLocations: (n) => `Otras ubicaciones (${n})`,
    atAGlance: 'De un vistazo',
    slidingScaleFees: 'Tarifas de escala móvil',
    onSite340b: 'Farmacia 340B en el lugar',
    yes: 'Sí',
    contact: 'Contacto',
    phone: 'Teléfono',
    address: 'Dirección',
    reportProblem: 'Reportar un problema',
  },
};

// A missing clinic, a 404, or a malformed id (e.g. not a valid UUID) all mean
// "this clinic doesn't exist" from the user's point of view.
function isNotFound(err) {
  return (
    err.code === 'not_found' ||
    err.status === 404 ||
    err.status === 400 ||
    /not found|invalid input syntax|uuid/i.test(err.message || '')
  );
}

const Clinic = () => {
  const { id } = useParams();
  const { lang } = useLang();
  const t = CONTENT[lang];
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(null);
    setNotFound(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    getOrganization(id, { signal: controller.signal })
      .then((data) => setOrg(data))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (isNotFound(err)) {
          setNotFound(true);
        } else {
          // Never surface raw backend/DB errors to users. Flag the error and
          // render the (localized) message at display time.
          setError(true);
        }
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

  if (!loading && notFound) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div className="clinic-page" style={{ maxWidth: '1180px', margin: '0 auto', padding: '26px 34px 38px', animation: 'fadeIn 0.6s ease-out' }}>
      <Link to="/search" className="clinic-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: 'var(--mb-text-secondary)', fontSize: '13.5px', fontWeight: 500, marginBottom: '18px' }}>
        <ArrowLeft size={17} /> {t.backToResults}
      </Link>

      {loading && (
        <div className="dcard" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--mb-text-muted)' }}>
          {t.loading}
        </div>
      )}

      {!loading && error && (
        <div className="dcard" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <AlertCircle size={40} color="var(--mb-text-muted)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{t.loadError}</h2>
          <Link to="/search" className="mb-btn mb-btn-secondary" style={{ marginTop: '1rem' }}>{t.backToSearch}</Link>
        </div>
      )}

      {!loading && !error && org && (
        <>
          {/* ---------- Hero ---------- */}
          <div className="dcard clinic-hero" style={{ padding: 0, overflow: 'hidden', display: 'flex', marginBottom: '22px' }}>
            <div className="clinic-hero-body" style={{ flex: 1, minWidth: 0, padding: '26px 28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '12px' }}>
                {org.has_340b && (
                  <span className="badge b-honey"><Pill size={12} /> {t.meds340b}</span>
                )}
                {slidingScale && <span className="badge b-sage">{t.slidingScale}</span>}
                {primary?.center_type && <span className="badge b-neu">{primary.center_type}</span>}
              </div>

              <h1 style={{ fontSize: '29px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '8px' }}>
                {primary?.name || org.name || t.clinic}
              </h1>

              {address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--mb-text-secondary)', fontSize: '14.5px' }}>
                  <MapPin size={16} color="var(--mb-primary)" style={{ flexShrink: 0 }} />
                  <span>{address}
                    {primary.distance_m != null && (
                      <span style={{ color: 'var(--mb-text-muted)' }}>{t.away(formatDistance(primary.distance_m))}</span>
                    )}
                  </span>
                </div>
              )}

              <div className="clinic-actions" style={{ display: 'flex', gap: '10px', marginTop: '22px', flexWrap: 'wrap' }}>
                {directions && (
                  <a className="abtn teal abtn-directions" href={directions} target="_blank" rel="noreferrer">
                    <Send size={15} /> <span className="abtn-label-full">{t.getDirections}</span><span className="abtn-label-short">{t.directions}</span>
                  </a>
                )}
                {primary?.phone && (
                  <a className="abtn abtn-call" href={`tel:${primary.phone}`}>
                    <Phone size={15} /> <span className="abtn-label-full">{primary.phone}</span><span className="abtn-label-short">{t.call}</span>
                  </a>
                )}
                {website ? (
                  <a className="abtn abtn-website" href={website} target="_blank" rel="noreferrer">
                    <Globe size={15} /> {t.website}
                  </a>
                ) : (
                  <Link
                    className="abtn abtn-website"
                    to={`/clinic/${id}/no-website`}
                    state={{ clinicName: primary?.name || org.name }}
                  >
                    <Globe size={15} /> {t.website}
                  </Link>
                )}
                <button
                  type="button"
                  className="abtn abtn-save"
                  aria-pressed={saved}
                  aria-label={saved ? t.saved : t.saveClinic}
                  onClick={() => setSaved((s) => !s)}
                  style={{ width: '44px', padding: 0, color: saved ? 'var(--mb-primary)' : undefined }}
                >
                  <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            {/* Location map — expands to a full interactive modal on click */}
            <LocationMap
              latitude={primary?.latitude}
              longitude={primary?.longitude}
              name={primary?.name || org.name}
              address={address}
              directions={directions}
            />
          </div>

          {/* ---------- Two-column body ---------- */}
          <div className="clinic-body" style={{ display: 'flex', gap: '22px', alignItems: 'flex-start' }}>
            {/* Main column */}
            <div className="clinic-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {allCategories.length > 0 && (
                <div className="dcard">
                  <div className="sech">{t.servicesOffered}</div>
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
                <div className="sech"><Building2 size={18} color="var(--mb-primary)" /> {t.aboutOrg}</div>
                <p style={{ fontSize: '14.5px', lineHeight: 1.6, color: 'var(--mb-text-secondary)' }}>
                  {t.operatedByPre}<strong style={{ color: 'var(--mb-text-primary)' }}>{org.name || '—'}</strong>{t.operatedByPost}
                </p>
                {org.grant_number && (
                  <div style={{ display: 'flex', gap: '28px', marginTop: '16px', fontSize: '13px', color: 'var(--mb-text-muted)' }}>
                    <span>{t.hrsaGrant(org.grant_number)}</span>
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
                    <span style={{ flex: 1, textAlign: 'left' }}>{t.otherLocations(sites.length)}</span>
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
                  <div className="sech">{t.atAGlance}</div>
                  {slidingScale && (
                    <div className="glance"><span style={{ color: '#3B4642' }}>{t.slidingScaleFees}</span><span className="yes"><Check size={15} strokeWidth={3} /> {t.yes}</span></div>
                  )}
                  {org.has_340b && (
                    <div className="glance"><span style={{ color: '#3B4642' }}>{t.onSite340b}</span><span className="yes"><Check size={15} strokeWidth={3} /> {t.yes}</span></div>
                  )}
                </div>
              )}

              {(primary?.phone || website || address) && (
                <div className="dcard">
                  <div className="sech">{t.contact}</div>
                  {primary?.phone && (
                    <a className="kv" href={`tel:${primary.phone}`}>
                      <span className="ic"><Phone size={17} /></span>
                      <div><div className="lab">{t.phone}</div><div className="val">{primary.phone}</div></div>
                    </a>
                  )}
                  {website && (
                    <a className="kv" href={website} target="_blank" rel="noreferrer">
                      <span className="ic"><Globe size={17} /></span>
                      <div>
                        <div className="lab">{t.website}</div>
                        <div className="val" style={{ color: 'var(--mb-primary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} <ExternalLink size={13} />
                        </div>
                      </div>
                    </a>
                  )}
                  {address && (
                    <div className="kv">
                      <span className="ic"><MapPin size={17} /></span>
                      <div><div className="lab">{t.address}</div><div className="val">{address}</div></div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                className="report-problem"
                onClick={() => setReportOpen(true)}
              >
                <Flag size={16} /> {t.reportProblem}
              </button>
            </div>
          </div>

          <ReportIssueModal
            isOpen={reportOpen}
            onClose={() => setReportOpen(false)}
            clinicName={primary?.name || org.name}
            current={{
              phone: primary?.phone,
              address,
              website,
            }}
          />
        </>
      )}

      <style>{`
        .clinic-back:hover { color: var(--mb-primary); }
        .report-problem {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          width: 100%; padding: 11px 14px; border-radius: 12px;
          border: 1px solid var(--mb-border); background: var(--mb-bg-surface);
          color: var(--mb-text-secondary); font: inherit; font-size: 13.5px; font-weight: 600;
          cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .report-problem:hover:not(:disabled) { background: var(--mb-bg-surface-hover); color: var(--mb-text-primary); }
        .report-problem:disabled { opacity: 0.55; cursor: not-allowed; }
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
          color: var(--mb-text-primary); text-decoration: none; white-space: nowrap;
        }
        .abtn-label-short { display: none; }
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
        .clinic-map {
          position: relative; background: #E7E2D7; overflow: hidden;
          width: 360px; min-height: 260px; flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .clinic-page { padding: 16px 15px 26px; }
          .clinic-hero { flex-direction: column; }
          .clinic-hero-body { order: 2; padding: 16px 15px 4px; }
          .clinic-map { order: 1; width: 100% !important; height: 170px; }
          .clinic-body { flex-direction: column; }
          .clinic-rail { width: 100%; }

          /* Mobile hero actions: Directions + Call side-by-side, Website/Save wrap below */
          .clinic-actions { gap: 9px; }
          .abtn-label-full { display: none; }
          .abtn-label-short { display: inline; }
          .abtn-directions, .abtn-call, .abtn-website {
            flex: 1 1 calc(50% - 5px); padding: 0 12px;
          }
          .abtn-save { flex: 0 0 44px; }
        }
      `}</style>
    </div>
  );
};

export default Clinic;
