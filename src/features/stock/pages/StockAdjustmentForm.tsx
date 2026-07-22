import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { stockAdjustmentRepository } from '../../../repositories/StockAdjustmentRepository';
import { productRepository } from '../../../repositories/ProductRepository';
import type { StockAdjustment, AdjustmentReason } from '../../../shared/types/StockAdjustment';
import type { Product } from '../../../shared/types/Product';

import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Label } from '../../../shared/ui/Label';

const REASONS: AdjustmentReason[] = ['PHYSICAL_COUNT', 'DAMAGED', 'LOST', 'FOUND', 'EXPIRED', 'CORRECTION', 'INITIAL_BALANCE', 'OTHER'];

const itemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  actualCount: z.coerce.number().min(0, "Cannot be negative")
});

const adjSchema = z.object({
  reason: z.enum(['PHYSICAL_COUNT', 'DAMAGED', 'LOST', 'FOUND', 'EXPIRED', 'CORRECTION', 'INITIAL_BALANCE', 'OTHER']),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Add at least one item")
});

type AdjFormData = {
  reason: AdjustmentReason;
  notes?: string;
  items: { productId: string; actualCount: number }[];
};

export default function StockAdjustmentForm() {
  const { id } = useParams<{ id: string }>();
  const isViewMode = !!id;
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [products, setProducts] = useState<Product[]>([]);
  const [adjustment, setAdjustment] = useState<StockAdjustment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isLoading, setIsLoading] = useState(isViewMode);

  const methods = useForm<AdjFormData>({
    resolver: zodResolver(adjSchema) as any,
    defaultValues: {
      reason: 'PHYSICAL_COUNT',
      items: [{ productId: '', actualCount: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "items"
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedItems = methods.watch("items");

  useEffect(() => {
    if (!companyId) return;
    const init = async () => {
      try {
        const prodData = await productRepository.getAll(companyId);
        setProducts(prodData.filter(p => p.status === 'Active'));

        if (id) {
          const adjData = await stockAdjustmentRepository.getById(id, companyId);
          if (adjData) {
            setAdjustment(adjData);
            methods.reset({
              reason: adjData.reason,
              notes: adjData.notes,
              items: adjData.items.map(i => ({ productId: i.productId, actualCount: i.actualCount }))
            });
          }
        }
      } catch (e) {
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [companyId, id, methods]);

  const onSubmit = async (data: AdjFormData) => {
    if (!companyId || !user || isViewMode) return;
    try {
      setIsSaving(true);
      
      let totalValueImpact = 0;
      const enrichedItems = data.items.map(item => {
        const prod = products.find(p => p.id === item.productId);
        if (!prod) throw new Error("Product not found");
        
        const systemStock = prod.currentStock || 0;
        const difference = item.actualCount - systemStock;

        return {
          productId: prod.id!,
          productName: prod.name,
          sku: prod.sku,
          systemStock,
          actualCount: item.actualCount,
          difference
        };
      });

      await stockAdjustmentRepository.create({
        companyId,
        reason: data.reason,
        notes: data.notes,
        items: enrichedItems,
        createdBy: user.uid
      }, user.uid);

      toast.success("Draft Adjustment created");
      navigate('/stock/adjustments');
    } catch (error: any) {
      toast.error(error.message || "Failed to save adjustment");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!companyId || !user || !id) return;
    try {
      setIsApproving(true);
      await stockAdjustmentRepository.approveAdjustment(id, companyId, user.uid);
      toast.success("Adjustment approved and ledger updated");
      navigate('/stock/adjustments');
    } catch (error: any) {
      toast.error(error.message || "Failed to approve adjustment");
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/stock/adjustments')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Adjustments
        </Button>
        {isViewMode && adjustment?.status === 'Draft' && (
          <Button onClick={handleApprove} disabled={isApproving} className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle className="h-4 w-4 mr-2" />
            {isApproving ? 'Approving...' : 'Approve & Update Ledger'}
          </Button>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {isViewMode ? `Adjustment ${adjustment?.adjustmentNumber}` : 'New Stock Adjustment'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isViewMode 
            ? `Status: ${adjustment?.status}. ${adjustment?.status === 'Approved' ? 'This adjustment is locked and ledger updated.' : ''}`
            : 'Draft a physical count or correct system discrepancies.'}
        </p>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit as any)} className="space-y-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Adjustment Reason *</Label>
              <select {...methods.register('reason')} disabled={isViewMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label>Notes / Reference</Label>
              <Input {...methods.register('notes')} disabled={isViewMode} className="mt-1" />
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Adjustment Items</h3>
              {!isViewMode && (
                <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', actualCount: 0 })}>
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 w-1/3">Product</th>
                    <th className="px-4 py-2 w-32 text-center">System Stock</th>
                    <th className="px-4 py-2 w-32 text-center">Actual Count</th>
                    <th className="px-4 py-2 w-32 text-center">Difference</th>
                    {!isViewMode && <th className="px-4 py-2 w-12"></th>}
                  </tr>
                </thead>
                <tbody>
                  {isViewMode ? (
                    adjustment?.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{item.productName} ({item.sku})</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{item.systemStock}</td>
                        <td className="px-4 py-3 text-center font-bold">{item.actualCount}</td>
                        <td className={`px-4 py-3 text-center font-bold ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-500' : ''}`}>
                          {item.difference > 0 ? '+' : ''}{item.difference}
                        </td>
                      </tr>
                    ))
                  ) : (
                    fields.map((field, index) => {
                      const wItem = watchedItems[index];
                      const prod = products.find(p => p.id === wItem.productId);
                      const sys = prod?.currentStock || 0;
                      const diff = (wItem.actualCount || 0) - sys;
                      return (
                        <tr key={field.id} className="border-b border-border last:border-0">
                          <td className="px-2 py-2">
                            <select {...methods.register(`items.${index}.productId` as const)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                              <option value="">Select Product...</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2 text-center font-medium text-muted-foreground">{prod ? sys : '-'}</td>
                          <td className="px-2 py-2">
                            <Input type="number" {...methods.register(`items.${index}.actualCount` as const)} className="h-9 text-center" />
                          </td>
                          <td className={`px-2 py-2 text-center font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : ''}`}>
                            {prod ? (diff > 0 ? `+${diff}` : diff) : '-'}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {methods.formState.errors.items?.root && (
                <p className="text-red-500 text-sm mt-2">{methods.formState.errors.items.root.message}</p>
              )}
            </div>
            
            {/* View Mode Extra Details */}
          </div>

          {!isViewMode && (
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/stock/adjustments')} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Draft'}</Button>
            </div>
          )}
        </form>
      </FormProvider>
    </div>
  );
}
