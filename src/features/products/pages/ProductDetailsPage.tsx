import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Barcode, History, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from "../../../store/authStore";
import { productRepository } from '../../../repositories/ProductRepository';
import { stockLedgerRepository } from '../../../repositories/StockLedgerRepository';
import type { Product } from '../../../shared/types/Product';
import type { StockTransaction } from '../../../shared/types/StockTransaction';
import { ProductTimeline } from '../../stock/components/ProductTimeline';
import { Button } from '../../../shared/ui/Button';

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company } = useAuthStore();
  const companyId = company?.companyId;

  const [product, setProduct] = useState<Product | null>(null);
  const [stockHistory, setStockHistory] = useState<StockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
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
    }
    fetchDetails();
  }, [id, companyId, navigate]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading product details...</div>;
  }

  if (!product) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{product.name}</h1>
          <p className="text-muted-foreground mt-1">SKU: {product.sku}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Barcode className="h-4 w-4 mr-2" /> Print Label</Button>
          <Button><Edit className="h-4 w-4 mr-2" /> Edit Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">Overview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium">{product.categoryId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Brand</p>
                <p className="font-medium">{product.brandId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{product.status}</p>
              </div>
              <div className="col-span-2 mt-4">
                <p className="text-muted-foreground">Description</p>
                <p className="mt-1 text-foreground">{product.description || 'No description provided.'}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Stock History</h3>
            </div>
            
            {stockHistory.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No stock movements recorded yet.</p>
            ) : (
              <ProductTimeline transactions={stockHistory} />
            )}
          </div>
        </div>

        {/* Right Column: Status & Images */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
             <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">Stock Summary</h3>
             <div className="text-4xl font-bold text-primary mb-2">{product.currentStock}</div>
             <p className="text-sm text-muted-foreground mb-4">Available Units</p>
             
             <div className="space-y-2 text-sm">
               <div className="flex justify-between">
                 <span className="text-muted-foreground">Reserved</span>
                 <span className="font-medium">0</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-muted-foreground">Min / Max Level</span>
                 <span className="font-medium">{product.minimumStock} / {product.maximumStock || '-'}</span>
               </div>
             </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
             <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
               <ImageIcon className="h-5 w-5 text-muted-foreground" />
               <h3 className="text-lg font-semibold">Product Image</h3>
             </div>
             <div className="aspect-square bg-muted rounded-lg flex items-center justify-center border border-border">
               {product.primaryImage ? (
                 <img src={product.primaryImage} alt={product.name} className="object-cover rounded-lg w-full h-full" />
               ) : (
                 <span className="text-muted-foreground">No Image</span>
               )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
