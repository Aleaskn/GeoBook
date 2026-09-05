import { toCategoryDto } from '../utils/book-dto.js';

export function createCategoryService(categoryRepository) {
  return {
    async listCategories() {
      const categories = await categoryRepository.findAll();
      return categories.map(toCategoryDto);
    },
  };
}
