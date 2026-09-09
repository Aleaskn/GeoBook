export function createLoanRequestController(loanRequestService) {
  return {
    async createLoanRequest(request, response) {
      const loanRequest = await loanRequestService.createLoanRequest(
        request.auth.userId,
        request.validatedParams.id,
        request.validatedBody,
      );
      response.status(201).json({ data: { loanRequest } });
    },

    async listLoanRequests(request, response) {
      const loanRequests = await loanRequestService.listLoanRequests(
        request.auth.userId,
        request.validatedQuery.direction,
      );
      response.status(200).json({ data: { loanRequests } });
    },

    async updateLoanRequestStatus(request, response) {
      const loanRequest = await loanRequestService.updateLoanRequestStatus(
        request.auth.userId,
        request.validatedParams.id,
        request.validatedBody.status,
      );
      response.status(200).json({ data: { loanRequest } });
    },
  };
}
