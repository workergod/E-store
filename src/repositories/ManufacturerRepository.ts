import { BaseMasterDataRepository } from './BaseMasterDataRepository';
import type { Manufacturer } from '../shared/types/MasterData';

export class ManufacturerRepository extends BaseMasterDataRepository<Manufacturer> {
  constructor() {
    super('manufacturers', 'Manufacturer');
  }
}

export const manufacturerRepository = new ManufacturerRepository();
