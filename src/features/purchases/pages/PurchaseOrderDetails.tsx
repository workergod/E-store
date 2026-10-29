import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, PackageOpen, Printer, Trash2, Edit, Eye
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/firestore';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { Role } from '../../../constants/roles';
import { purchaseOrderRepository } from '../../../repositories/PurchaseOrderRepository';
import { supplierRepository } from '../../../repositories/SupplierRepository';
import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder';
import type { Supplier } from '../../../shared/types/Supplier';
import { PurchaseOrderPrintDocument } from '../components/PurchaseOrderPrintDocument';
import { printPurchaseOrder } from '../utils/printPurchaseOrder';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';
import { AppDialog } from '../../../shared/overlays/AppDialog';

export default function PurchaseOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [supplierObj, setSupplierObj] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displaySupplier, setDisplaySupplier] = useState<string>('');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // Receiving state
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  const canDelete = 
    user?.role === Role.SUPER_ADMIN || 
    user?.role === Role.OWNER || 
    (user?.role as any) === Role.MD || 
    (user?.role as any) === 'MD' ||
    user?.email === 'workshop9283@gmail.com' || 
    user?.username === '@developeremil' ||
    user?.username === '@developeremilmd';

  useEffect(() => {
    const fetchPO = async () => {
      if (!companyId || !id) return;
      try {
        setIsLoading(true);
        const data = await purchaseOrderRepository.getById(id, companyId);
        if (!data) {
          toast.error("Purchase not found");
          navigate('/purchases');
          return;
        }
        setPo(data);

        // Resolve supplier details
        if (data.supplierName) {
          setDisplaySupplier(data.supplierName);
        }
        if (data.supplierId) {
          try {
            const s = await supplierRepository.getById(data.supplierId, companyId);
            if (s) {
              setSupplierObj(s);
              if (!data.supplierName) setDisplaySupplier(s.companyName);
            }
          } catch {
            // ignore
          }
        }
        
        const initialQties: Record<string, number> = {};
        (data.items || []).forEach(item => {
          const remaining = item.quantity - (item.receivedQuantity || 0);
          initialQties[item.productId] = remaining > 0 ? remaining : 0;
        });
        setReceiveQuantities(initialQties);
        
      } catch (error) {
        toast.error('Failed to load Purchase details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPO();
  }, [id, companyId, navigate]);

  const handleDeletePO = async () => {
    if (!companyId || !user || !po?.id) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete Purchase "${po.poNumber}"?\n\nIf any goods were already received, stock will be automatically reverted.`
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await purchaseOrderRepository.delete(po.id, companyId, user.uid);
      toast.success(`Purchase ${po.poNumber} deleted successfully`);
      navigate('/purchases');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete Purchase');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReceiveGoods = async () => {
    if (!companyId || !user || !po?.id) return;
    try {
      setIsReceiving(true);
      const itemsToReceive = po.items.map(item => ({
        productId: item.productId,
        qtyToReceive: receiveQuantities[item.productId] || 0
      })).filter(i => i.qtyToReceive > 0);

      if (itemsToReceive.length === 0) {
        toast.error("Enter at least one quantity to receive");
        return;
      }

      await purchaseOrderRepository.receiveGoods(po.id, companyId, itemsToReceive, user.uid);
      toast.success("Goods received and stock ledger updated!");
      
      const data = await purchaseOrderRepository.getById(po.id, companyId);
      setPo(data);
      setIsReceiveModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to receive goods");
    } finally {
      setIsReceiving(false);
    }
  };

  const handlePrint = () => {
    if (!po) return;
    printPurchaseOrder(
      po, 
      supplierObj, 
      company, 
      user?.displayName || user?.email || 'Store In-Charge'
    );
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-medium">Loading Purchase details...</div>;
  if (!po) return null;

  const totalQty = (po.items || []).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const totalReceivedQty = (po.items || []).reduce((acc, curr) => acc + (Number(curr.receivedQuantity) || 0), 0);
  const grandTotal = po.totalAmount !== undefined 
    ? po.totalAmount 
    : (po.items || []).reduce((acc, curr) => acc + ((Number(curr.quantity) || 0) * (Number(curr.unitPrice) || 0)), 0);

  return (
    <>
      <div className="no-print">
        <PageContainer>
          <div className="mb-[var(--spacing-md)]">
            <AppButton variant="ghost" size="sm" onClick={() => navigate('/purchases')} className="-ml-4 text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Purchases
            </AppButton>
          </div>

          <PageHeader 
            title={
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                  Purchase Order
                </span>
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {po.poNumber}
                </span>
              </div>
            }
            description={`Created on ${po.purchaseDate && typeof (po.purchaseDate as any).toDate === 'function' ? (po.purchaseDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}${displaySupplier ? ` • Supplier: ${displaySupplier}` : ''}`}
            actions={
              <div className="flex gap-2.5 items-center flex-wrap">
                {po.status !== 'Completed' && po.status !== 'Cancelled' && (
                  <>
                    <AppButton onClick={() => navigate(`/purchases/edit/${po.id}`)} variant="outline">
                      <Edit className="h-4 w-4 mr-2" /> Edit Order
                    </AppButton>
                    <AppButton onClick={() => setIsReceiveModalOpen(true)} variant="success">
                      <PackageOpen className="h-4 w-4 mr-2" /> Receive Goods
                    </AppButton>
                  </>
                )}
                <AppButton variant="outline" onClick={() => setIsPrintPreviewOpen(true)}>
                  <Eye className="h-4 w-4 mr-2" /> Preview Document
                </AppButton>
                <AppButton onClick={handlePrint} className="shadow-xs">
                  <Printer className="h-4 w-4 mr-2" /> Print Purchase Order
                </AppButton>
                {canDelete && (
                  <AppButton 
                    variant="destructive" 
                    onClick={handleDeletePO} 
                    disabled={isDeleting}
                    title="Delete this purchase"
                    className="shadow-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> {isDeleting ? 'Deleting...' : 'Delete Purchase'}
                  </AppButton>
                )}
              </div>
            }
          >
            <StatusBadge status={po.status} />
          </PageHeader>

          <div className="space-y-6">
            {/* Line Items Card */}
            <AppCard className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Line Items</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Ordered products and quantities to receive</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Total Units</span>
                  <span className="text-lg font-bold font-mono text-primary">
                    {totalQty} units
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-right">Ordered Qty</th>
                      <th className="px-4 py-3 text-right">Received Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(po.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{item.productName}</div>
                          {item.sku && <div className="text-xs text-muted-foreground font-mono mt-0.5">SKU: {item.sku}</div>}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground font-medium">
                          {item.quantity} <span className="text-xs text-muted-foreground">{item.unit || ''}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${item.receivedQuantity === item.quantity ? 'text-success' : (item.receivedQuantity || 0) > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {item.receivedQuantity || 0} <span className="text-xs font-normal">{item.unit || ''}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-semibold border-t-2 border-border">
                    <tr>
                      <td className="px-4 py-3 text-foreground font-bold uppercase text-xs">Total Units Status</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{totalQty} units ordered</td>
                      <td className="px-4 py-3 text-right font-bold text-success">{totalReceivedQty} units received</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </AppCard>
      </div>

      {/* Receive Goods Dialog */}
      <AppDialog 
        isOpen={isReceiveModalOpen} 
        onClose={() => setIsReceiveModalOpen(false)}
        title="Receive Goods"
        description="Enter the quantity received for each line item. This will immediately update the Stock Ledger and product quantities."
      >
        <div className="overflow-x-auto my-4 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2 text-right">Ordered</th>
                <th className="px-4 py-2 text-right">Previously Received</th>
                <th className="px-4 py-2 text-right">Remaining</th>
                <th className="px-4 py-2 w-32 text-right">Receive Now</th>
              </tr>
            </thead>
            <tbody>
              {(po.items || []).map((item, idx) => {
                const remaining = item.quantity - (item.receivedQuantity || 0);
                if (remaining <= 0) return null;
                
                return (
                  <tr key={idx} className="border-b border-border">
                    <td className="px-4 py-3 font-medium">{item.productName}</td>
                    <td className="px-4 py-3 text-right">{item.quantity} <span className="text-xs text-muted-foreground">{item.unit || ''}</span></td>
                    <td className="px-4 py-3 text-right">{item.receivedQuantity || 0} <span className="text-xs text-muted-foreground">{item.unit || ''}</span></td>
                    <td className="px-4 py-3 text-right font-semibold">{remaining} <span className="text-xs text-muted-foreground">{item.unit || ''}</span></td>
                    <td className="px-4 py-3">
                      <div className="relative flex items-center min-w-[110px]">
                        <input 
                          type="number" 
                          step="any" 
                          min={0}
                          max={remaining}
                          value={receiveQuantities[item.productId] ?? 0}
                          onChange={(e) => setReceiveQuantities(prev => ({
                            ...prev,
                            [item.productId]: Math.min(remaining, Math.max(0, parseFloat(e.target.value) || 0))
                          }))}
                          className="w-full h-9 rounded-md border border-input bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-semibold text-foreground px-3 pr-12 shadow-xs transition-all outline-none text-right"
                        />
                        {item.unit && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-medium text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded border border-border/50 select-none">
                            {item.unit}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <AppButton variant="outline" onClick={() => setIsReceiveModalOpen(false)} disabled={isReceiving}>Cancel</AppButton>
          <AppButton variant="success" onClick={handleReceiveGoods} disabled={isReceiving}>
            {isReceiving ? 'Processing...' : 'Confirm Receipt & Update Stock'}
          </AppButton>
        </div>
      </AppDialog>

      {/* Print Preview Modal */}
      <AppDialog 
        isOpen={isPrintPreviewOpen} 
        onClose={() => setIsPrintPreviewOpen(false)}
        title="Purchase Order Print Preview"
        description="Official Cryodeal Purchase Order format. Click 'Print Now' to print or export to PDF."
        className="max-w-4xl w-[94vw] max-h-[92vh] p-6"
      >
        <div className="my-2 max-h-[68vh] overflow-y-auto p-4 bg-muted/20 rounded-xl border border-border flex justify-center">
          <PurchaseOrderPrintDocument 
            po={po} 
            supplier={supplierObj} 
            company={company} 
            creatorName={user?.displayName || user?.email || 'Store In-Charge'} 
          />
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            A4 Standard • Cryodeal Industrial Format
          </span>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => setIsPrintPreviewOpen(false)}>
              Close
            </AppButton>
            <AppButton onClick={handlePrint} className="shadow-sm">
              <Printer className="h-4 w-4 mr-2" /> Print Now
            </AppButton>
          </div>
        </div>
      </AppDialog>
    </PageContainer>
    </div>

    {/* Dedicated Print Sheet for window.print() */}
    <div className="print-only">
      <PurchaseOrderPrintDocument 
        po={po} 
        supplier={supplierObj} 
        company={company} 
        creatorName={user?.displayName || user?.email || 'Store In-Charge'} 
      />
    </div>
  </>
  );
}
