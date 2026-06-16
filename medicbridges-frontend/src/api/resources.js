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
      include_pharmacies_outside_radius: includePharmaciesOutsideRadius,
    },
  });
}

/** Full organization detail (all active sites + 340B pharmacies). */
export function getOrganization(orgId, { signal } = {}) {
  return apiGet(`/api/v1/resources/organizations/${encodeURIComponent(orgId)}`, {
    signal,
  });
}

/** Single site detail. */
export function getSite(siteId, { signal } = {}) {
  return apiGet(`/api/v1/resources/sites/${encodeURIComponent(siteId)}`, { signal });
}
