import { MasterDataPageTemplate } from './MasterDataPageTemplate';
import { unitRepository } from '../../../repositories/UnitRepository';

export default function UnitsPage() {
  return (
    <MasterDataPageTemplate 
      title="Units of Measurement"
      description="Manage product units (e.g. Kg, Box, Piece)."
      entityName="Unit"
      repository={unitRepository}
    />
  );
}
