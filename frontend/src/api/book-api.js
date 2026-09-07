import { apiRequest } from './api-client.js';

function createBookFormData(book) {
  const formData = new window.FormData();

  Object.entries(book).forEach(([field, value]) => {
    if (value === undefined || field === 'cover') {
      return;
    }

    if (field === 'categoryIds') {
      formData.append(field, JSON.stringify(value));
      return;
    }

    formData.append(field, value === null ? '' : String(value));
  });

  if (book.cover) {
    formData.append('cover', book.cover);
  }

  return formData;
}

export async function listCategories() {
  const data = await apiRequest('/categories');
  return data.categories;
}

export async function listMyBooks() {
  const data = await apiRequest('/me/books');
  return data.books;
}

export async function searchBooks(filters, { signal } = {}) {
  const searchParams = new window.URLSearchParams();

  Object.entries(filters).forEach(([name, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(name, String(value));
    }
  });

  const query = searchParams.toString();
  return apiRequest('/books' + (query ? `?${query}` : ''), { signal });
}

export async function createBook(book) {
  const data = await apiRequest('/books', { method: 'POST', body: createBookFormData(book) });
  return data.book;
}

export async function updateBook(bookId, changes) {
  const data = await apiRequest('/books/' + bookId, {
    method: 'PATCH',
    body: createBookFormData(changes),
  });
  return data.book;
}

export function deleteBook(bookId) {
  return apiRequest('/books/' + bookId, { method: 'DELETE' });
}
