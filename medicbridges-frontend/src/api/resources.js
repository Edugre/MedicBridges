// Resource discovery endpoints: proximity search + org/site detail.
import { apiGet } from './client';

/**
 * Proximity search for clinics + matching 340B pharmacies.
 *
 * @param {object} args
 * @param {number} args.lat                Latitude (-90..90), required.
 * @param {number} args.lon                Longitude (-180..180), required.
 * @param {number} [args.radiusKm]         Search radius (1..20, default 5).
 * @param {number} [args.limit]            Organizations per page (<=100).
 * @param {string} [args.cursor]           Opaque pagination cursor.
 * @param {string[]} [args.resourceTypes]  Subset of ['site', 'pharmacy'].
 * @param {string[]} [args.serviceCategories]
 * @param {boolean} [args.acceptsSlidingScale]
 * @param {boolean} [args.has340b]
 * @param {string} [args.county]           County name ('Miami-Dade') or 5-digit FIPS.
 * @param {boolean} [args.includePharmaciesOutsideRadius]
 * @param {AbortSignal} [args.signal]
 */
export function searchNearby({
  lat,
  lon,
  radiusKm,
  limit,
  cursor,
  resourceTypes,
  serviceCategories,
  acceptsSlidingScale,
  has340b,
  county,
  includePharmaciesOutsideRadius,
  signal,
} = {}) {
  return apiGet('/api/v1/resources/nearby', {
    signal,
    params: {
      lat,
      lon,
      radius_km: radiusKm,
      limit,
      cursor,
      resource_types: resourceTypes,
      service_categories: serviceCategories,
      accepts_sliding_scale: acceptsSlidingScale,
      has_340b: has340b,
      county,
      include_pharmacies_outside_radius: includePharmaciesOutsideRadius,
    },
  });
}

/**
 * Offered service, as returned in `org.services` and `site.services`.
 *
 * `level: "org"` means offered somewhere in the organization's network, never
 * that a given site offers it. `site.services` only ever holds level "site".
 *
 * @typedef {object} OfferedService
 * @property {string|null} code
 * @property {string} name
 * @property {string} category
 * @property {'site'|'org'} level
 * @property {'website'|'hrsa_uds'|'directory'|'other'} source_kind
 * @property {string|null} source_url
 * @property {number|null} confidence
 * @property {boolean} is_verified
 */

/**
 * Full organization detail (all active sites + 340B pharmacies).
 * `county` narrows the sites to one county.
 */
export function getOrganization(orgId, { county, signal } = {}) {
  return apiGet(`/api/v1/resources/organizations/${encodeURIComponent(orgId)}`, {
    signal,
    params: { county },
  });
}

/** Single site detail. */
export function getSite(siteId, { signal } = {}) {
  return apiGet(`/api/v1/resources/sites/${encodeURIComponent(siteId)}`, { signal });
}
