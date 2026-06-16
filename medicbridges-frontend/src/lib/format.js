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

/** Title-case a service category slug like "mental_health" -> "Mental Health". */
export function humanizeCategory(value) {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
