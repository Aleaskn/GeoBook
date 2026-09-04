const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(
  /\/$/,
  '',
);

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

  try {
    response = await window.fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
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
