import { MasterDataPageTemplate } from './MasterDataPageTemplate';
import { productTypeRepository } from '../../../repositories/ProductTypeRepository';

export default function ProductTypesPage() {
  return (
    <MasterDataPageTemplate 
      title="Product Types"
      description="Manage abstract product classifications (e.g. Electronics, Furniture)."
      entityName="Product Type"
      repository={productTypeRepository}
    />
  );
}
