import { apiRequest } from './api-client.js';

export async function getProfile() {
  const data = await apiRequest('/profile');
  return data.user;
}

export async function updateProfile(profile) {
  const data = await apiRequest('/profile', { method: 'PATCH', body: profile });
  return data.user;
}
