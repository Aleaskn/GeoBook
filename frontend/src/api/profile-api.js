import { apiRequest } from './api-client.js';

export async function getProfile() {
  const data = await apiRequest('/profile');
  return data.user;
}

export async function updateProfile(profile) {
  const data = await apiRequest('/profile', { method: 'PATCH', body: profile });
  return data.user;
}

export async function updateProfileLocation(location) {
  const data = await apiRequest('/profile/location', { method: 'PATCH', body: location });
  return data.user;
}

export async function deleteProfileLocation() {
  await apiRequest('/profile/location', { method: 'DELETE' });
}
