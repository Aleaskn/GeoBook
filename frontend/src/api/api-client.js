const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(
  /\/$/,
  '',
);
const PLACEHOLDER_COVER_PATH = '/uploads/placeholder-cover.svg';

export class ApiError extends Error {
  constructor({ status, code, message, details = [], requestId, cause }) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

async function readPayload(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ApiError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: 'Il server ha restituito una risposta non valida.',
      cause: error,
    });
  }
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  let response;
  const isFormData = typeof window.FormData !== 'undefined' && body instanceof window.FormData;

  try {
    response = await window.fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      // Il browser deve generare autonomamente il boundary delle richieste multipart.
      headers:
        body === undefined || isFormData ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined || isFormData ? body : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }

    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Impossibile contattare il server. Verifica che il backend sia attivo.',
      cause: error,
    });
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: payload?.error?.code ?? 'HTTP_ERROR',
      message: payload?.error?.message ?? 'La richiesta non è stata completata.',
      details: Array.isArray(payload?.error?.details) ? payload.error.details : [],
      requestId: payload?.error?.requestId,
    });
  }

  return payload?.data ?? null;
}

export function resolveApiAssetUrl(assetPath) {
  const safePath = assetPath?.startsWith('/uploads/') ? assetPath : PLACEHOLDER_COVER_PATH;
  return new window.URL(safePath, API_BASE_URL).href;
}
