import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, PackageOpen, Printer } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { purchaseOrderRepository } from '../../../repositories/PurchaseOrderRepository';
import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { AppInput } from '../../../shared/forms/AppInput';

export default function PurchaseOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Receive Goods Modal State
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [isReceiving, setIsReceiving] = useState(false);

  useEffect(() => {
    const fetchPO = async () => {
      if (!companyId || !id) return;
      try {
        setIsLoading(true);
        const data = await purchaseOrderRepository.getById(id, companyId);
        if (!data) {
          toast.error("PO not found");
          navigate('/purchases');
          return;
        }
        setPo(data);
        
        const initialQties: Record<string, number> = {};
        data.items.forEach(item => {
          const remaining = item.quantity - (item.receivedQuantity || 0);
          initialQties[item.productId] = remaining > 0 ? remaining : 0;
        });
        setReceiveQuantities(initialQties);
        
      } catch (error) {
        toast.error('Failed to load PO details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPO();
  }, [id, companyId, navigate]);

  const handleApprove = async () => {
    if (!companyId || !user || !po?.id) return;
    try {
      await purchaseOrderRepository.updateStatus(po.id, companyId, 'Approved', user.uid);
      toast.success("PO Approved");
      setPo(prev => prev ? { ...prev, status: 'Approved' } : null);
    } catch (error) {
      toast.error("Failed to approve PO");
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

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading PO details...</div>;
  if (!po) return null;

  return (
    <PageContainer>
      <div className="mb-[var(--spacing-md)]">
        <AppButton variant="ghost" size="sm" onClick={() => navigate('/purchases')} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to POs
        </AppButton>
      </div>

      <PageHeader 
        title={po.poNumber}
        description={`Created on ${po.purchaseDate && typeof (po.purchaseDate as any).toDate === 'function' ? (po.purchaseDate as any).toDate().toLocaleDateString() : 'N/A'}`}
        actions={
          <div className="flex gap-3">
            {po.status === 'Draft' && (
              <AppButton onClick={handleApprove} variant="default">
                <CheckCircle className="h-4 w-4 mr-2" /> Approve PO
              </AppButton>
            )}
            {(po.status === 'Approved' || po.status === 'Partially Received') && (
              <AppButton onClick={() => setIsReceiveModalOpen(true)} variant="success">
                <PackageOpen className="h-4 w-4 mr-2" /> Receive Goods
              </AppButton>
            )}
            <AppButton variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print Receipt</AppButton>
          </div>
        }
      >
        <StatusBadge status={po.status} />
      </PageHeader>

      <AppCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Line Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Ordered Qty</th>
                <th className="px-4 py-3 text-right">Received Qty</th>
                <th className="px-4 py-3 text-right">Unit Cost</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item, idx) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{item.productName}</div>
                    <div className="text-xs text-muted-foreground">{item.sku}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${item.receivedQuantity === item.quantity ? 'text-success' : item.receivedQuantity > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                      {item.receivedQuantity || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">₹{item.unitCost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-6 pt-4 border-t border-border">
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Total PO Amount</p>
              <p className="text-2xl font-bold text-foreground">₹{po.totalAmount.toFixed(2)}</p>
            </div>
        </div>
      </AppCard>

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
              {po.items.map((item, idx) => {
                const remaining = item.quantity - (item.receivedQuantity || 0);
                if (remaining <= 0) return null;
                
                return (
                  <tr key={idx} className="border-b border-border">
                    <td className="px-4 py-3 font-medium">{item.productName}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{item.receivedQuantity || 0}</td>
                    <td className="px-4 py-3 text-right font-semibold">{remaining}</td>
                    <td className="px-4 py-3">
                      <AppInput 
                        type="number" 
                        min={0}
                        max={remaining}
                        value={receiveQuantities[item.productId] ?? 0}
                        onChange={(e) => setReceiveQuantities(prev => ({
                          ...prev,
                          [item.productId]: Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0))
                        }))}
                        className="text-right h-9"
                      />
                    </td>
                  </tr>
                )
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
    </PageContainer>
  );
}
