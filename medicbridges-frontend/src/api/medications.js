// Medication reference endpoints (RxNorm / openFDA Postgres cache).
import { apiGet } from './client';

/** Typeahead suggestions for a partial drug name (q must be >= 2 chars). */
export function autocompleteMedications(q, { limit = 10, signal } = {}) {
  return apiGet('/api/v1/medications/autocomplete', { params: { q, limit }, signal });
}

/** Search medications by name or NDC. */
export function searchMedications(q, { limit = 20, signal } = {}) {
  return apiGet('/api/v1/medications/search', { params: { q, limit }, signal });
}

/** Lookup a single medication by RxNorm concept id. */
export function getMedication(rxcui, { signal } = {}) {
  return apiGet(`/api/v1/medications/${encodeURIComponent(rxcui)}`, { signal });
}
