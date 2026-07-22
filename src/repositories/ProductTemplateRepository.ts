import { BaseMasterDataRepository } from './BaseMasterDataRepository';
import type { ProductTemplate } from '../shared/types/MasterData';

export class ProductTemplateRepository extends BaseMasterDataRepository<ProductTemplate> {
  constructor() {
    super('productTemplates', 'Product Template');
  }
}

export const productTemplateRepository = new ProductTemplateRepository();
