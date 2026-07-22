import { BaseMasterDataRepository } from './BaseMasterDataRepository';
import type { RackLocation } from '../shared/types/MasterData';

export class RackLocationRepository extends BaseMasterDataRepository<RackLocation> {
  constructor() {
    super('rackLocations', 'Rack Location');
  }
}

export const rackLocationRepository = new RackLocationRepository();
