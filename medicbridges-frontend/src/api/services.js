// Service taxonomy endpoint (used to populate filter UIs).
import { apiGet } from './client';

/** Returns the full list of services, ordered by category then name. */
export function listServices({ signal } = {}) {
  return apiGet('/api/v1/services', { signal });
}
