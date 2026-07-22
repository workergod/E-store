import { MasterDataPageTemplate } from './MasterDataPageTemplate';
import { brandRepository } from '../../../repositories/BrandRepository';

export default function BrandsPage() {
  return (
    <MasterDataPageTemplate 
      title="Brands"
      description="Manage product brands and manufacturers."
      entityName="Brand"
      repository={brandRepository}
    />
  );
}
