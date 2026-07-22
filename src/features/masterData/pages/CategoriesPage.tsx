import { MasterDataPageTemplate } from './MasterDataPageTemplate';
import { categoryRepository } from '../../../repositories/CategoryRepository';

export default function CategoriesPage() {
  return (
    <MasterDataPageTemplate 
      title="Categories"
      description="Manage product categories and groupings."
      entityName="Category"
      repository={categoryRepository}
    />
  );
}
