import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, PackageOpen, Printer, Trash2, Edit, 
  Paperclip, Upload, Eye, Download, FileText, Image as ImageIcon, Loader2, Info 
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/firestore';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { Role } from '../../../constants/roles';
import { purchaseOrderRepository } from '../../../repositories/PurchaseOrderRepository';
import { supplierRepository } from '../../../repositories/SupplierRepository';
import type { PurchaseOrder, PurchaseAttachment } from '../../../shared/types/PurchaseOrder';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { 
  processAttachmentFile, 
  formatFileSize, 
  isImageFile, 
  isPdfFile, 
  downloadAttachment,
  validateAttachmentFile 
} from '../../../shared/utils/attachmentUtils';

export default function PurchaseOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displaySupplier, setDisplaySupplier] = useState<string>('');

  // Receiving state
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  // Attachment state
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<PurchaseAttachment | null>(null);

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

        // Resolve supplier name
        if (data.supplierName) {
          setDisplaySupplier(data.supplierName);
        } else if (data.supplierId) {
          try {
            const s = await supplierRepository.getById(data.supplierId, companyId);
            if (s) setDisplaySupplier(s.companyName);
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

  const handleApprove = async () => {
    if (!companyId || !user || !po?.id) return;
    try {
      await purchaseOrderRepository.updateStatus(po.id, companyId, 'Approved', user.uid);
      toast.success("Purchase Approved");
      setPo(prev => prev ? { ...prev, status: 'Approved' } : null);
    } catch (error) {
      toast.error("Failed to approve purchase");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !po?.id || !companyId) return;

    try {
      setIsUploadingAttachment(true);
      const newAttachments: PurchaseAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = validateAttachmentFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          continue;
        }
        const att = await processAttachmentFile(file, companyId);
        newAttachments.push(att);
      }

      if (newAttachments.length === 0) return;

      const existingAtts = po.attachments || [];
      const updatedAtts = [...existingAtts, ...newAttachments];
      const updatedUrls = updatedAtts.map(a => a.url);

      const poRef = doc(db, 'purchaseOrders', po.id);
      await updateDoc(poRef, {
        attachments: updatedAtts,
        attachmentUrls: updatedUrls,
        updatedAt: serverTimestamp()
      });

      setPo(prev => prev ? { ...prev, attachments: updatedAtts, attachmentUrls: updatedUrls } : null);
      toast.success(`${newAttachments.length} document(s) attached successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!po?.id || !companyId) return;
    const confirmed = window.confirm("Are you sure you want to remove this attached document?");
    if (!confirmed) return;

    try {
      const updatedAtts = (po.attachments || []).filter(a => a.id !== attId);
      const updatedUrls = updatedAtts.map(a => a.url);

      const poRef = doc(db, 'purchaseOrders', po.id);
      await updateDoc(poRef, {
        attachments: updatedAtts,
        attachmentUrls: updatedUrls,
        updatedAt: serverTimestamp()
      });

      setPo(prev => prev ? { ...prev, attachments: updatedAtts, attachmentUrls: updatedUrls } : null);
      toast.success("Attachment removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove attachment");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-medium">Loading Purchase details...</div>;
  if (!po) return null;

  return (
    <PageContainer>
      <div className="mb-[var(--spacing-md)]">
        <AppButton variant="ghost" size="sm" onClick={() => navigate('/purchases')} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Purchase
        </AppButton>
      </div>

      <PageHeader 
        title={
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
              Purchase ID
            </span>
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {po.poNumber}
            </span>
          </div>
        }
        description={`Created on ${po.purchaseDate && typeof (po.purchaseDate as any).toDate === 'function' ? (po.purchaseDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}${displaySupplier ? ` • Supplier: ${displaySupplier}` : ''}`}
        actions={
          <div className="flex gap-2.5 items-center flex-wrap">
            {po.status === 'Draft' && (
              <>
                <AppButton onClick={() => navigate(`/purchases/edit/${po.id}`)} variant="outline">
                  <Edit className="h-4 w-4 mr-2" /> Edit Purchase
                </AppButton>
                <AppButton onClick={handleApprove} variant="default">
                  <CheckCircle className="h-4 w-4 mr-2" /> Approve Purchase
                </AppButton>
              </>
            )}
            {(po.status === 'Approved' || po.status === 'Partially Received') && (
              <AppButton onClick={() => setIsReceiveModalOpen(true)} variant="success">
                <PackageOpen className="h-4 w-4 mr-2" /> Receive Goods
              </AppButton>
            )}
            <AppButton variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print Receipt
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
          <h3 className="text-lg font-semibold mb-4">Line Items</h3>
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
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">{item.sku}</div>
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
            </table>
          </div>
        </AppCard>

        {/* Attached Bills & Documents Card */}
        <AppCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Attached Bills & Documents</h3>
                {(po.attachments && po.attachments.length > 0) && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {po.attachments.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vendor invoices, bills, delivery challans, and receipt photos.
              </p>
            </div>

            <div>
              <input 
                type="file" 
                multiple 
                accept="image/*,.pdf,.doc,.docx" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="purchase-doc-upload"
                disabled={isUploadingAttachment}
              />
              <label 
                htmlFor="purchase-doc-upload" 
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer ${isUploadingAttachment ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {isUploadingAttachment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Attach Bill / Document
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Limitations Helper Box */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 mb-4">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div className="space-y-0.5">
              <span className="font-semibold text-blue-950 dark:text-blue-100">Attachment Limitations: </span>
              <span className="text-muted-foreground text-[11px]">
                Maximum <strong>2 MB</strong> per PDF / document bill. Camera photos are accepted up to <strong>10 MB</strong> and auto-compressed to ~200 KB. Formats: <span className="font-mono">PDF, JPG, PNG, WebP, DOC, DOCX</span>.
              </span>
            </div>
          </div>

          {(!po.attachments || po.attachments.length === 0) ? (
            <div className="p-8 border-2 border-dashed border-border rounded-xl text-center flex flex-col items-center justify-center bg-muted/20">
              <Paperclip className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">No documents or bills attached yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Attach bills, supplier receipts, or photos to keep complete purchase records.
              </p>
              <label 
                htmlFor="purchase-doc-upload" 
                className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" /> Upload First Bill / Document
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {po.attachments.map((att) => {
                const isImg = isImageFile(att.type, att.name);
                const isPdf = isPdfFile(att.type, att.name);

                return (
                  <div 
                    key={att.id} 
                    className="flex flex-col justify-between p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {isImg ? (
                        <div 
                          onClick={() => setPreviewAttachment(att)}
                          className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer border border-border/60 hover:opacity-90"
                        >
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div 
                          onClick={() => setPreviewAttachment(att)}
                          className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer ${isPdf ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-primary/10 text-primary'}`}
                        >
                          {isPdf ? <FileText className="h-7 w-7" /> : <ImageIcon className="h-7 w-7" />}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate" title={att.name}>
                          {att.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatFileSize(att.size)} • {att.uploadedAt ? new Date(att.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Attached'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-border/60">
                      <AppButton 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setPreviewAttachment(att)}
                        className="h-7 px-2 text-xs"
                        title="View / Preview"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </AppButton>

                      <AppButton 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => downloadAttachment(att)}
                        className="h-7 px-2 text-xs"
                        title="Download file"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> Download
                      </AppButton>

                      <AppButton 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Delete attachment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </AppButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Attachment Preview Dialog */}
      <AppDialog 
        isOpen={!!previewAttachment} 
        onClose={() => setPreviewAttachment(null)}
        title={previewAttachment?.name || "Document Preview"}
        description={previewAttachment ? `${formatFileSize(previewAttachment.size)} • Attached Document` : ''}
      >
        <div className="my-4 flex flex-col items-center justify-center max-h-[70vh] overflow-y-auto">
          {previewAttachment && isImageFile(previewAttachment.type, previewAttachment.name) ? (
            <img 
              src={previewAttachment.url} 
              alt={previewAttachment.name} 
              className="max-h-[65vh] w-auto rounded-lg object-contain border border-border shadow-sm" 
            />
          ) : previewAttachment && isPdfFile(previewAttachment.type, previewAttachment.name) ? (
            <iframe 
              src={previewAttachment.url} 
              title={previewAttachment.name} 
              className="w-full h-[60vh] rounded-lg border border-border" 
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
              <p className="font-semibold text-foreground">{previewAttachment?.name}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">This document format can be downloaded directly.</p>
              {previewAttachment && (
                <AppButton onClick={() => downloadAttachment(previewAttachment)}>
                  <Download className="h-4 w-4 mr-2" /> Download File
                </AppButton>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          {previewAttachment && (
            <AppButton variant="outline" onClick={() => downloadAttachment(previewAttachment)}>
              <Download className="h-4 w-4 mr-2" /> Download
            </AppButton>
          )}
          <AppButton variant="secondary" onClick={() => setPreviewAttachment(null)}>Close</AppButton>
        </div>
      </AppDialog>
    </PageContainer>
  );
}
