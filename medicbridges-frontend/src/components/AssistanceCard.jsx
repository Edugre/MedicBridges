import { MapPin, Phone, HandCoins, ExternalLink } from 'lucide-react';
import { formatAddress, formatIsoDate, safeHttpUrl } from '../lib/format';
import { useLang } from '../context/LangContext';

// Wording rules for these cards: never promise cost or eligibility, show no
// percentages, distance, hours, or services. The view has no organization
// column; every published program today is Jackson Health System's.
const CONTENT = {
  en: {
    badge: 'Financial assistance program',
    decidedBy: 'Eligibility is decided by Jackson Health System.',
    call: 'Call',
    apply: 'Apply',
    policyRevised: (d) => `Policy revised ${d}`,
    checked: (d) => `Checked ${d}`,
  },
  es: {
    badge: 'Programa de asistencia financiera',
    decidedBy: 'Jackson Health System decide la elegibilidad.',
    call: 'Llamar',
    apply: 'Solicitar',
    policyRevised: (d) => `Política revisada ${d}`,
    checked: (d) => `Verificado ${d}`,
  },
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
};

/**
 * Result card for a facility linked to a published assistance program
 * (no coordinates, so no distance and no map pin).
 *
 * @param {{ facility: import('../api/resources').AssistanceFacility, width?: string }} props
 */
const AssistanceCard = ({ facility, width }) => {
  const { lang } = useLang();
  const t = CONTENT[lang];
  const address = formatAddress({ ...facility, address_line_1: facility.address });
  const applyUrl = safeHttpUrl(facility.application_url);
  const policyUrl = safeHttpUrl(facility.policy_url);
  const revised = formatIsoDate(facility.policy_revised, lang);
  const checked = formatIsoDate(facility.last_checked, lang);
  const policyLine = [revised && t.policyRevised(revised), checked && t.checked(checked)].filter(Boolean).join(' · ');

  return (
    <div
      className="mb-clinic-card-v2"
      style={{
        background: '#fff',
        border: '1px solid var(--mb-border)',
        borderRadius: '16px',
        padding: '14px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        flexShrink: width ? 0 : undefined,
        width: width || undefined,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--mb-text-primary)', lineHeight: 1.25 }}>
          {facility.name}
        </div>
        {address && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--mb-text-secondary)', fontSize: '12.5px', marginTop: '3px' }}>
            <MapPin size={13} style={{ flexShrink: 0 }} /> <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 9px',
            borderRadius: 'var(--mb-radius-pill)',
            fontSize: '11.5px',
            fontWeight: 600,
            background: 'var(--mb-bg-surface-hover)',
            color: 'var(--mb-text-primary)',
            border: '1px solid var(--mb-border)',
          }}
        >
          <HandCoins size={11} /> {t.badge}
        </span>
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mb-text-secondary)' }}>
          {facility.program_name}
        </span>
      </div>

      {facility.public_copy && (
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--mb-text-secondary)', lineHeight: 1.4 }}>
          {facility.public_copy}
        </p>
      )}
      <div style={{ fontSize: '12px', color: 'var(--mb-text-muted)', lineHeight: 1.35 }}>
        {t.decidedBy}
      </div>
      {policyLine && (
        <div style={{ fontSize: '11.5px', color: 'var(--mb-text-muted)' }}>
          {policyUrl ? (
            <a href={policyUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
              {policyLine}
            </a>
          ) : policyLine}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
        <a
          href={facility.phone ? `tel:${facility.phone}` : undefined}
          aria-disabled={!facility.phone}
          style={{
            ...actionBase,
            border: '1px solid var(--mb-border)',
            background: '#fff',
            color: 'var(--mb-text-primary)',
            opacity: facility.phone ? 1 : 0.5,
            pointerEvents: facility.phone ? 'auto' : 'none',
          }}
        >
          <Phone size={13} /> {t.call}
        </a>
        <a
          href={applyUrl || undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!applyUrl}
          style={{
            ...actionBase,
            border: 'none',
            background: 'var(--mb-primary)',
            color: '#fff',
            opacity: applyUrl ? 1 : 0.5,
            pointerEvents: applyUrl ? 'auto' : 'none',
          }}
        >
          <ExternalLink size={13} /> {t.apply}
        </a>
      </div>
    </div>
  );
};

export default AssistanceCard;
