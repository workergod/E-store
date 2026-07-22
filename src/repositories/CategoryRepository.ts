import { BaseMasterDataRepository } from './BaseMasterDataRepository';
import type { Category } from '../shared/types/MasterData';

export class CategoryRepository extends BaseMasterDataRepository<Category> {
  constructor() {
    super('categories', 'Category');
  }

  // Future: override checkDependencies to see if any products use this category
}

export const categoryRepository = new CategoryRepository();
