import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Eye, Tag, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from "../../../store/authStore";
import { productRepository } from '../../../repositories/ProductRepository';
import type { Product } from '../../../shared/types/Product';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { FilterBar } from '../../../shared/layouts/FilterBar';
import { AppButton } from '../../../shared/app/AppButton';
import { AppTable } from '../../../shared/tables/AppTable';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';
import { ProductFormDialog } from '../components/ProductFormDialog';
import type { ColumnDef } from '@tanstack/react-table';

export default function ProductsPage() {
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);

  const loadProducts = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await productRepository.getAll(companyId);
      setProducts(data);
    } catch (error) {
      toast.error('Failed to load products');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleAdd = () => {
    setSelectedProduct(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleSeed = async () => {
    if (!companyId || !user) {
      toast.error('You must be logged in to seed data');
      return;
    }
    try {
      setIsLoading(true);

      // Load existing SKUs to avoid duplicates without composite queries
      const existingProducts = await productRepository.getAll(companyId);
      const existingSkus = new Set(existingProducts.map(p => p.sku));

      const demoProducts = [
        { name: 'Copper Pipe 1/4" (per meter)', shortName: 'Cop Pipe 1/4"', sku: 'COP-14-M', openingStock: 100, minimumStock: 20 },
        { name: 'Copper Pipe 1/2" (per meter)', shortName: 'Cop Pipe 1/2"', sku: 'COP-12-M', openingStock: 50, minimumStock: 10 },
        { name: 'Copper Pipe 3/4" (per meter)', shortName: 'Cop Pipe 3/4"', sku: 'COP-34-M', openingStock: 30, minimumStock: 5 },
        { name: 'Insulation Tape (Black)', shortName: 'Ins Tape Blk', sku: 'TAPE-INS-BLK', openingStock: 200, minimumStock: 50 },
        { name: 'Teflon Tape (Roll)', shortName: 'Teflon Tape', sku: 'TAPE-TEF-01', openingStock: 500, minimumStock: 100 },
        { name: 'Capacitor 1.5 uF', shortName: 'Cap 1.5uF', sku: 'CAP-15-UF', openingStock: 40, minimumStock: 10 },
        { name: 'Capacitor 2.5 uF', shortName: 'Cap 2.5uF', sku: 'CAP-25-UF', openingStock: 30, minimumStock: 10 },
        { name: 'Capacitor 4 uF', shortName: 'Cap 4uF', sku: 'CAP-4-UF', openingStock: 20, minimumStock: 5 },
        { name: 'AC Refrigerant R410A (Cylinder)', shortName: 'R410A Cyl', sku: 'REF-R410A', openingStock: 15, minimumStock: 5 },
        { name: 'AC Refrigerant R22 (Cylinder)', shortName: 'R22 Cyl', sku: 'REF-R22', openingStock: 10, minimumStock: 3 },
        { name: 'PVC Conduit Pipe (per meter)', shortName: 'PVC Conduit', sku: 'PVC-COND-M', openingStock: 300, minimumStock: 50 },
        { name: 'Electrical Wire 1.5mm (per meter)', shortName: 'Wire 1.5mm', sku: 'WIRE-15-M', openingStock: 1000, minimumStock: 200 },
        { name: 'Cable Tie (Pack of 100)', shortName: 'Cable Ties', sku: 'CTIE-100', openingStock: 100, minimumStock: 20 },
        { name: 'Thermostat (Digital)', shortName: 'Thermostat', sku: 'THERM-DIG', openingStock: 25, minimumStock: 5 },
      ];

      let added = 0;
      let skipped = 0;

      for (const prod of demoProducts) {
        if (existingSkus.has(prod.sku)) {
          skipped++;
          continue;
        }
        try {
          await productRepository.createDirect({
            companyId,
            name: prod.name,
            shortName: prod.shortName,
            sku: prod.sku,
            categoryId: 'general',
            brandId: 'general',
            unitId: 'pcs',
            openingStock: prod.openingStock,
            currentStock: prod.openingStock,
            minimumStock: prod.minimumStock,
            isSerialized: false,
            status: 'Active',
          }, user.uid);
          added++;
        } catch (err: any) {
          console.error('Seed error for', prod.name, ':', err.message);
        }
      }

      if (added > 0) {
        toast.success(`✅ Added ${added} products to inventory!${skipped > 0 ? ` (${skipped} already existed)` : ''}`);
      } else if (skipped > 0) {
        toast.info(`All ${skipped} demo products already exist in your inventory.`);
      } else {
        toast.error('No products were added. Check the console for errors.');
      }

      await loadProducts();
    } catch (error: any) {
      console.error('Seed failed:', error);
      toast.error('Failed to seed products: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }

  };

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Product Name',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.name}</span>
            <span className="text-[12px] text-muted-foreground mt-0.5">{row.original.shortName || 'No short name'}</span>
          </div>
        )
      },
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.sku}</span>
      },
      {
        accessorKey: 'currentStock',
        header: 'Stock',
        cell: ({ row }) => {
          const isLow = row.original.currentStock <= row.original.minimumStock;
          return (
            <span className={`font-semibold ${isLow ? 'text-destructive' : 'text-success'}`}>
              {row.original.currentStock}
            </span>
          )
        }
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <AppButton variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
              <Edit className="h-4 w-4" />
            </AppButton>
            <AppButton variant="ghost" size="icon" onClick={() => navigate(`/products/${row.original.id}`)}>
              <Eye className="h-4 w-4" />
            </AppButton>
          </div>
        )
      }
    ],
    [navigate]
  );

  return (
    <PageContainer>
      <PageHeader 
        title="Products" 
        description="Manage inventory items and variants."
        actions={
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={handleSeed}>
              Seed Demo Data
            </AppButton>
            <AppButton onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </AppButton>
          </div>
        }
      />

      <FilterBar>
        {/* The SearchBar is handled automatically by AppTable, we just place the secondary actions here if we want,
            or we can just leave the space for future advanced filters. AppTable takes a searchKey so it renders its own search. */}
        <div className="flex items-center gap-3 ml-auto">
          <AppButton variant="outline" size="sm"><Tag className="h-4 w-4 mr-2"/> Filter</AppButton>
          <AppButton variant="outline" size="sm"><Archive className="h-4 w-4 mr-2"/> Export</AppButton>
        </div>
      </FilterBar>

      <AppTable 
        columns={columns}
        data={products}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="Search products, SKU, Barcode..."
        emptyTitle="No products found"
        emptyDescription="Get started by creating your first product or try adjusting your search filters."
      />

      {isFormOpen && (
        <ProductFormDialog
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={loadProducts}
          product={selectedProduct}
        />
      )}
    </PageContainer>
  );
}
