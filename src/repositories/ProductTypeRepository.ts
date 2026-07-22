import { BaseMasterDataRepository } from './BaseMasterDataRepository';
import type { ProductType } from '../shared/types/MasterData';

export class ProductTypeRepository extends BaseMasterDataRepository<ProductType> {
  constructor() {
    super('productTypes', 'Product Type');
  }
}

export const productTypeRepository = new ProductTypeRepository();
