import { BaseMasterDataRepository } from './BaseMasterDataRepository';
import type { Unit } from '../shared/types/MasterData';

export class UnitRepository extends BaseMasterDataRepository<Unit> {
  constructor() {
    super('units', 'Unit');
  }
}

export const unitRepository = new UnitRepository();
