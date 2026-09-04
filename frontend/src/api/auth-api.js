import { apiRequest } from './api-client.js';

export async function getCurrentUser() {
  const data = await apiRequest('/auth/me');
  return data.user;
}

export async function login(credentials) {
  const data = await apiRequest('/auth/login', { method: 'POST', body: credentials });
  return data.user;
}

export async function register(account) {
  const data = await apiRequest('/auth/register', { method: 'POST', body: account });
  return data.user;
}

export function logout() {
  return apiRequest('/auth/logout', { method: 'POST' });
}
