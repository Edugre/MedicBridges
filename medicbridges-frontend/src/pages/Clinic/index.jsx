import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MapPin, Phone, Globe, ArrowLeft, Check, ExternalLink, Pill,
  AlertCircle, Building2, Send, Bookmark, ChevronDown, ChevronRight, Flag, Info,
  BadgeCheck, CircleDashed, Landmark, BookOpen, MessageCircleQuestion, ArrowDownNarrowWide,
  Stethoscope, Smile, Brain, Microscope, Eye, HeartHandshake,
} from 'lucide-react';
import { getOrganization } from '../../api';
import {
  formatAddress, formatDistance, directionsUrl, splitServicesForSite, safeHttpUrl,
  humanizeCategory, distanceMeters, byDistance,
} from '../../lib/format';
import { loadSearchLocation } from '../../lib/searchLocation';
import LocationMap from '../../components/LocationMap';
import ReportIssueModal from '../../components/ReportIssueModal';
import ServiceEvidence, { ServiceSourceLink } from '../../components/ServiceEvidence';
import {
  SERVICE_TEXT, SERVICE_CATEGORIES, serviceName, serviceHint, isUnverifiedWebsite,
} from '../../lib/serviceText';
import { useLang } from '../../context/LangContext';

const OPAIS_URL = 'https://340bopais.hrsa.gov/help/reports/dailyreports.htm';
const NAVBAR_OFFSET = 74;
const LOCATIONS_SHOWN = 4;
const PHARMACIES_SHOWN = 3;

const CONTENT = {
  en: {
    backToResults: 'Back to search results',
    loading: 'Loading clinic details…',
    loadError: 'We couldn’t load this clinic. Please try again in a moment.',
    backToSearch: 'Back to search',
    meds340b: '340B meds',
    slidingScale: 'Sliding scale',
    clinic: 'Clinic',
    runBy: 'Run by',
    locs: (n) => (n === 1 ? '1 location' : `${n} locations`),
    away: (d) => `${d} away`,
    getDirections: 'Get directions',
    directions: 'Directions',
    call: 'Call',
    callNumber: (p) => `Call ${p}`,
    website: 'Website',
    saved: 'Saved',
    saveClinic: 'Save clinic',
    servicesOffered: 'Services offered',
    howWeKnow: 'How we know this',
    atThisLocation: 'At this location',
    confirmedFor: (name) => `Confirmed for ${name}`,
    orgTitle: 'Offered by this organization.',
    orgSub: 'Call to confirm this location',
    callToConfirm: 'Call to confirm',
    allUnverified: 'All below: from the clinic’s website, not yet confirmed',
    noSvcTitle: 'We don’t have a list of services for this clinic yet',
    noSvcBody: 'Call and ask what they offer before you go.',
    sources: [
      ['Confirmed for this location', 'The clinic or our team checked that this service is offered at this address.'],
      ['Clinic website', 'We read the clinic’s own website. It may be out of date or describe other locations.'],
      ['HRSA federal reports', 'What the health center reports each year to HRSA, the federal agency that funds it. Covers the whole organization.'],
      ['FACHC directory', 'The public directory of the Florida Association of Community Health Centers.'],
    ],
    medsTitle: '340B medicine program',
    notice340bTitle: '340B program notice.',
    notice340bBody:
      'This organization appears in the federal 340B program list. That does not guarantee a discount or that the clinic will accept you, so ask about discounts or sliding-fee options before your visit. MedicBridges is not affiliated with or endorsed by HRSA or the U.S. government.',
    notice340bSource: 'Source: HRSA 340B OPAIS',
    pharmTitle: 'Partner pharmacies near you',
    pharmHint: 'These pharmacies work with this organization’s 340B program. Ask if they can fill a prescription from this clinic.',
    pharmMore: (n) => `See all ${n} partner pharmacies`,
    otherLocations: (n) => `Other locations (${n})`,
    closestFirst: 'Closest first',
    confirmedServices: (n) => (n === 1 ? '1 confirmed service' : `${n} confirmed services`),
    showAll: (n) => `Show all ${n} locations`,
    showFewer: 'Show fewer',
    aboutOrg: 'About the organization',
    operatedBy: 'This location is operated by',
    aboutTail: ', a community health center funded by the federal government (HRSA).',
    grantLabel: 'HRSA grant',
    locationsLabel: 'Locations',
    atAGlance: 'At a glance',
    slidingScaleFees: 'Sliding-scale fees',
    program340b: '340B program',
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
    runBy: 'Administrada por',
    locs: (n) => (n === 1 ? '1 ubicación' : `${n} ubicaciones`),
    away: (d) => `a ${d}`,
    getDirections: 'Obtener indicaciones',
    directions: 'Indicaciones',
    call: 'Llamar',
    callNumber: (p) => `Llamar al ${p}`,
    website: 'Sitio web',
    saved: 'Guardada',
    saveClinic: 'Guardar clínica',
    servicesOffered: 'Servicios ofrecidos',
    howWeKnow: 'Cómo lo sabemos',
    atThisLocation: 'En esta ubicación',
    confirmedFor: (name) => `Confirmado para ${name}`,
    orgTitle: 'Ofrecido por esta organización.',
    orgSub: 'Llama para confirmar en esta ubicación',
    callToConfirm: 'Llamar para confirmar',
    allUnverified: 'Todo lo siguiente: del sitio web de la clínica, aún no confirmado',
    noSvcTitle: 'Todavía no tenemos la lista de servicios de esta clínica',
    noSvcBody: 'Llama y pregunta qué ofrecen antes de ir.',
    sources: [
      ['Confirmado para esta ubicación', 'La clínica o nuestro equipo verificó que este servicio se ofrece en esta dirección.'],
      ['Sitio web de la clínica', 'Leímos el sitio web de la clínica. Puede estar desactualizado o describir otras ubicaciones.'],
      ['Informes federales de HRSA', 'Lo que el centro de salud reporta cada año a HRSA, la agencia federal que lo financia. Abarca toda la organización.'],
      ['Directorio de FACHC', 'El directorio público de la Asociación de Centros de Salud Comunitarios de Florida.'],
    ],
    medsTitle: 'Programa de medicinas 340B',
    notice340bTitle: 'Aviso sobre el programa 340B.',
    notice340bBody:
      'Esta organización aparece en la lista federal del programa 340B. Eso no garantiza un descuento ni que la clínica te atienda; pregunta por descuentos o tarifas según tu ingreso antes de ir. MedicBridges no está afiliada ni respaldada por HRSA ni por el gobierno de EE. UU.',
    notice340bSource: 'Fuente: HRSA 340B OPAIS',
    pharmTitle: 'Farmacias asociadas cerca de ti',
    pharmHint: 'Estas farmacias trabajan con el programa 340B de esta organización. Pregunta si pueden surtir una receta de esta clínica.',
    pharmMore: (n) => `Ver las ${n} farmacias asociadas`,
    otherLocations: (n) => `Otras ubicaciones (${n})`,
    closestFirst: 'Más cercanas primero',
    confirmedServices: (n) => (n === 1 ? '1 servicio confirmado' : `${n} servicios confirmados`),
    showAll: (n) => `Ver las ${n} ubicaciones`,
    showFewer: 'Ver menos',
    aboutOrg: 'Sobre la organización',
    operatedBy: 'Esta ubicación es operada por',
    aboutTail: ', un centro de salud comunitario financiado por el gobierno federal (HRSA).',
    grantLabel: 'Subvención HRSA',
    locationsLabel: 'Ubicaciones',
    atAGlance: 'De un vistazo',
    slidingScaleFees: 'Tarifas de escala móvil',
    program340b: 'Programa 340B',
    yes: 'Sí',
    contact: 'Contacto',
    phone: 'Teléfono',
    address: 'Dirección',
    reportProblem: 'Reportar un problema',
  },
};

const CATEGORY_ICONS = {
  'Primary Care': Stethoscope,
  Dental: Smile,
  'Behavioral Health': Brain,
  Diagnostic: Microscope,
  Vision: Eye,
  Pharmacy: Pill,
  'Enabling Services': HeartHandshake,
};
const CATEGORY_ORDER = Object.keys(SERVICE_CATEGORIES);
const SOURCE_ICONS = [BadgeCheck, Globe, Landmark, BookOpen];

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

/** Services grouped by category in display order; unknown categories go last. */
function groupByCategory(services) {
  const groups = new Map();
  services.forEach((s) => {
    if (!groups.has(s.category)) groups.set(s.category, []);
    groups.get(s.category).push(s);
  });
  const rank = (c) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length);
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b));
}

function smoothScrollTo(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET - 12,
    behavior: reduce ? 'auto' : 'smooth',
  });
}

const ServiceGroups = ({ services, tier, lang, showNotes }) => (
  groupByCategory(services).map(([category, items]) => {
    const Icon = CATEGORY_ICONS[category] || Stethoscope;
    return (
      <div key={category} className="svc-cat">
        <div className="svc-cat-head">
          <span className="svc-cat-chip"><Icon size={15} /></span>
          {SERVICE_CATEGORIES[category]?.[lang] || humanizeCategory(category)}
        </div>
        <div className="services-grid">
          {items.map((service) => {
            const hint = serviceHint(service, lang);
            return (
              <div key={service.name} className="svc">
                <span className="tick">
                  {tier === 'site' ? <Check size={13} strokeWidth={3} /> : <Building2 size={12} />}
                </span>
                <div className="svc-text">
                  <div className="svc-name">{serviceName(service, lang)}</div>
                  {hint && <div className="svc-hint">{hint}</div>}
                  {showNotes && <ServiceEvidence service={service} />}
                </div>
                <ServiceSourceLink service={service} />
              </div>
            );
          })}
        </div>
      </div>
    );
  })
);

const PlaceRow = ({ place, callLabel, pills, to }) => {
  const address = formatAddress(place);
  const distance = formatDistance(place.distance_m);
  return (
    <div className={`loc${to ? ' loc-link' : ''}`}>
      <div className="loc-text">
        {to ? (
          <Link to={to} className="loc-name loc-stretch">{place.name}</Link>
        ) : (
          <div className="loc-name">{place.name}</div>
        )}
        {address && <div className="loc-addr">{address}</div>}
        {pills}
      </div>
      {distance && <div className="loc-dist">{distance}</div>}
      {place.phone && (
        <a className="loc-call" href={`tel:${place.phone}`} aria-label={`${callLabel} ${place.phone}`}>
          <Phone size={16} />
        </a>
      )}
      {to && <ChevronRight size={16} className="loc-chev" aria-hidden="true" />}
    </div>
  );
};

const Clinic = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const siteParam = searchParams.get('site');
  const { lang } = useLang();
  const t = { ...CONTENT[lang], ...SERVICE_TEXT[lang] };
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [allLocationsOpen, setAllLocationsOpen] = useState(false);
  const [allPharmaciesOpen, setAllPharmaciesOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // The org endpoint has no user location, so distances come from the
  // patient's last search center (kept in this tab only), when we have one.
  const origin = useMemo(() => loadSearchLocation(), []);

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

  // Switching to another location of the same org: start at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [siteParam]);

  const withDistance = (item) => (
    item.distance_m != null ? item : { ...item, distance_m: distanceMeters(origin, item) }
  );
  const sites = (org?.sites || []).map(withDistance);
  const primary = sites.find((s) => s.site_id === siteParam) || sites[0];
  // Services confirmed for the shown site vs. offered somewhere in the org.
  const { here: siteServices, orgOnly: orgServices } = splitServicesForSite(org, primary);
  const hasServices = siteServices.length > 0 || orgServices.length > 0;
  const orgAllUnverifiedWebsite = orgServices.length > 0 && orgServices.every(isUnverifiedWebsite);
  const slidingScale = primary?.accepts_sliding_scale === true;
  const website = safeHttpUrl(primary?.website) || safeHttpUrl(org?.website);
  const websiteLabel = website?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const address = primary ? formatAddress(primary) : '';
  const directions = primary ? directionsUrl(primary) : null;
  const phone = primary?.phone;
  const distance = formatDistance(primary?.distance_m);
  const addressMeta = [primary?.county, distance && t.away(distance)].filter(Boolean).join(' · ');

  const others = sites.filter((s) => s.site_id !== primary?.site_id).sort(byDistance);
  const shownOthers = allLocationsOpen ? others : others.slice(0, LOCATIONS_SHOWN);
  const pharmacies = (org?.contract_pharmacies || [])
    .filter((p) => p.is_currently_contracted !== false)
    .map(withDistance)
    .sort(byDistance);
  const shownPharmacies = allPharmaciesOpen ? pharmacies : pharmacies.slice(0, PHARMACIES_SHOWN);
  const siteLink = (s) => `/clinic/${encodeURIComponent(id)}?site=${encodeURIComponent(s.site_id)}`;

  if (!loading && notFound) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div className="clinic-page">
      <Link to="/search" className="clinic-back">
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
          {/* ---------- Hero: location first, organization second ---------- */}
          <div className="dcard clinic-hero">
            <div className="clinic-hero-body">
              {(org.has_340b || slidingScale || primary?.center_type) && (
                <div className="clinic-badges">
                  {org.has_340b && (
                    <span className="badge b-honey"><Pill size={12} /> {t.meds340b}</span>
                  )}
                  {slidingScale && <span className="badge b-sage">{t.slidingScale}</span>}
                  {primary?.center_type && <span className="badge b-neu">{primary.center_type}</span>}
                </div>
              )}

              <h1 className="clinic-title">{primary?.name || org.name || t.clinic}</h1>

              <div className="hero-line hero-runby">
                <Building2 size={16} className="hero-line-icon" color="var(--mb-text-secondary)" />
                <span>
                  {org.name && (
                    <>
                      {t.runBy}{' '}
                      <a
                        href="#about"
                        className="runby-link"
                        onClick={(e) => { e.preventDefault(); smoothScrollTo('about'); }}
                      >
                        {org.name}
                      </a>
                      <span className="muted"> · </span>
                    </>
                  )}
                  <span className="muted">{t.locs(sites.length)}</span>
                </span>
              </div>

              {(address || addressMeta) && (
                <div className="hero-line">
                  <MapPin size={16} className="hero-line-icon" color="var(--mb-primary)" />
                  <span>
                    {address}
                    {addressMeta && <span className="muted">{address ? ' · ' : ''}{addressMeta}</span>}
                  </span>
                </div>
              )}

              <div className="clinic-actions">
                {directions && (
                  <a className="abtn teal abtn-directions" href={directions} target="_blank" rel="noreferrer">
                    <Send size={15} /> <span className="abtn-label-full">{t.getDirections}</span><span className="abtn-label-short">{t.directions}</span>
                  </a>
                )}
                {phone && (
                  <a className="abtn abtn-call" href={`tel:${phone}`}>
                    <Phone size={15} /> <span className="abtn-label-full">{phone}</span><span className="abtn-label-short">{t.call}</span>
                  </a>
                )}
                {website && (
                  <a className="abtn abtn-website" href={website} target="_blank" rel="noreferrer">
                    <Globe size={15} /> {t.website}
                  </a>
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
          <div className="clinic-body">
            {/* Main column */}
            <div className="clinic-main">
              {/* Services: confirmed here vs. offered by the org — never merged */}
              <section className="dcard">
                <div className="svc-header">
                  <h2 className="sech" style={{ marginBottom: 0 }}>{t.servicesOffered}</h2>
                  {hasServices && (
                    <button
                      type="button"
                      className="how-toggle"
                      aria-expanded={sourcesOpen}
                      aria-controls="how-we-know"
                      onClick={() => setSourcesOpen((o) => !o)}
                    >
                      <Info size={15} /> {t.howWeKnow}
                      <ChevronDown size={14} style={{ transform: sourcesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                    </button>
                  )}
                </div>

                {hasServices && sourcesOpen && (
                  <div id="how-we-know" className="how-panel">
                    {t.sources.map(([title, body], i) => {
                      const Icon = SOURCE_ICONS[i];
                      return (
                        <div key={title} className="how-item">
                          <Icon size={16} color="var(--mb-primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
                          <div>
                            <div className="how-title">{title}</div>
                            <div className="how-body">{body}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {siteServices.length > 0 && (
                  <div className="tier tier-site">
                    <div className="tier-head">
                      <BadgeCheck size={20} color="var(--mb-primary)" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <div>
                        <div className="tier-title" style={{ color: 'var(--mb-primary)' }}>{t.atThisLocation}</div>
                        <div className="tier-sub">{t.confirmedFor(primary.name)}</div>
                      </div>
                    </div>
                    <ServiceGroups services={siteServices} tier="site" lang={lang} showNotes />
                  </div>
                )}

                {orgServices.length > 0 && (
                  <div className="tier tier-org">
                    <div className="tier-head tier-head-org">
                      <div className="tier-head">
                        <Building2 size={20} color="var(--mb-text-secondary)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <div>
                          <div className="tier-title">{t.orgTitle}</div>
                          <div className="tier-sub" style={{ fontSize: '13.5px' }}>{t.orgSub}</div>
                        </div>
                      </div>
                      {phone && (
                        <a className="call-outline" href={`tel:${phone}`}>
                          <Phone size={15} /> {t.callToConfirm}
                        </a>
                      )}
                    </div>
                    {orgAllUnverifiedWebsite && (
                      <div className="tier-chip">
                        <CircleDashed size={13} style={{ flexShrink: 0 }} /> {t.allUnverified}
                      </div>
                    )}
                    <ServiceGroups services={orgServices} tier="org" lang={lang} showNotes={!orgAllUnverifiedWebsite} />
                  </div>
                )}

                {!hasServices && (
                  <div className="svc-empty">
                    <MessageCircleQuestion size={22} color="var(--mb-text-secondary)" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <div className="tier-title">{t.noSvcTitle}</div>
                      <div className="svc-empty-body">{t.noSvcBody}</div>
                    </div>
                    {phone && (
                      <a className="call-outline" href={`tel:${phone}`}>
                        <Phone size={15} /> {t.callNumber(phone)}
                      </a>
                    )}
                  </div>
                )}
              </section>

              {/* 340B program: required notice + partner pharmacies */}
              {org.has_340b && (
                <section className="dcard">
                  <h2 className="sech" style={{ marginBottom: '14px' }}>
                    <Pill size={18} color="#B87814" /> {t.medsTitle}
                  </h2>
                  <aside className="notice-340b" role="note" aria-label={t.notice340bTitle}>
                    <Info size={18} className="notice-340b-icon" aria-hidden="true" />
                    <div>
                      <strong>{t.notice340bTitle}</strong> {t.notice340bBody}{' '}
                      <a href={OPAIS_URL} target="_blank" rel="noopener noreferrer">{t.notice340bSource}</a>.
                    </div>
                  </aside>
                  {pharmacies.length > 0 && (
                    <div style={{ marginTop: '18px' }}>
                      <div className="tier-title">{t.pharmTitle}</div>
                      <div className="pharm-hint">{t.pharmHint}</div>
                      <div style={{ marginTop: '6px' }}>
                        {shownPharmacies.map((p) => (
                          <PlaceRow key={p.pharmacy_id} place={p} callLabel={t.call} />
                        ))}
                      </div>
                      {pharmacies.length > PHARMACIES_SHOWN && (
                        <button
                          type="button"
                          className="text-link"
                          aria-expanded={allPharmaciesOpen}
                          onClick={() => setAllPharmaciesOpen((o) => !o)}
                        >
                          {allPharmaciesOpen ? t.showFewer : t.pharmMore(pharmacies.length)}
                          <ChevronRight size={15} style={{ transform: allPharmaciesOpen ? 'rotate(-90deg)' : 'none' }} />
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Other locations: closest first, the shown site excluded */}
              {others.length > 0 && (
                <section className="dcard" style={{ paddingBottom: '10px' }}>
                  <div className="loc-header">
                    <h2 className="sech" style={{ marginBottom: 0 }}>
                      <MapPin size={18} color="var(--mb-primary)" /> {t.otherLocations(others.length)}
                    </h2>
                    <span className="loc-sort"><ArrowDownNarrowWide size={13} /> {t.closestFirst}</span>
                  </div>
                  {shownOthers.map((s) => (
                    <PlaceRow
                      key={s.site_id}
                      place={s}
                      callLabel={t.call}
                      to={siteLink(s)}
                      pills={(s.county || s.services?.length > 0) && (
                        <div className="loc-pills">
                          {s.county && <span className="pill pill-neu">{s.county}</span>}
                          {s.services?.length > 0 && (
                            <span className="pill pill-sage"><BadgeCheck size={11} /> {t.confirmedServices(s.services.length)}</span>
                          )}
                        </div>
                      )}
                    />
                  ))}
                  {others.length > LOCATIONS_SHOWN && (
                    <button
                      type="button"
                      className="text-link"
                      aria-expanded={allLocationsOpen}
                      onClick={() => setAllLocationsOpen((o) => !o)}
                    >
                      {allLocationsOpen ? t.showFewer : t.showAll(others.length)}
                      <ChevronDown size={15} style={{ transform: allLocationsOpen ? 'rotate(180deg)' : 'none' }} />
                    </button>
                  )}
                </section>
              )}

              <section id="about" className="dcard">
                <h2 className="sech" style={{ marginBottom: '10px' }}>
                  <Building2 size={18} color="var(--mb-primary)" /> {t.aboutOrg}
                </h2>
                {org.name && (
                  <p className="about-text">
                    {t.operatedBy} <strong style={{ color: 'var(--mb-text-primary)' }}>{org.name}</strong>{t.aboutTail}
                  </p>
                )}
                <div className="facts">
                  {org.grant_number && (
                    <div><div className="fact-lab">{t.grantLabel}</div><div className="fact-val">{org.grant_number}</div></div>
                  )}
                  <div><div className="fact-lab">{t.locationsLabel}</div><div className="fact-val">{sites.length}</div></div>
                  {website && (
                    <div>
                      <div className="fact-lab">{t.website}</div>
                      <a className="fact-val teal-link" href={website} target="_blank" rel="noreferrer">
                        {websiteLabel} <ExternalLink size={13} />
                      </a>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right rail */}
            <div className="clinic-rail">
              {(slidingScale || org.has_340b) && (
                <div className="dcard glance-card">
                  <div className="sech" style={{ marginBottom: '8px' }}>{t.atAGlance}</div>
                  {slidingScale && (
                    <div className="glance"><span style={{ color: '#3B4642' }}>{t.slidingScaleFees}</span><span className="yes"><Check size={15} strokeWidth={3} /> {t.yes}</span></div>
                  )}
                  {org.has_340b && (
                    <div className="glance"><span style={{ color: '#3B4642' }}>{t.program340b}</span><span className="yes"><Check size={15} strokeWidth={3} /> {t.yes}</span></div>
                  )}
                </div>
              )}

              {(phone || website || address) && (
                <div className="dcard">
                  <div className="sech" style={{ marginBottom: '6px' }}>{t.contact}</div>
                  {phone && (
                    <a className="kv" href={`tel:${phone}`}>
                      <span className="ic"><Phone size={17} /></span>
                      <div><div className="lab">{t.phone}</div><div className="val">{phone}</div></div>
                    </a>
                  )}
                  {website && (
                    <a className="kv" href={website} target="_blank" rel="noreferrer">
                      <span className="ic"><Globe size={17} /></span>
                      <div>
                        <div className="lab">{t.website}</div>
                        <div className="val" style={{ color: 'var(--mb-primary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {websiteLabel} <ExternalLink size={13} />
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

          {/* Mobile-only sticky actions */}
          {(directions || phone) && (
            <div className="clinic-sticky">
              {directions && (
                <a className="sticky-btn teal" href={directions} target="_blank" rel="noreferrer">
                  <Send size={16} /> {t.directions}
                </a>
              )}
              {phone && (
                <a className="sticky-btn" href={`tel:${phone}`}>
                  <Phone size={16} /> {t.call}
                </a>
              )}
            </div>
          )}

          <ReportIssueModal
            isOpen={reportOpen}
            onClose={() => setReportOpen(false)}
            clinicName={primary?.name || org.name}
            subjectType="site"
            subjectKey={primary?.site_id}
            current={{
              phone,
              address,
              website,
            }}
          />
        </>
      )}

      <style>{`
        .clinic-page {
          max-width: 1180px; margin: 0 auto; padding: 26px 34px 38px;
          animation: fadeIn 0.6s ease-out;
        }
        .clinic-back {
          display: inline-flex; align-items: center; gap: 7px; min-height: 32px;
          color: var(--mb-text-secondary); font-size: 13.5px; font-weight: 500; margin-bottom: 18px;
        }
        .clinic-back:hover { color: var(--mb-primary); }
        .muted { color: var(--mb-text-muted); }
        .report-problem {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          width: 100%; min-height: 44px; padding: 11px 14px; border-radius: 12px;
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
          font-size: 16px; font-weight: 600; color: var(--mb-text-primary); line-height: 1.3;
          letter-spacing: -0.01em; display: flex; align-items: center; gap: 9px;
          margin-bottom: 16px;
        }
        .clinic-page h2.sech { font-size: 18px !important; font-weight: 700; }
        .badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 11px; border-radius: 999px; font-size: 12px; font-weight: 600;
        }
        .b-honey { background: var(--mb-honey-soft); color: #965F0C; border: 1px solid #F2E0C2; }
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

        /* Hero */
        .clinic-hero { padding: 0; overflow: hidden; display: flex; margin-bottom: 22px; }
        .clinic-hero-body { flex: 1; min-width: 0; padding: 26px 28px; display: flex; flex-direction: column; }
        .clinic-badges { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 12px; }
        .clinic-page h1.clinic-title {
          font-size: 29px !important; font-weight: 700; letter-spacing: -0.02em;
          line-height: 1.15; margin-bottom: 8px; text-wrap: pretty;
        }
        .hero-line {
          display: flex; align-items: flex-start; gap: 7px;
          color: var(--mb-text-secondary); font-size: 14.5px; line-height: 1.45;
        }
        .hero-runby { margin-bottom: 6px; }
        .hero-line-icon { flex-shrink: 0; margin-top: 2px; }
        .runby-link {
          color: var(--mb-text-primary); font-weight: 600;
          text-decoration: underline; text-decoration-color: #CFC8B8; text-underline-offset: 3px;
        }
        .runby-link:hover { color: var(--mb-primary-hover); }
        .clinic-actions { display: flex; gap: 9px; margin-top: 22px; flex-wrap: wrap; }

        /* Layout */
        .clinic-body { display: flex; gap: 22px; align-items: flex-start; }
        .clinic-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 22px; }
        .clinic-rail { width: 330px; flex-shrink: 0; display: flex; flex-direction: column; gap: 22px; }

        /* Services */
        .svc-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px 12px; flex-wrap: wrap; margin-bottom: 14px;
        }
        .how-toggle {
          display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px;
          border-radius: 999px; border: 1px solid var(--mb-border); background: var(--mb-bg-surface);
          color: var(--mb-primary); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .how-toggle:hover { background: var(--mb-bg-surface-hover); }
        .how-panel {
          background: var(--mb-bg-primary); border: 1px solid var(--mb-border-soft); border-radius: 14px;
          padding: 14px 16px; margin-bottom: 16px; display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); gap: 12px 22px;
        }
        .how-item { display: flex; gap: 10px; align-items: flex-start; }
        .how-title { font-size: 13.5px; font-weight: 600; line-height: 1.4; }
        .how-body { font-size: 13px; color: var(--mb-text-secondary); line-height: 1.45; text-wrap: pretty; }
        .tier { border-radius: 14px; padding: 16px 18px 8px; }
        .tier-site { background: #F4FBF8; border: 1px solid #CDEDE1; margin-bottom: 14px; }
        .tier-site:last-child { margin-bottom: 0; }
        .tier-org { background: var(--mb-bg-primary); border: 1px dashed #D6CEBD; }
        .tier-head { display: flex; align-items: flex-start; gap: 10px; }
        .tier-head-org { justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .tier-head-org > .tier-head { flex: 1 1 260px; min-width: 0; }
        .tier-title { font-size: 15px; font-weight: 700; line-height: 1.35; color: var(--mb-text-primary); }
        .tier-sub { font-size: 13px; color: var(--mb-text-secondary); line-height: 1.4; }
        .tier-chip {
          display: flex; align-items: center; gap: 6px; width: fit-content; max-width: 100%;
          margin-top: 12px; padding: 7px 10px; border-radius: 10px;
          background: var(--mb-bg-surface); border: 1px solid var(--mb-border-soft);
          font-size: 12.5px; color: var(--mb-text-secondary);
        }
        .call-outline {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          height: 44px; padding: 0 16px; border-radius: 12px; white-space: nowrap;
          background: var(--mb-bg-surface); border: 1px solid var(--mb-primary);
          color: var(--mb-primary); font-size: 14px; font-weight: 600; text-decoration: none;
        }
        .call-outline:hover { background: var(--mb-lime-soft); color: var(--mb-primary-hover); }
        .svc-cat { margin-top: 14px; }
        .svc-cat-head {
          display: flex; align-items: center; gap: 8px; margin-bottom: 2px;
          font-size: 13px; font-weight: 700; color: var(--mb-text-primary);
        }
        .svc-cat-chip {
          width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--mb-lime-soft); color: var(--mb-primary);
        }
        .tier-org .svc-cat-chip { background: #F1ECE0; color: var(--mb-text-secondary); }
        .services-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr)); gap: 0 24px;
        }
        .svc { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; }
        .svc .tick {
          width: 22px; height: 22px; border-radius: 7px;
          background: var(--mb-lime-soft); color: var(--mb-primary);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .tier-org .svc .tick { background: var(--mb-bg-surface); border: 1px dashed #CFC8B8; color: var(--mb-text-muted); }
        .svc-text { flex: 1; min-width: 0; }
        .svc-name { font-size: 14.5px; font-weight: 500; line-height: 1.35; color: var(--mb-text-primary); }
        .tier-org .svc-name { color: #3B4642; }
        .svc-hint { font-size: 12.5px; color: var(--mb-text-secondary); line-height: 1.4; }
        .svc-source:hover { color: var(--mb-primary-hover) !important; }
        .svc-empty {
          display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; padding: 18px;
          border: 1px dashed #D6CEBD; border-radius: 14px; background: var(--mb-bg-primary);
        }
        .svc-empty-body { font-size: 13.5px; color: var(--mb-text-secondary); line-height: 1.45; margin-top: 2px; }

        /* 340B */
        .notice-340b {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px; border-radius: 14px;
          background: var(--mb-honey-soft); border: 1px solid #F2E0C2;
          color: var(--mb-text-primary); font-size: 13.5px; line-height: 1.55;
        }
        .notice-340b-icon { color: #B87814; flex-shrink: 0; margin-top: 2px; }
        .notice-340b a { color: var(--mb-primary); text-decoration: underline; }
        .notice-340b a:hover { color: var(--mb-primary-hover); }
        .pharm-hint { font-size: 13px; color: var(--mb-text-secondary); line-height: 1.45; margin-top: 2px; text-wrap: pretty; }
        .text-link {
          display: inline-flex; align-items: center; gap: 6px; min-height: 44px;
          background: none; border: none; padding: 0; cursor: pointer;
          font: inherit; font-size: 14px; font-weight: 600; color: var(--mb-primary);
        }
        .text-link:hover { color: var(--mb-primary-hover); }

        /* Location / pharmacy rows */
        .loc-header {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; margin-bottom: 6px;
        }
        .loc-sort { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--mb-text-secondary); }
        .loc {
          position: relative; display: flex; align-items: center; gap: 12px;
          padding: 13px 0; border-bottom: 1px solid #F1ECE1;
        }
        .loc-text { flex: 1; min-width: 0; }
        .loc-name { display: block; font-size: 14.5px; font-weight: 600; line-height: 1.35; color: var(--mb-text-primary); }
        .loc-stretch::after { content: ''; position: absolute; inset: 0; }
        .loc-link:hover .loc-name { color: var(--mb-primary); }
        .loc-link:hover .loc-chev { color: var(--mb-primary); }
        .loc-addr { font-size: 13px; color: var(--mb-text-secondary); line-height: 1.4; }
        .loc-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
        .pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600;
        }
        .pill-neu { background: #F4F1EA; color: var(--mb-text-secondary); }
        .pill-sage { background: var(--mb-lime-soft); color: var(--mb-primary); }
        .loc-dist { color: var(--mb-primary); font-weight: 600; font-size: 13.5px; white-space: nowrap; }
        .loc-call {
          position: relative; z-index: 1; width: 44px; height: 44px; flex-shrink: 0;
          border-radius: 12px; border: 1px solid var(--mb-border); background: var(--mb-bg-surface);
          display: flex; align-items: center; justify-content: center; color: var(--mb-text-primary);
        }
        .loc-call:hover { background: var(--mb-bg-surface-hover); color: var(--mb-text-primary); }
        .loc-chev { flex-shrink: 0; color: var(--mb-text-muted); }

        /* About */
        .about-text { font-size: 14.5px; line-height: 1.6; color: var(--mb-text-secondary); text-wrap: pretty; }
        .facts {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
          gap: 12px 22px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #F1ECE1;
        }
        .fact-lab {
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em;
          text-transform: uppercase; color: var(--mb-text-muted);
        }
        .fact-val { font-size: 14px; font-weight: 500; color: var(--mb-text-primary); }
        .teal-link { display: inline-flex; align-items: center; gap: 5px; color: var(--mb-primary); }
        .teal-link:hover { color: var(--mb-primary-hover); }

        /* Rail */
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
        .glance-card { background: var(--mb-lime-soft); border-color: #CDEDE1; }
        .glance {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 10px 0; border-bottom: 1px solid #D3E9E0; font-size: 13.5px;
        }
        .glance:last-child { border-bottom: none; }
        .yes { color: var(--mb-primary); font-weight: 700; display: inline-flex; align-items: center; gap: 5px; }
        .clinic-map {
          position: relative; background: #E7E2D7; overflow: hidden;
          width: 360px; min-height: 260px; flex-shrink: 0;
        }

        /* Mobile sticky action bar */
        .clinic-sticky { display: none; }
        .sticky-btn {
          flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          height: 48px; border-radius: 12px; font-size: 15px; font-weight: 600; text-decoration: none;
          background: var(--mb-bg-surface); border: 1px solid var(--mb-border); color: var(--mb-text-primary);
        }
        .sticky-btn.teal { background: var(--mb-primary); border-color: var(--mb-primary); color: #fff; }

        @media (prefers-reduced-motion: reduce) {
          .clinic-page { animation: none; }
        }
        @media (max-width: 768px) {
          .clinic-page { padding: 16px 15px 26px; }
          .clinic-page h1.clinic-title { font-size: 26px !important; }
          .clinic-hero { flex-direction: column; }
          .clinic-hero-body { order: 2; padding: 16px 15px 18px; }
          .clinic-map { order: 1; width: 100% !important; height: 170px; min-height: 170px; }
          .clinic-body { flex-direction: column; align-items: stretch; }
          .clinic-rail { width: 100%; }
          .dcard { padding: 18px 15px; }
          .clinic-hero.dcard { padding: 0; }
          .tier { padding: 16px 14px 8px; }

          /* Mobile hero actions: Directions + Call side-by-side, Website/Save wrap below */
          .abtn-label-full { display: none; }
          .abtn-label-short { display: inline; }
          .abtn-directions, .abtn-call, .abtn-website {
            flex: 1 1 calc(50% - 5px); padding: 0 12px;
          }
          .abtn-save { flex: 0 0 44px; }

          .clinic-sticky {
            position: sticky; bottom: 0; z-index: 20; display: flex; gap: 9px;
            margin: 22px -15px -26px; padding: 10px 15px 14px;
            background: rgba(251, 247, 240, 0.96); border-top: 1px solid var(--mb-border-soft);
          }
        }
      `}</style>
    </div>
  );
};

export default Clinic;
