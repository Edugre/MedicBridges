import { ExternalLink } from 'lucide-react';
import { safeHttpUrl } from '../lib/format';
import { useLang } from '../context/LangContext';
import { SERVICE_TEXT } from '../lib/serviceText';

/**
 * Provenance line for one service: a small "Source" link and, for unverified
 * website evidence, the not-yet-confirmed note. Clicks don't bubble so it is
 * safe inside clickable cards.
 */
const ServiceEvidence = ({ service, style }) => {
  const { lang } = useLang();
  const t = SERVICE_TEXT[lang];
  const href = safeHttpUrl(service.source_url);
  const unverified = !service.is_verified && service.source_kind === 'website';
  if (!href && !unverified) return null;

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px', fontSize: '12px', color: 'var(--mb-text-muted)', ...style }}>
      {unverified && <span>{t.unverifiedWebsite}</span>}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--mb-primary)', textDecoration: 'underline' }}
        >
          {t.source} <ExternalLink size={11} />
        </a>
      )}
    </span>
  );
};

export default ServiceEvidence;
