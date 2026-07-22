import { BaseMasterDataRepository } from './BaseMasterDataRepository';
import type { Brand } from '../shared/types/MasterData';

export class BrandRepository extends BaseMasterDataRepository<Brand> {
  constructor() {
    super('brands', 'Brand');
  }
}

export const brandRepository = new BrandRepository();
