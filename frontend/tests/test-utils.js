export const TEST_USER = {
  id: 7,
  name: 'Giulia Verdi',
  email: 'giulia@example.test',
  role: 'USER',
  city: 'Bologna',
  publicArea: 'Saragozza',
  shareRadiusKm: 10,
  locationConsentAt: null,
  createdAt: '2026-09-04T10:00:00.000Z',
  updatedAt: '2026-09-04T10:00:00.000Z',
};

export function apiResponse(status, payload = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return payload === null ? '' : JSON.stringify(payload);
    },
  };
}

export function setRoute(path) {
  window.history.replaceState(null, '', path);
}
