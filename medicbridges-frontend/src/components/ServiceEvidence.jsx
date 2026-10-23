import { CircleDashed, ExternalLink } from 'lucide-react';
import { safeHttpUrl } from '../lib/format';
import { useLang } from '../context/LangContext';
import { SERVICE_TEXT, isUnverifiedWebsite } from '../lib/serviceText';

/**
 * Small "Source" link for one service, meant for the right edge of its row.
 * Hidden unless the source URL is http(s). Clicks don't bubble so it is safe
 * inside clickable cards.
 */
export const ServiceSourceLink = ({ service }) => {
  const { lang } = useLang();
  const href = safeHttpUrl(service.source_url);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="svc-source"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0,
        padding: '2px 0 8px 6px', fontSize: '12px', color: 'var(--mb-primary)',
        textDecoration: 'underline', textUnderlineOffset: '2px',
      }}
    >
      {SERVICE_TEXT[lang].source} <ExternalLink size={11} />
    </a>
  );
};

/** The not-yet-confirmed note, shown only for unverified website evidence. */
const ServiceEvidence = ({ service, style }) => {
  const { lang } = useLang();
  if (!isUnverifiedWebsite(service)) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', fontSize: '12px', color: 'var(--mb-text-secondary)', ...style }}>
      <CircleDashed size={12} style={{ flexShrink: 0 }} /> {SERVICE_TEXT[lang].unverifiedWebsite}
    </div>
  );
};

export default ServiceEvidence;
