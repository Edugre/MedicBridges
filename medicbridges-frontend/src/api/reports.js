// Data-quality reporting endpoint (the "Report an issue" flow).
import { apiPost } from './client';

/**
 * Submit a data-quality report. Returns { report_id, reference, status }.
 *
 * @param {object} payload  Shape matches api.schemas.reports.ReportSubmission:
 *   subject_type, subject_key, category, new_address?, feedback_topic?,
 *   description?, reporter_name?, reporter_organization?, reporter_email?,
 *   fields?: [{ field, currently_listed?, should_be? }]
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 */
export function submitReport(payload, { signal } = {}) {
  return apiPost('/api/v1/reports', { body: payload, signal });
}
