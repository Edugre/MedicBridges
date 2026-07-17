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
  let parseFailed = false;
  const text = await resp.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
      parseFailed = true;
    }
  }

  // A 2xx response that isn't JSON means we hit the wrong origin (e.g. the SPA
  // host returned index.html because VITE_API_BASE_URL is unset). Treat it as
  // an error instead of handing non-JSON back to callers expecting objects.
  if (resp.ok && parseFailed) {
    throw new ApiError(
      'Unexpected non-JSON response from the API. Check VITE_API_BASE_URL.',
      { status: resp.status, code: 'unexpected_response', body },
    );
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

/**
 * Low-level JSON POST helper. Mirrors `apiGet`'s error contract.
 *
 * @param {string} path  API path beginning with `/`.
 * @param {object} [opts]
 * @param {object} [opts.body]     Serialized to JSON as the request body.
 * @param {object} [opts.headers]
 * @param {AbortSignal} [opts.signal]
 */
export async function apiPost(path, { body, headers, signal } = {}) {
  const url = `${BASE_URL}${path}`;

  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Network error — could not reach the server.', {
      status: 0,
      code: 'network_error',
    });
  }

  let parsed = null;
  const text = await resp.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!resp.ok) {
    const code = (parsed && parsed.error) || 'http_error';
    const message =
      (parsed && (parsed.message || parsed.detail)) ||
      `Request failed with status ${resp.status}`;
    throw new ApiError(message, { status: resp.status, code, body: parsed });
  }

  return parsed;
}
