import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, HandCoins, MapPin, Phone } from 'lucide-react';
import { getAssistanceFacility } from '../../api/resources';
import { formatAddress, formatIsoDate, safeHttpUrl } from '../../lib/format';
import { useLang } from '../../context/LangContext';

// Wording rules (same as the result cards): never promise cost or eligibility,
// show no percentages, hours, services or distance. Only fields from the public
// view are used, and eligibility is always described as Jackson's decision.
const CONTENT = {
  en: {
    back: 'Back to search',
    badge: 'Financial assistance program',
    programsTitle: 'Financial assistance at this location',
    decidedBy: 'Eligibility and any patient charges are decided by Jackson Health System.',
    call: 'Call',
    apply: 'Apply',
    policy: 'Read the policy',
    policyRevised: (d) => `Policy revised ${d}`,
    checked: (d) => `Checked ${d}`,
    askFirst: 'Ask Jackson about assistance before your visit. MedicBridges is not affiliated with Jackson Health System.',
    loading: 'Loading…',
    error: 'We could not load this page. Please try again in a moment.',
  },
  es: {
    back: 'Volver a la búsqueda',
    badge: 'Programa de asistencia financiera',
    programsTitle: 'Asistencia financiera en este lugar',
    decidedBy: 'Jackson Health System decide la elegibilidad y cualquier cargo al paciente.',
    call: 'Llamar',
    apply: 'Solicitar',
    policy: 'Leer la política',
    policyRevised: (d) => `Política revisada ${d}`,
    checked: (d) => `Verificado ${d}`,
    askFirst: 'Pregunte a Jackson sobre la asistencia antes de su visita. MedicBridges no está afiliado a Jackson Health System.',
    loading: 'Cargando…',
    error: 'No pudimos cargar esta página. Inténtelo de nuevo en un momento.',
  },
};

const buttonBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '9px 14px',
  borderRadius: '10px',
  fontSize: '13.5px',
  fontWeight: 600,
  textDecoration: 'none',
};

function isNotFound(err) {
  return err.code === 'not_found' || err.status === 404 || err.status === 400;
}

const Assistance = () => {
  const { facilityId } = useParams();
  const { lang } = useLang();
  const t = CONTENT[lang];
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(false);
    setNotFound(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    getAssistanceFacility(facilityId, { signal: controller.signal })
      .then(setFacility)
      .catch((err) => {
        if (err.name === 'AbortError') return;
        // Never show raw backend errors to patients.
        if (isNotFound(err)) setNotFound(true);
        else setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [facilityId]);

  if (notFound) return <Navigate to="/404" replace />;

  const address = facility && formatAddress({ ...facility, address_line_1: facility.address });

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '24px 16px 48px' }}>
      <Link
        to="/search"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: 'var(--mb-text-secondary)', textDecoration: 'none', marginBottom: '16px' }}
      >
        <ArrowLeft size={15} /> {t.back}
      </Link>

      {loading && <p style={{ color: 'var(--mb-text-muted)' }}>{t.loading}</p>}
      {!loading && error && <p role="alert" style={{ color: 'var(--mb-text-secondary)' }}>{t.error}</p>}

      {!loading && facility && (
        <>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2, margin: '0 0 6px', color: 'var(--mb-text-primary)' }}>
            {facility.name}
          </h1>
          {address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--mb-text-secondary)', fontSize: '14px' }}>
              <MapPin size={15} style={{ flexShrink: 0 }} /> <span>{address}</span>
            </div>
          )}
          {facility.phone && (
            <a
              href={`tel:${facility.phone}`}
              style={{ ...buttonBase, marginTop: '14px', border: '1px solid var(--mb-border)', background: '#fff', color: 'var(--mb-text-primary)' }}
            >
              <Phone size={14} /> {t.call} {facility.phone}
            </a>
          )}

          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '28px 0 12px', color: 'var(--mb-text-primary)' }}>
            {t.programsTitle}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {facility.programs.map((p) => {
              const applyUrl = safeHttpUrl(p.application_url);
              const policyUrl = safeHttpUrl(p.policy_url);
              const revised = formatIsoDate(p.policy_revised, lang);
              const checked = formatIsoDate(p.last_checked, lang);
              const meta = [revised && t.policyRevised(revised), checked && t.checked(checked)].filter(Boolean).join(' · ');
              return (
                <section
                  key={p.program_id}
                  style={{ background: '#fff', border: '1px solid var(--mb-border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '9px' }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 9px', borderRadius: 'var(--mb-radius-pill)', fontSize: '11.5px', fontWeight: 600, background: 'var(--mb-bg-surface-hover)', border: '1px solid var(--mb-border)', color: 'var(--mb-text-primary)' }}>
                      <HandCoins size={11} /> {t.badge}
                    </span>
                    <strong style={{ fontSize: '15px', color: 'var(--mb-text-primary)' }}>{p.program_name}</strong>
                  </div>
                  {p.short_description && (
                    <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--mb-text-secondary)', lineHeight: 1.45 }}>{p.short_description}</p>
                  )}
                  {p.public_copy && (
                    <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--mb-text-secondary)', lineHeight: 1.45 }}>{p.public_copy}</p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
                    {applyUrl && (
                      <a href={applyUrl} target="_blank" rel="noopener noreferrer" style={{ ...buttonBase, border: 'none', background: 'var(--mb-primary)', color: '#fff' }}>
                        <ExternalLink size={14} /> {t.apply}
                      </a>
                    )}
                    {policyUrl && (
                      <a href={policyUrl} target="_blank" rel="noopener noreferrer" style={{ ...buttonBase, border: '1px solid var(--mb-border)', background: '#fff', color: 'var(--mb-text-primary)' }}>
                        <ExternalLink size={14} /> {t.policy}
                      </a>
                    )}
                  </div>
                  {meta && <div style={{ fontSize: '11.5px', color: 'var(--mb-text-muted)' }}>{meta}</div>}
                </section>
              );
            })}
          </div>

          <p style={{ margin: '20px 0 0', fontSize: '12.5px', color: 'var(--mb-text-muted)', lineHeight: 1.45 }}>
            {t.decidedBy} {t.askFirst}
          </p>
        </>
      )}
    </div>
  );
};

export default Assistance;
