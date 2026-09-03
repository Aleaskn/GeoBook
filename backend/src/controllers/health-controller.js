export function createHealthController(healthService) {
  return {
    async getHealth(_request, response) {
      const status = await healthService.getStatus();
      response.status(200).json({ data: status });
    },
  };
}
