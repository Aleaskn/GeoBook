export function createProfileController(profileService) {
  return {
    async getProfile(request, response) {
      const user = await profileService.getProfile(request.auth.userId);
      response.status(200).json({ data: { user } });
    },

    async updateProfile(request, response) {
      const user = await profileService.updateProfile(request.auth.userId, request.validatedBody);
      response.status(200).json({ data: { user } });
    },

    async updateLocation(request, response) {
      const user = await profileService.updateLocation(request.auth.userId, request.validatedBody);
      response.status(200).json({ data: { user } });
    },

    async deleteLocation(request, response) {
      await profileService.deleteLocation(request.auth.userId);
      response.status(204).send();
    },
  };
}
