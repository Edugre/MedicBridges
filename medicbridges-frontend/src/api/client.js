// Core HTTP client for the MedicBridges FastAPI backend.
//
// In dev, VITE_API_BASE_URL is empty and requests hit same-origin relative
// paths that the Vite dev server proxies to the API (see vite.config.js).
// In production, set VITE_API_BASE_URL to the deployed API origin.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Error thrown for any non-2xx API response. Mirrors the backend error
 * contract: `{ error, message, ... }`.
 */
export class ApiError extends Error {
  constructor(message, { status, code, body } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => v !== undefined && v !== null && search.append(key, v));
    } else {
      search.append(key, value);
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Low-level request helper. Returns parsed JSON or throws ApiError.
 *
 * @param {string} path  API path beginning with `/` (e.g. `/api/v1/services`).
 * @param {object} [opts]
 * @param {object} [opts.params]   Query params (arrays become repeated keys).
 * @param {object} [opts.headers]
 * @param {AbortSignal} [opts.signal]
 */
export async function apiGet(path, { params, headers, signal } = {}) {
  const url = `${BASE_URL}${path}${buildQuery(params)}`;

  let resp;
  try {
    resp = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...headers },
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Network error — could not reach the server.', {
      status: 0,
      code: 'network_error',
    });
  }

  let body = null;
  const text = await resp.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!resp.ok) {
    const code = (body && body.error) || 'http_error';
    const message =
      (body && (body.message || body.detail)) ||
      `Request failed with status ${resp.status}`;
    throw new ApiError(message, { status: resp.status, code, body });
  }

  return body;
}
