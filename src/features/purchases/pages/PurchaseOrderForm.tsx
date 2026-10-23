import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/firestore';

import { useAuthStore } from "../../../store/authStore";
import { purchaseOrderRepository } from '../../../repositories/PurchaseOrderRepository';
import { supplierRepository } from '../../../repositories/SupplierRepository';
import { productRepository } from '../../../repositories/ProductRepository';
import type { Supplier } from '../../../shared/types/Supplier';
import type { Product } from '../../../shared/types/Product';

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
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [existingPoNumber, setExistingPoNumber] = useState<string>('');

  const methods = useForm<POFormData>({
    resolver: zodResolver(poSchema) as any,
    defaultValues: {
      supplierId: '',
      supplierName: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      items: [{ productId: '', quantity: 1 }]
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
      setSuppliers(supData.filter(s => s.status === 'Active'));
      setProducts(prodData.filter(p => p.status === 'Active'));

      if (id) {
        try {
          const poSnap = await getDoc(doc(db, 'purchaseOrders', id));
          if (poSnap.exists() && poSnap.data().companyId === companyId) {
            const data = poSnap.data();
            setExistingPoNumber(data.poNumber || '');
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
  }, [companyId, id, methods]);

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
          updatedAt: serverTimestamp()
        });
        toast.success(`Purchase ${existingPoNumber || ''} updated successfully`);
      } else {
        const payload = {
          companyId,
          supplierId: data.supplierId || '',
          supplierName: effectiveSupplierName,
          status: 'Draft' as const,
          purchaseDate: new Date(data.purchaseDate),
          notes: data.notes || '',
          items: enrichedItems,
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
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Purchase
        </AppButton>
      </div>
      
      <PageHeader 
        title={isEditing ? `Edit Purchase ${existingPoNumber}` : "Create Purchase"} 
        description={isEditing ? "Update details or line items for this draft purchase." : "Draft a new purchase to send to your supplier."} 
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
              </FormSection>

              <FormSection title="Additional Details" description="Provide any extra notes for the supplier.">
                <FormField label="Notes / Remarks" error={methods.formState.errors.notes?.message}>
                  <textarea className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent hover:bg-muted/10 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors" {...methods.register('notes')} placeholder="Any instructions for the supplier..." rows={4}></textarea>
                </FormField>
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
                  {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Draft')}
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
