import { apiRequest } from './api-client.js';

export async function getAdminStats({ signal } = {}) {
  const data = await apiRequest('/admin/stats', { signal });
  return data.stats;
}

export async function getRecentActivity({ signal } = {}) {
  const data = await apiRequest('/admin/recent-activity', { signal });
  return data.recentActivity;
}
