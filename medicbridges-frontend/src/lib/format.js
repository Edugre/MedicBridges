/** Human-friendly distance from meters. */
export function formatDistance(meters) {
  if (meters === null || meters === undefined) return null;
  const km = meters / 1000;
  if (km < 1) return `${Math.round(meters)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Single-line address from the address parts of a site/pharmacy. */
export function formatAddress(item) {
  const parts = [
    item.address_line_1,
    item.city,
    [item.state, item.zip].filter(Boolean).join(' '),
  ].filter(Boolean);
  return parts.join(', ');
}

/** Google Maps directions URL to a site (by coords when available, else address). */
export function directionsUrl(item) {
  if (item.latitude != null && item.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
  }
  const addr = formatAddress(item);
  return addr ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}` : null;
}

/** Title-case a service category slug like "mental_health" -> "Mental Health". */
export function humanizeCategory(value) {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** The URL if it is http(s), else null (never render javascript:/data: links). */
export function safeHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Services offered at a specific site vs. only somewhere in the organization.
 * A site's own `services` are site-level evidence; anything else in
 * `org.services` (including level "site" entries confirmed at *other* sites)
 * is not confirmed for this site.
 */
export function splitServicesForSite(org, site) {
  const here = site?.services || [];
  const hereNames = new Set(here.map((s) => s.name));
  const orgOnly = (org?.services || []).filter((s) => !hereNames.has(s.name));
  return { here, orgOnly };
}
