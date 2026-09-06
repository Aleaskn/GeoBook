export function createBookController(bookService) {
  return {
    async listOwnedBooks(request, response) {
      const books = await bookService.listOwnedBooks(request.auth.userId);
      response.status(200).json({ data: { books } });
    },

    async createBook(request, response) {
      const book = await bookService.createBook(
        request.auth.userId,
        request.validatedBody,
        request.file,
      );
      response.status(201).json({ data: { book } });
    },

    async updateBook(request, response) {
      const book = await bookService.updateBook(
        request.auth.userId,
        request.validatedParams.id,
        request.validatedBody,
        request.file,
      );
      response.status(200).json({ data: { book } });
    },

    async deleteBook(request, response) {
      await bookService.deleteBook(request.auth.userId, request.validatedParams.id);
      response.status(204).send();
    },
  };
}
