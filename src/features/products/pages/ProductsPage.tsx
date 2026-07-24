import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Edit, Eye, Tag, Archive, Trash2, AlertCircle } from 'lucide-react';
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
  const location = useLocation();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [showLowStock, setShowLowStock] = useState(location.state?.filter === 'low-stock');
  const [showDeleted, setShowDeleted] = useState(false);

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

  const handleDelete = async (product: Product) => {
    if (!companyId || !user) return;
    if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      try {
        setIsLoading(true);
        await productRepository.delete(product.id, companyId, user.uid);
        toast.success('Product deleted successfully');
        loadProducts();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete product');
        setIsLoading(false);
      }
    }
  };
  const displayedProducts = useMemo(() => {
    let filtered = products;
    if (showDeleted) {
      filtered = filtered.filter(p => p.status === 'DELETED');
    } else {
      filtered = filtered.filter(p => p.status !== 'DELETED');
    }
    
    if (showLowStock) {
      filtered = filtered.filter(p => (p.currentStock || 0) <= (p.minimumStock || 0));
    }
    return filtered;
  }, [products, showLowStock, showDeleted]);  const columns = useMemo<ColumnDef<Product>[]>(
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
            {row.original.status !== 'DELETED' && (
              <AppButton variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
                <Edit className="h-4 w-4" />
              </AppButton>
            )}
            <AppButton variant="ghost" size="icon" onClick={() => navigate(`/products/${row.original.id}`)}>
              <Eye className="h-4 w-4" />
            </AppButton>
            {row.original.status !== 'DELETED' && (
              <AppButton variant="ghost" size="icon" onClick={() => handleDelete(row.original)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </AppButton>
            )}
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
          <AppButton 
            variant={showDeleted ? "default" : "outline"} 
            size="sm" 
            onClick={() => {
              setShowDeleted(!showDeleted);
              if (!showDeleted) setShowLowStock(false);
            }}
            className={showDeleted ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            <Trash2 className="h-4 w-4 mr-2"/> 
            Deleted Products
          </AppButton>
          <AppButton 
            variant={showLowStock ? "default" : "outline"} 
            size="sm" 
            onClick={() => {
              setShowLowStock(!showLowStock);
              if (!showLowStock) setShowDeleted(false);
            }}
          >
            <AlertCircle className="h-4 w-4 mr-2"/> 
            Low Stock Only
          </AppButton>
          <AppButton variant="outline" size="sm"><Tag className="h-4 w-4 mr-2"/> Filter</AppButton>
          <AppButton variant="outline" size="sm"><Archive className="h-4 w-4 mr-2"/> Export</AppButton>
        </div>
      </FilterBar>

      <AppTable 
        columns={columns}
        data={displayedProducts}
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
