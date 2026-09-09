import { apiRequest } from './api-client.js';

export async function createLoanRequest(bookId, message) {
  const body = message.trim() ? { message: message.trim() } : {};
  const data = await apiRequest(`/books/${bookId}/loan-requests`, { method: 'POST', body });
  return data.loanRequest;
}

export async function getLoanRequests(direction, { signal } = {}) {
  const searchParams = new window.URLSearchParams({ direction });
  const data = await apiRequest(`/me/loan-requests?${searchParams.toString()}`, { signal });
  return data.loanRequests;
}

export async function updateLoanRequestStatus(loanRequestId, status) {
  const data = await apiRequest(`/loan-requests/${loanRequestId}/status`, {
    method: 'PATCH',
    body: { status },
  });
  return data.loanRequest;
}
