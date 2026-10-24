import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, ArrowLeft, Paperclip, FileText, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/firestore';

import { useAuthStore } from "../../../store/authStore";
import { purchaseOrderRepository } from '../../../repositories/PurchaseOrderRepository';
import { supplierRepository } from '../../../repositories/SupplierRepository';
import { productRepository } from '../../../repositories/ProductRepository';
import type { Supplier } from '../../../shared/types/Supplier';
import type { Product } from '../../../shared/types/Product';
import type { PurchaseAttachment } from '../../../shared/types/PurchaseOrder';
import { processAttachmentFile, formatFileSize, isImageFile, validateAttachmentFile } from '../../../shared/utils/attachmentUtils';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppForm, FormActions } from '../../../shared/forms/FormLayout';
import { FormSection } from '../../../shared/forms/FormSection';
import { FormRow } from '../../../shared/forms/FormLayout';
import { FormField } from '../../../shared/forms/FormField';
import { AppInput } from '../../../shared/forms/AppInput';
import { ProductSearchSelect } from '../../../shared/forms/ProductSearchSelect';
import { SupplierSearchSelect } from '../../../shared/forms/SupplierSearchSelect';

const itemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(0.01, "Must be > 0"),
});

const poSchema = z.object({
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  purchaseDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Add at least one item")
});

type POFormData = {
  supplierId?: string;
  supplierName?: string;
  purchaseDate: string;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
  }[];
};

export default function PurchaseOrderForm() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const prefillProduct = (location.state as any)?.prefillProduct;
  const prefillProductId = searchParams.get('productId') || prefillProduct?.id || '';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [existingPoNumber, setExistingPoNumber] = useState<string>('');
  const [attachments, setAttachments] = useState<PurchaseAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const methods = useForm<POFormData>({
    resolver: zodResolver(poSchema) as any,
    defaultValues: {
      supplierId: prefillProduct?.supplierId || '',
      supplierName: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      items: [{ productId: prefillProductId, quantity: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "items"
  });

  const watchedItems = methods.watch("items");

  useEffect(() => {
    if (!companyId) return;
    const loadData = async () => {
      const [supData, prodData] = await Promise.all([
        supplierRepository.getAll(companyId),
        productRepository.getAll(companyId)
      ]);
      setSuppliers(supData.filter(s => !s.status || s.status.toLowerCase() === 'active'));
      setProducts(prodData.filter(p => !p.status || p.status.toLowerCase() === 'active'));

      if (!id && prefillProductId) {
        methods.setValue('items.0.productId', prefillProductId);
        if (prefillProduct?.supplierId) {
          methods.setValue('supplierId', prefillProduct.supplierId);
        }
      }

      if (id) {
        try {
          const poSnap = await getDoc(doc(db, 'purchaseOrders', id));
          if (poSnap.exists() && poSnap.data().companyId === companyId) {
            const data = poSnap.data();
            setExistingPoNumber(data.poNumber || '');
            setAttachments(data.attachments || []);
            let pDate = new Date().toISOString().split('T')[0];
            if (data.purchaseDate) {
              const d = data.purchaseDate.toDate ? data.purchaseDate.toDate() : new Date(data.purchaseDate);
              pDate = d.toISOString().split('T')[0];
            }
            methods.reset({
              supplierId: data.supplierId || '',
              supplierName: data.supplierName || '',
              purchaseDate: pDate,
              notes: data.notes || '',
              items: (data.items || []).map((it: any) => ({
                productId: it.productId,
                quantity: it.quantity
              }))
            });
          }
        } catch (err) {
          console.error("Failed to load existing PO:", err);
        }
      }
    };
    loadData();
  }, [companyId, id, methods, prefillProductId, prefillProduct]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const newAtts: PurchaseAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = validateAttachmentFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          continue;
        }
        const att = await processAttachmentFile(file, companyId);
        newAtts.push(att);
      }
      if (newAtts.length > 0) {
        setAttachments(prev => [...prev, ...newAtts]);
        toast.success(`${newAtts.length} document(s) attached!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to attach file');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (attId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attId));
  };

  const onSubmit = async (data: POFormData) => {
    if (!companyId || !user) return;
    try {
      setIsSaving(true);
      
      const enrichedItems = data.items.map(item => {
        const prod = products.find(p => p.id === item.productId);
        const unit = prod?.unitId || (prod as any)?.unit || 'pcs';
        return {
          ...item,
          quantity: Number(item.quantity),
          unit,
          productName: prod?.name || 'Unknown',
          sku: prod?.sku || '',
          receivedQuantity: 0
        };
      });

      const effectiveSupplierName = data.supplierName || 
        (data.supplierId ? suppliers.find(s => s.id === data.supplierId)?.companyName : '') || 
        '';

      if (isEditing && id) {
        const poRef = doc(db, 'purchaseOrders', id);
        await updateDoc(poRef, {
          supplierId: data.supplierId || '',
          supplierName: effectiveSupplierName,
          purchaseDate: new Date(data.purchaseDate),
          notes: data.notes || '',
          items: enrichedItems,
          attachments,
          attachmentUrls: attachments.map(a => a.url),
          updatedAt: serverTimestamp()
        });
        toast.success(`Purchase ${existingPoNumber || ''} updated successfully`);
      } else {
        const payload = {
          companyId,
          supplierId: data.supplierId || '',
          supplierName: effectiveSupplierName,
          status: 'Ordered' as const,
          purchaseDate: new Date(data.purchaseDate),
          notes: data.notes || '',
          items: enrichedItems,
          attachments,
          attachmentUrls: attachments.map(a => a.url),
          createdBy: user.uid
        };

        await purchaseOrderRepository.create(payload, user.uid);
        toast.success("Purchase created successfully");
      }
      navigate('/purchases');
    } catch (error: any) {
      toast.error(error.message || "Failed to save purchase");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer>
      <div className="mb-[var(--spacing-md)]">
        <AppButton variant="ghost" size="sm" onClick={() => navigate('/purchases')} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Purchases
        </AppButton>
      </div>
      
      <PageHeader 
        title={isEditing ? `Edit Purchase Order ${existingPoNumber}` : "Create Purchase Order"} 
        description={isEditing ? "Update details or line items for this purchase order." : "Record a new purchase order to restock materials from your supplier."} 
      />

      <FormProvider {...methods}>
        <AppForm onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Line Items & Notes */}
            <div className="lg:col-span-2 space-y-6">
              <FormSection title="Line Items" description="Add products to this order.">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Line Items</p>
                  <AppButton type="button" variant="secondary" size="sm" onClick={() => append({ productId: '', quantity: 1 })} className="shadow-sm">
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                  </AppButton>
                </div>

                <div className="overflow-visible">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
                      <tr>
                        <th className="px-4 py-3 font-medium text-left w-[38%]">Product</th>
                        <th className="px-4 py-3 font-medium text-left w-[18%]">Current Stock</th>
                        <th className="px-4 py-3 font-medium text-left w-[22%] min-w-[130px]">Order Qty</th>
                        <th className="px-4 py-3 font-medium text-left w-[17%]">New Total</th>
                        <th className="px-4 py-3 font-medium text-center w-[5%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const wItem = watchedItems[index];
                        const prod = products.find(p => p.id === wItem?.productId);
                        const unit = prod ? (prod.unitId || (prod as any).unit || 'pcs') : '';
                        const currentStock = prod ? Number(prod.currentStock) || 0 : 0;
                        const orderQty = Number(wItem?.quantity) || 0;
                        const newTotal = prod ? Math.round((currentStock + orderQty) * 10000) / 10000 : null;
                        return (
                          <tr key={field.id} className="border-b border-border hover:bg-muted/10 transition-colors relative focus-within:z-40">
                            <td className="p-2 relative">
                              <ProductSearchSelect
                                value={wItem?.productId || ''}
                                onChange={(prodId) => methods.setValue(`items.${index}.productId`, prodId, { shouldValidate: true })}
                                products={products}
                                placeholder="Type to search product or SKU..."
                              />
                            </td>
                            <td className="px-4 py-2 font-medium">
                              {prod ? (
                                <span className={currentStock > 0 ? "text-[hsl(var(--success))] font-bold" : "text-muted-foreground font-medium"}>
                                  {currentStock} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                                </span>
                              ) : '-'}
                            </td>
                            <td className="p-2">
                              <div className="relative flex items-center min-w-[120px]">
                                <input 
                                  type="number" 
                                  step="any" 
                                  min="0.01" 
                                  {...methods.register(`items.${index}.quantity` as const)} 
                                  className="w-full h-10 rounded-lg border border-input bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-semibold text-foreground pl-3.5 pr-14 shadow-xs transition-all outline-none" 
                                  placeholder="0" 
                                />
                                {unit && (
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-medium text-muted-foreground bg-muted/80 px-2 py-0.5 rounded border border-border/50 select-none">
                                    {unit}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              {prod ? (
                                <span className="text-xs font-semibold px-2 py-1 rounded inline-block bg-primary/10 text-primary">
                                  {newTotal} {unit}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="p-2 text-center">
                              <AppButton type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                              </AppButton>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => append({ productId: '', quantity: 1 })}
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> + Add Another Item
                  </button>
                </div>
              </FormSection>

              <FormSection title="Additional Details" description="Provide any extra notes for the supplier.">
                <FormField label="Notes / Remarks" error={methods.formState.errors.notes?.message}>
                  <textarea className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent hover:bg-muted/10 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors" {...methods.register('notes')} placeholder="Any instructions for the supplier..." rows={4}></textarea>
                </FormField>
              </FormSection>

              <FormSection title="Bill & Document Attachments" description="Attach supplier bill, invoice, or receipt photos (Image, PDF, Document).">
                <div className="space-y-4">
                  {/* Limitations Helper Box */}
                  <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200">
                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-blue-950 dark:text-blue-100">
                        Attachment Limitations:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                        <li><strong className="text-foreground font-semibold">PDF & Documents</strong>: Maximum <strong>2 MB</strong> per file.</li>
                        <li><strong className="text-foreground font-semibold">Bill Photos & Images</strong>: Up to <strong>10 MB</strong> accepted (automatically compressed down to ~200 KB).</li>
                        <li><strong className="text-foreground font-semibold">Supported formats</strong>: JPG, PNG, WebP, PDF, DOC, DOCX.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*,.pdf,.doc,.docx" 
                      onChange={handleFileChange} 
                      className="hidden" 
                      id="form-doc-upload"
                      disabled={isUploading}
                    />
                    <label 
                      htmlFor="form-doc-upload" 
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Processing Attachments...
                        </>
                      ) : (
                        <>
                          <Paperclip className="h-4 w-4" /> Attach Bill / Document / Image
                        </>
                      )}
                    </label>
                    <span className="text-xs text-muted-foreground font-medium">
                      Max 2 MB per document
                    </span>
                  </div>

                  {attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {attachments.map((att) => {
                        const isImg = isImageFile(att.type, att.name);
                        return (
                          <div key={att.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60 hover:border-primary/40 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isImg ? (
                                <img src={att.url} alt={att.name} className="w-10 h-10 rounded object-cover border border-border flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-5 w-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate max-w-[180px]" title={att.name}>{att.name}</p>
                                <p className="text-[11px] text-muted-foreground">{formatFileSize(att.size)}</p>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => removeAttachment(att.id)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                              title="Remove file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </FormSection>
            </div>

            {/* Right Column: Supplier & Dates & Summary */}
            <div className="space-y-6">
              <FormSection title="Supplier & Dates" description="Select the vendor and purchase timeline.">
                <div className="space-y-4">
                  <FormField label="Supplier" error={methods.formState.errors.supplierId?.message}>
                    <SupplierSearchSelect
                      supplierId={methods.watch('supplierId')}
                      supplierName={methods.watch('supplierName')}
                      onChange={(supId, supName) => {
                        methods.setValue('supplierId', supId);
                        methods.setValue('supplierName', supName);
                      }}
                      suppliers={suppliers}
                      placeholder="Type supplier name or search..."
                    />
                  </FormField>
                  <FormField label="Purchase Date" required error={methods.formState.errors.purchaseDate?.message}>
                    <AppInput type="date" {...methods.register('purchaseDate')} />
                  </FormField>
                </div>
              </FormSection>

              <div className="bg-card rounded-xl shadow-sm border border-border p-6 sticky top-[90px]">
                <h3 className="font-semibold mb-4 text-lg border-b border-border pb-2">Summary</h3>
                <div className="flex justify-between items-center mb-6 text-sm">
                   <span className="text-muted-foreground">Total Unique Items</span>
                   <span className="font-bold text-lg text-foreground">{watchedItems.filter(i => i.productId).length}</span>
                </div>
                <AppButton type="submit" disabled={isSaving} className="w-full h-12 text-base font-semibold shadow-premium mb-3">
                  {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Purchase Order')}
                </AppButton>
                <AppButton type="button" variant="ghost" onClick={() => navigate('/purchases')} disabled={isSaving} className="w-full text-muted-foreground">
                  Cancel
                </AppButton>
              </div>
            </div>
          </div>
        </AppForm>
      </FormProvider>
    </PageContainer>
  );
}
