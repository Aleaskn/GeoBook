export function createCategoryController(categoryService) {
  return {
    async listCategories(_request, response) {
      const categories = await categoryService.listCategories();
      response.status(200).json({ data: { categories } });
    },
  };
}
