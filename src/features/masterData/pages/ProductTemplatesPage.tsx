import { MasterDataPageTemplate } from './MasterDataPageTemplate';
import { productTemplateRepository } from '../../../repositories/ProductTemplateRepository';

export default function ProductTemplatesPage() {
  return (
    <MasterDataPageTemplate 
      title="Product Templates"
      description="Manage predefined attribute templates for fast product creation."
      entityName="Product Template"
      repository={productTemplateRepository}
    />
  );
}
