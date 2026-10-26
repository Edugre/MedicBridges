// "Register Your Clinic" submit endpoint.
import { apiPost } from './client';

/**
 * Submit a clinic registration. Returns { registration_id, reference }.
 *
 * @param {object} payload  Shape matches
 *   api.schemas.clinic_registrations.ClinicRegistrationSubmission.
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 */
export function submitClinicRegistration(payload, { signal } = {}) {
  return apiPost('/api/v1/clinic-registrations', { body: payload, signal });
}
