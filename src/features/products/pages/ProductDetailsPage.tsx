import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, History, Image as ImageIcon, Trash2, RotateCcw, Package 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from "../../../store/authStore";
import { Role } from '../../../constants/roles';
import { productRepository } from '../../../repositories/ProductRepository';
import { stockLedgerRepository } from '../../../repositories/StockLedgerRepository';
import type { Product } from '../../../shared/types/Product';
import type { StockTransaction } from '../../../shared/types/StockTransaction';
import { ProductTimeline } from '../../stock/components/ProductTimeline';
import { ProductFormDialog } from '../components/ProductFormDialog';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company, user } = useAuthStore();
  const companyId = company?.companyId;

  // Permissions: Store Keeper, Supervisor, SuperAdmin, Owner, and MD can delete & restore products
  const userRole = (user?.role || '').toLowerCase().trim();
  const isStoreKeeper = 
    user?.role === Role.STORE_KEEPER || 
    userRole === 'store keeper' || 
    userRole === 'storekeeper' || 
    userRole === 'store_keeper' || 
    userRole.includes('store');
  const isSupervisor = 
    user?.role === Role.SUPERVISOR || 
    userRole === 'supervisor' || 
    userRole.includes('supervisor');
  const isSuperOrOwner = 
    user?.role === Role.SUPER_ADMIN || 
    user?.role === Role.OWNER || 
    (user?.role as any) === Role.MD ||
    userRole === 'superadmin' ||
    userRole === 'owner' ||
    userRole === 'md' ||
    user?.email === 'workshop9283@gmail.com' ||
    user?.email === 'developeremil@estorepro.internal';
  const canDelete = isSuperOrOwner || isStoreKeeper || isSupervisor;

  const [product, setProduct] = useState<Product | null>(null);
  const [stockHistory, setStockHistory] = useState<StockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchDetails = async () => {
    if (!companyId || !id) return;
    try {
      setIsLoading(true);
      const p = await productRepository.getById(id, companyId);
      if (!p) {
        toast.error("Product not found");
        navigate('/products');
        return;
      }
      setProduct(p);
      
      const history = await stockLedgerRepository.getHistoryByProduct(id, companyId);
      setStockHistory(history);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load product details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!companyId || !user || !product) return;
    if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      try {
        setIsLoading(true);
        await productRepository.delete(product.id, companyId, user.uid, {
          name: user.fullName || user.username || user.email || 'Staff',
          role: (user.role as string) || 'Supervisor'
        });
        toast.success('Product deleted successfully');
        navigate('/products');
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete product');
        setIsLoading(false);
      }
    }
  };

  const handleRestore = async () => {
    if (!companyId || !user || !product) return;
    if (window.confirm(`Are you sure you want to restore "${product.name}" back to Active inventory?`)) {
      try {
        setIsLoading(true);
        await productRepository.restore(product.id, companyId, user.uid);
        toast.success(`Product "${product.name}" restored successfully`);
        fetchDetails();
      } catch (error: any) {
        toast.error(error.message || 'Failed to restore product');
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id, companyId, navigate]);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="p-12 text-center text-muted-foreground font-medium">
          Loading product details...
        </div>
      </PageContainer>
    );
  }

  if (!product) return null;

  return (
    <PageContainer>
      {/* Top Navigation */}
      <div className="mb-2">
        <AppButton 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/products')} 
          className="-ml-3 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </AppButton>
      </div>

      {/* Main Page Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {product.name}
            </h1>
            <StatusBadge status={product.status || 'Active'} />
            {product.isTool && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Tool
              </span>
            )}
          </div>
        }
        description={
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border">
              SKU: {product.sku}
            </span>
            {product.barcode && (
              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                Barcode: {product.barcode}
              </span>
            )}
            {product.shortName && (
              <span className="text-xs text-muted-foreground">
                Alias: <span className="font-medium text-foreground">{product.shortName}</span>
              </span>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {product.status !== 'DELETED' && (
              <AppButton onClick={() => setIsFormOpen(true)} className="shadow-xs">
                <Edit className="h-4 w-4 mr-2" /> Edit Product
              </AppButton>
            )}
            {canDelete && product.status !== 'DELETED' && (
              <AppButton 
                variant="destructive" 
                onClick={handleDelete} 
                className="shadow-xs"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Product
              </AppButton>
            )}
            {canDelete && product.status === 'DELETED' && (
              <AppButton 
                variant="outline" 
                onClick={handleRestore} 
                className="text-emerald-600 hover:bg-emerald-50 border-emerald-500/30"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Restore Product
              </AppButton>
            )}
          </div>
        }
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Overview and Stock Ledger History (2 columns on lg) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Overview Card */}
          <AppCard className="p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-5">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Overview & Specifications</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-6 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</p>
                <p className="font-semibold text-foreground mt-1 capitalize">{product.categoryId || 'General'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand</p>
                <p className="font-semibold text-foreground mt-1 capitalize">{product.brandId || 'General'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit</p>
                <p className="font-semibold text-foreground mt-1 uppercase">{product.unitId || product.unit || 'pcs'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rack / Location</p>
                <p className="font-semibold text-foreground mt-1">{product.rackLocationId || 'Not Assigned'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item Classification</p>
                <p className="font-semibold text-foreground mt-1">{product.isTool ? 'Tool / Equipment' : 'Store Material'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Barcode</p>
                <p className="font-semibold font-mono text-foreground mt-1">{product.barcode || '—'}</p>
              </div>
            </div>

            {/* Description Section */}
            <div className="pt-5 border-t border-border mt-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Description</p>
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60 text-sm text-foreground leading-relaxed">
                {product.description?.trim() ? (
                  product.description
                ) : (
                  <span className="text-muted-foreground italic">No description provided.</span>
                )}
              </div>
            </div>
          </AppCard>

          {/* Stock History & Movements Card */}
          <AppCard className="p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Stock History</h3>
              </div>
              {stockHistory.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {stockHistory.length} Movement{stockHistory.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            
            {stockHistory.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-muted/70 flex items-center justify-center mb-2">
                  <History className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-foreground">No stock movements recorded yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Transactions and issue/return logs for this item will appear here.</p>
              </div>
            ) : (
              <ProductTimeline transactions={stockHistory} />
            )}
          </AppCard>
        </div>

        {/* Right Column: Stock Summary & Product Image */}
        <div className="space-y-6">
          
          {/* Stock Summary Card */}
          <AppCard className="p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-base font-semibold text-foreground">Stock Summary</h3>
              <StatusBadge status={product.status || 'Active'} />
            </div>

            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Current Stock</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-primary">
                  {product.currentStock}
                </span>
                <span className="text-base font-medium text-muted-foreground">
                  {product.unitId || product.unit || 'nos'}
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-primary/10 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Availability</span>
                {product.currentStock <= (product.minimumStock || 0) ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                    Low Stock Alert
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    In Stock & Available
                  </span>
                )}
              </div>
            </div>
             
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Reserved</span>
                <span className="font-semibold font-mono text-foreground">0</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Min Alert Level</span>
                <span className="font-semibold font-mono text-foreground">{product.minimumStock ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Max Capacity Level</span>
                <span className="font-semibold font-mono text-foreground">{product.maximumStock ? product.maximumStock : '—'}</span>
              </div>
            </div>
          </AppCard>

          {/* Product Image Card */}
          <AppCard className="p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">Product Image</h3>
              </div>
            </div>

            <div className="h-52 w-full bg-muted/30 rounded-xl flex flex-col items-center justify-center border border-dashed border-border overflow-hidden p-2">
              {product.primaryImage ? (
                <img 
                  src={product.primaryImage} 
                  alt={product.name} 
                  className="object-contain w-full h-full rounded-lg" 
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/80 flex items-center justify-center mb-2">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">No image uploaded</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Use "Edit Product" to upload a photo</p>
                </div>
              )}
            </div>
          </AppCard>

        </div>
      </div>

      {isFormOpen && (
        <ProductFormDialog
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={fetchDetails}
          product={product}
        />
      )}
    </PageContainer>
  );
}
