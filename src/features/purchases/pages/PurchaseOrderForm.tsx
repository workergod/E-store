import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Trash2, ArrowLeft, Printer, Eye, 
  ShoppingCart, PackageSearch, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/firestore';

import { useAuthStore } from "../../../store/authStore";
import { purchaseOrderRepository } from '../../../repositories/PurchaseOrderRepository';
import { supplierRepository } from '../../../repositories/SupplierRepository';
import { productRepository } from '../../../repositories/ProductRepository';
import type { Supplier } from '../../../shared/types/Supplier';
import type { Product } from '../../../shared/types/Product';
import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder';
import { printPurchaseOrder } from '../utils/printPurchaseOrder';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppForm } from '../../../shared/forms/FormLayout';
import { FormSection } from '../../../shared/forms/FormSection';
import { FormField } from '../../../shared/forms/FormField';
import { AppInput } from '../../../shared/forms/AppInput';
import { ProductSearchSelect } from '../../../shared/forms/ProductSearchSelect';
import { SupplierSearchSelect } from '../../../shared/forms/SupplierSearchSelect';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';

const itemSchema = z.object({
  productId: z.string().optional().default(''),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.coerce.number().min(0.01, "Must be > 0"),
  unit: z.string().optional().default('pcs'),
  unitPrice: z.coerce.number().min(0, "Must be >= 0").optional().default(0),
});

const poSchema = z.object({
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  purchaseDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  markAsReceived: z.boolean().optional().default(false),
  items: z.array(itemSchema).min(1, "Add at least one item")
});

type POFormData = {
  supplierId?: string;
  supplierName?: string;
  purchaseDate: string;
  notes?: string;
  markAsReceived?: boolean;
  items: {
    productId?: string;
    productName: string;
    quantity: number;
    unit?: string;
    unitPrice?: number;
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
  const [createdOrders, setCreatedOrders] = useState<PurchaseOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingPoNumber, setExistingPoNumber] = useState<string>('');

  const methods = useForm<POFormData>({
    resolver: zodResolver(poSchema) as any,
    defaultValues: {
      supplierId: prefillProduct?.supplierId || '',
      supplierName: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      markAsReceived: false,
      items: [{ productId: prefillProductId, productName: prefillProduct?.name || '', quantity: 1, unit: 'pcs', unitPrice: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "items"
  });

  const watchedItems = methods.watch("items") || [];
  const totalUnits = watchedItems.reduce((acc, curr) => acc + (Number(curr?.quantity) || 0), 0);
  const totalUniqueItems = watchedItems.filter(i => (i?.productName && i.productName.trim().length > 0) || i?.productId).length;

  const loadCreatedOrders = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsLoadingOrders(true);
      const orders = await purchaseOrderRepository.getAll(companyId);
      setCreatedOrders(orders);
    } catch (err) {
      console.error("Failed to load created purchase orders:", err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [companyId]);

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
        const foundProd = prodData.find(p => p.id === prefillProductId) || prefillProduct;
        methods.setValue('items.0.productId', prefillProductId);
        if (foundProd?.name) {
          methods.setValue('items.0.productName', foundProd.name);
        }
        if (foundProd?.unitId || (foundProd as any)?.unit) {
          methods.setValue('items.0.unit', foundProd.unitId || (foundProd as any).unit);
        }
        if (foundProd?.supplierId) {
          methods.setValue('supplierId', foundProd.supplierId);
        }
      }

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
              markAsReceived: data.status === 'Completed',
              items: (data.items || []).map((it: any) => ({
                productId: it.productId || '',
                productName: it.productName || '',
                quantity: it.quantity,
                unit: it.unit || 'pcs',
                unitPrice: it.unitPrice || 0
              }))
            });
          }
        } catch (err) {
          console.error("Failed to load existing PO:", err);
        }
      }
    };

    loadData();
    loadCreatedOrders();
  }, [companyId, id, methods, prefillProductId, prefillProduct, loadCreatedOrders]);

  const handlePrintOrder = (orderToPrint: PurchaseOrder) => {
    const sup = suppliers.find(s => s.id === orderToPrint.supplierId) || null;
    printPurchaseOrder(
      orderToPrint,
      sup,
      company,
      user?.displayName || user?.email || 'Store In-Charge'
    );
  };

  const onSubmit = async (data: POFormData) => {
    if (!companyId || !user) return;
    try {
      setIsSaving(true);
      
      const enrichedItems = data.items.map(item => {
        const prod = products.find(p => p.id === item.productId);
        const finalName = item.productName?.trim() || prod?.name || 'Custom Item';
        const unit = prod?.unitId || (prod as any)?.unit || item.unit || 'pcs';
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        return {
          productId: item.productId || '',
          productName: finalName,
          sku: prod?.sku || '',
          quantity: qty,
          unitPrice: price,
          totalAmount: Math.round(qty * price * 100) / 100,
          unit,
          receivedQuantity: data.markAsReceived ? qty : 0
        };
      });

      const totalQuantity = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = Math.round(enrichedItems.reduce((sum, item) => sum + item.totalAmount, 0) * 100) / 100;

      const effectiveSupplierName = data.supplierName?.trim() || 
        (data.supplierId ? suppliers.find(s => s.id === data.supplierId)?.companyName : '') || 
        'Direct Vendor / Cash';

      if (isEditing && id) {
        const poRef = doc(db, 'purchaseOrders', id);
        await updateDoc(poRef, {
          supplierId: data.supplierId || '',
          supplierName: effectiveSupplierName,
          purchaseDate: new Date(data.purchaseDate),
          notes: data.notes || '',
          items: enrichedItems,
          totalQuantity,
          totalAmount,
          updatedAt: serverTimestamp()
        });
        toast.success(`Purchase ${existingPoNumber || ''} updated successfully!`);
        navigate(`/purchases/${id}`);
      } else {
        const payload = {
          companyId,
          supplierId: data.supplierId || '',
          supplierName: effectiveSupplierName,
          status: (data.markAsReceived ? 'Completed' : 'Ordered') as any,
          purchaseDate: new Date(data.purchaseDate),
          notes: data.notes || '',
          items: enrichedItems,
          totalQuantity,
          totalAmount,
          attachments: [],
          attachmentUrls: [],
          createdBy: user.uid
        };

        const newId = await purchaseOrderRepository.create(payload, user.uid, Boolean(data.markAsReceived));
        toast.success(
          data.markAsReceived 
            ? "Purchase Order recorded & completed! Added to the list below." 
            : "Purchase Order created successfully! Added to the list below."
        );

        // Refresh list of created purchase orders right on this page
        await loadCreatedOrders();

        // Reset form for next order
        methods.reset({
          supplierId: '',
          supplierName: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          markAsReceived: false,
          notes: '',
          items: [{ productId: '', productName: '', quantity: 1, unit: 'pcs', unitPrice: 0 }]
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save purchase order");
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
              <FormSection title="Line Items" description="Add products and quantities to this purchase order.">
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Line Items</p>
                </div>

                <div className="overflow-visible">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
                      <tr>
                        <th className="px-4 py-3 font-medium text-left w-[55%]">Product</th>
                        <th className="px-4 py-3 font-medium text-left w-[18%]">Current Stock</th>
                        <th className="px-4 py-3 font-medium text-left w-[22%] min-w-[130px]">Order Qty</th>
                        <th className="px-3 py-3 font-medium text-center w-[5%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const wItem = watchedItems[index];
                        const prod = products.find(p => p.id === wItem?.productId);
                        const unit = prod ? (prod.unitId || (prod as any).unit || 'pcs') : (wItem?.unit || 'pcs');
                        const currentStock = prod ? Number(prod.currentStock) || 0 : 0;
                        const isCustom = !wItem?.productId && Boolean(wItem?.productName?.trim());

                        return (
                          <tr key={field.id} className="border-b border-border hover:bg-muted/10 transition-colors relative focus-within:z-40">
                            <td className="p-3 relative">
                              <ProductSearchSelect
                                value={wItem?.productId || ''}
                                productName={wItem?.productName || ''}
                                onChange={(prodId, prodName, product) => {
                                  methods.setValue(`items.${index}.productId`, prodId);
                                  methods.setValue(`items.${index}.productName`, prodName || product?.name || '', { shouldValidate: true });
                                  if (product) {
                                    const u = product.unitId || (product as any).unit || 'pcs';
                                    methods.setValue(`items.${index}.unit`, u);
                                  }
                                }}
                                products={products}
                                allowCustom={true}
                                placeholder="Type any product name or search..."
                              />
                              {prod?.sku ? (
                                <div className="text-[11px] font-mono text-muted-foreground mt-1 ml-1 flex items-center gap-1.5">
                                  <span className="bg-muted px-1.5 py-0.5 rounded border border-border/40 text-[10px]">SKU</span>
                                  <span>{prod.sku}</span>
                                </div>
                              ) : isCustom ? (
                                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 ml-1 flex items-center gap-1.5">
                                  <span className="bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10px]">Custom Item</span>
                                  <span>Direct Purchase Item</span>
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {prod ? (
                                <span className={currentStock > 0 ? "text-[hsl(var(--success))] font-bold text-sm" : "text-muted-foreground font-medium text-sm"}>
                                  {currentStock} <span className="font-normal text-xs text-muted-foreground">{unit}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground font-medium text-sm">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="relative flex items-center min-w-[120px]">
                                <input 
                                  type="number" 
                                  step="any" 
                                  min="0.01" 
                                  {...methods.register(`items.${index}.quantity` as const)} 
                                  className="w-full h-10 rounded-lg border border-input bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-semibold text-foreground pl-3.5 pr-14 shadow-xs transition-all outline-none" 
                                  placeholder="1" 
                                />
                                {unit && (
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-medium text-muted-foreground bg-muted/80 px-2 py-0.5 rounded border border-border/50 select-none">
                                    {unit}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <AppButton 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => remove(index)} 
                                disabled={fields.length === 1}
                                className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] h-8 w-8 disabled:opacity-30"
                              >
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
                    onClick={() => append({ productId: '', productName: '', quantity: 1, unit: 'pcs', unitPrice: 0 })}
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Another Item
                  </button>
                </div>
              </FormSection>

              <FormSection title="Additional Details" description="Provide any extra notes for the supplier.">
                <FormField label="Notes / Remarks" error={methods.formState.errors.notes?.message}>
                  <textarea 
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent hover:bg-muted/10 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors" 
                    {...methods.register('notes')} 
                    placeholder="Any instructions for the supplier..." 
                    rows={4}
                  />
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
                <h3 className="font-semibold mb-4 text-lg border-b border-border pb-2">Order Summary</h3>
                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Total Unique Items</span>
                    <span className="font-semibold text-foreground">{totalUniqueItems}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Total Units to Purchase</span>
                    <span className="font-bold text-foreground font-mono text-base">{totalUnits}</span>
                  </div>
                </div>

                {!isEditing && (
                  <div className="mb-6 p-3.5 rounded-lg border border-primary/20 bg-primary/5">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        {...methods.register('markAsReceived')}
                        className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground block">
                          Already Purchased & Received
                        </span>
                        <span className="text-[11px] text-muted-foreground block leading-tight">
                          Check this if you are recording an old or already paid purchase. It will immediately complete the order and add items to stock.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

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

      {/* Created Purchase Orders Section Inside Create Purchase Order */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" /> Created Purchase Orders
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              All purchase orders recorded in your system. Print orders or open details to attach bills.
            </p>
          </div>
          <AppButton variant="outline" size="sm" onClick={() => navigate('/purchases')} className="self-start sm:self-auto">
            View All in Purchase Orders →
          </AppButton>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          {createdOrders.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <PackageSearch className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">No purchase orders created yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Fill in the form above and click &quot;Create Purchase Order&quot; to record your first order. It will immediately show here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Purchase ID</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Supplier</th>
                    <th className="px-4 py-3 font-semibold">Items & Qty</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {createdOrders.map((order) => {
                    const totalOrderUnits = order.totalQuantity ?? (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                    const orderDate = order.purchaseDate && typeof (order.purchaseDate as any).toDate === 'function'
                      ? (order.purchaseDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : (order.purchaseDate ? new Date(order.purchaseDate as any).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

                    const supplierDisplay = order.supplierName || suppliers.find(s => s.id === order.supplierId)?.companyName || 'Direct Vendor / Cash';

                    return (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span 
                            onClick={() => navigate(`/purchases/${order.id}`)}
                            className="font-mono font-bold text-primary hover:underline cursor-pointer"
                          >
                            {order.poNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {orderDate}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground text-xs">
                          {supplierDisplay}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-foreground">
                            {(order.items || []).length} {(order.items || []).length === 1 ? 'item' : 'items'}
                            <span className="text-muted-foreground font-normal ml-1">({totalOrderUnits} units)</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[220px]" title={(order.items || []).map(i => i.productName || 'Item').join(', ')}>
                            {(order.items || []).map(i => i.productName || 'Item').join(', ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <AppButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrintOrder(order)}
                              className="h-8 px-2.5 text-xs font-semibold"
                              title="Print Purchase Order"
                            >
                              <Printer className="h-3.5 w-3.5 mr-1" /> Print
                            </AppButton>
                            <AppButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/purchases/${order.id}`)}
                              className="h-8 px-2.5 text-xs font-semibold"
                              title="View Details & Attached Bills"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </AppButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
