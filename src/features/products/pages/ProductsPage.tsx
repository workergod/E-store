import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Edit, Eye, Archive, Trash2, AlertCircle, Printer, Filter } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const printRef = useRef<HTMLDivElement>(null);

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
    
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    return filtered;
  }, [products, showLowStock, showDeleted, statusFilter]);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { window.print(); return; }
    w.document.write(`
      <html><head><title>Products Report</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
        h2 { text-align: center; margin-bottom: 4px; }
        p.sub { text-align: center; color: #666; margin-bottom: 16px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 11px; border: 1px solid #ddd; }
        td { padding: 7px 8px; border: 1px solid #e5e7eb; font-size: 11px; vertical-align: top; }
      </style></head><body>
      ${content}
      <p style="text-align:center;margin-top:20px;font-size:10px;color:#999;">
        Printed on ${new Date().toLocaleString('en-IN')} • ${company?.companyName || 'E Store Pro'}
      </p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const handleExport = () => {
    if (displayedProducts.length === 0) {
      toast.error('No products to export');
      return;
    }

    const headers = ['Product Name', 'Short Name', 'SKU', 'Barcode', 'Current Stock', 'Minimum Stock', 'Status'];
    const csvContent = [
      headers.join(','),
      ...displayedProducts.map(p => 
        [
          `"${(p.name || '').replace(/"/g, '""')}"`,
          `"${(p.shortName || '').replace(/"/g, '""')}"`,
          `"${(p.sku || '').replace(/"/g, '""')}"`,
          `"${(p.barcode || '').replace(/"/g, '""')}"`,
          p.currentStock || 0,
          p.minimumStock || 0,
          p.status
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          
          <div className="flex items-center gap-2 border-l border-border pl-3 ml-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select 
              className="h-9 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Discontinued">Discontinued</option>
              <option value="Coming Soon">Coming Soon</option>
            </select>
          </div>

          <AppButton variant="outline" size="sm" onClick={handleExport}><Archive className="h-4 w-4 mr-2"/> Export</AppButton>
          <AppButton variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-2"/> Print</AppButton>
        </div>
      </FilterBar>

      {/* Hidden Print Layout */}
      <div ref={printRef} className="hidden">
        <h2>Products Inventory Report</h2>
        <p className="sub">
          Total Products: {displayedProducts.length} • Filter: {showDeleted ? 'Deleted' : (showLowStock ? 'Low Stock' : statusFilter)}
        </p>
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>SKU / Barcode</th>
              <th>Category / Brand</th>
              <th>Current Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedProducts.map(p => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong><br/>
                  <span style={{color: '#666', fontSize: '10px'}}>{p.shortName || '-'}</span>
                </td>
                <td>
                  SKU: {p.sku}<br/>
                  <span style={{color: '#666', fontSize: '10px'}}>{p.barcode || '-'}</span>
                </td>
                <td>
                  {/* Since categoryId and brandId might just be IDs without full join in this basic print view, we just show them or '-' if empty. 
                      In a full app we'd map these to names, but showing ID is fine for a quick print if name is absent */}
                  <span style={{fontSize: '10px'}}>{p.categoryId || 'No Category'}</span><br/>
                  <span style={{color: '#666', fontSize: '10px'}}>{p.brandId || 'No Brand'}</span>
                </td>
                <td style={{ fontWeight: p.currentStock <= p.minimumStock ? 'bold' : 'normal', color: p.currentStock <= p.minimumStock ? '#dc2626' : '#16a34a' }}>
                  {p.currentStock || 0}
                </td>
                <td>{p.status}</td>
              </tr>
            ))}
            {displayedProducts.length === 0 && (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: '15px'}}>No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
