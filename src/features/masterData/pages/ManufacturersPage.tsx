import { MasterDataPageTemplate } from './MasterDataPageTemplate';
import { manufacturerRepository } from '../../../repositories/ManufacturerRepository';

export default function ManufacturersPage() {
  return (
    <MasterDataPageTemplate 
      title="Manufacturers"
      description="Manage the original equipment manufacturers (OEMs)."
      entityName="Manufacturer"
      repository={manufacturerRepository}
    />
  );
}
