import { apiRequest } from './api-client.js';

export async function listCategories() {
  const data = await apiRequest('/categories');
  return data.categories;
}

export async function listMyBooks() {
  const data = await apiRequest('/me/books');
  return data.books;
}

export async function createBook(book) {
  const data = await apiRequest('/books', { method: 'POST', body: book });
  return data.book;
}

export async function updateBook(bookId, changes) {
  const data = await apiRequest('/books/' + bookId, { method: 'PATCH', body: changes });
  return data.book;
}

export function deleteBook(bookId) {
  return apiRequest('/books/' + bookId, { method: 'DELETE' });
}
