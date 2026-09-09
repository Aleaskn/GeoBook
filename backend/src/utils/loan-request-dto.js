const PLACEHOLDER_COVER_PATH = '/uploads/placeholder-cover.svg';

export function toLoanRequestDto(loanRequest) {
  return {
    id: String(loanRequest.id),
    status: loanRequest.status,
    message: loanRequest.message,
    createdAt: loanRequest.createdAt,
    respondedAt: loanRequest.respondedAt,
    returnedAt: loanRequest.returnedAt,
    book: {
      id: String(loanRequest.bookId),
      title: loanRequest.bookTitle,
      author: loanRequest.bookAuthor,
      thumbnailPath: loanRequest.thumbnailPath ?? PLACEHOLDER_COVER_PATH,
    },
    requester: {
      id: String(loanRequest.requesterId),
      name: loanRequest.requesterName,
    },
    owner: {
      id: String(loanRequest.ownerId),
      name: loanRequest.ownerName,
    },
  };
}
