export function createAdminController(adminService) {
  return {
    async getStats(_request, response) {
      const stats = await adminService.getStats();
      response.status(200).json({ data: { stats } });
    },

    async getRecentActivity(_request, response) {
      const recentActivity = await adminService.getRecentActivity();
      response.status(200).json({ data: { recentActivity } });
    },
  };
}
