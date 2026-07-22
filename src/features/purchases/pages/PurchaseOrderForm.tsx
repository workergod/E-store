import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

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

const itemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(1, "Must be > 0"),
});

const poSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  purchaseDate: z.string().min(1, "Date is required"),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Add at least one item")
});

type POFormData = {
  supplierId: string;
  purchaseDate: string;
  expectedDeliveryDate?: string;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
  }[];
};

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const methods = useForm<POFormData>({
    resolver: zodResolver(poSchema) as any,
    defaultValues: {
      supplierId: '',
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
    };
    loadData();
  }, [companyId]);

  const onSubmit = async (data: POFormData) => {
    if (!companyId || !user) return;
    try {
      setIsSaving(true);
      
      const enrichedItems = data.items.map(item => {
        const prod = products.find(p => p.id === item.productId);
        return {
          ...item,
          productName: prod?.name || 'Unknown',
          sku: prod?.sku || '',
          receivedQuantity: 0
        };
      });

      const payload = {
        companyId,
        supplierId: data.supplierId,
        status: 'Draft' as const,
        purchaseDate: new Date(data.purchaseDate),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
        notes: data.notes,
        items: enrichedItems,
        createdBy: user.uid
      };

      await purchaseOrderRepository.create(payload, user.uid);
      toast.success("Purchase Order created successfully");
      navigate('/purchases');
    } catch (error: any) {
      toast.error(error.message || "Failed to save PO");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer>
      <div className="mb-[var(--spacing-md)]">
        <AppButton variant="ghost" size="sm" onClick={() => navigate('/purchases')} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to POs
        </AppButton>
      </div>
      
      <PageHeader 
        title="Create Purchase Order" 
        description="Draft a new PO to send to your supplier." 
      />

      <FormProvider {...methods}>
        <AppForm onSubmit={methods.handleSubmit(onSubmit)}>
          <FormSection title="Supplier & Dates" description="Select the vendor and expected delivery timeline.">
            <FormRow>
              <FormField label="Supplier" required error={methods.formState.errors.supplierId?.message}>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  {...methods.register('supplierId')} 
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                </select>
              </FormField>
              <FormField label="Purchase Date" required error={methods.formState.errors.purchaseDate?.message}>
                <AppInput type="date" {...methods.register('purchaseDate')} />
              </FormField>
              <FormField label="Expected Delivery Date" error={methods.formState.errors.expectedDeliveryDate?.message}>
                <AppInput type="date" {...methods.register('expectedDeliveryDate')} />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="Line Items" description="Add products to this order.">
            <div className="flex justify-end mb-4">
              <AppButton type="button" variant="outline" size="sm" onClick={() => append({ productId: '', quantity: 1 })}>
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </AppButton>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium w-32">Qty</th>
                    <th className="px-4 py-3 font-medium w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    return (
                      <tr key={field.id} className="border-b border-border">
                        <td className="px-2 py-2">
                          <select {...methods.register(`items.${index}.productId` as const)} className="flex h-10 w-full rounded-[var(--radius-input)] border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm">
                            <option value="">Select Product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <AppInput type="number" {...methods.register(`items.${index}.quantity` as const)} />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <AppButton type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </AppButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 pt-4 border-t border-border" />
          </FormSection>

          <FormSection title="Additional Details" description="Provide any extra notes for the supplier.">
            <FormField label="Notes / Remarks" error={methods.formState.errors.notes?.message}>
              <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" {...methods.register('notes')} placeholder="Any instructions for the supplier..." rows={4}></textarea>
            </FormField>
          </FormSection>

          <FormActions>
            <AppButton type="button" variant="outline" onClick={() => navigate('/purchases')} disabled={isSaving}>Cancel</AppButton>
            <AppButton type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Draft PO'}</AppButton>
          </FormActions>
        </AppForm>
      </FormProvider>
    </PageContainer>
  );
}
