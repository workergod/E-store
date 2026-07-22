import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/ui/Dialog';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Label } from '../../../shared/ui/Label';
import { useAuthStore } from "../../../store/authStore";
import { productRepository } from '../../../repositories/ProductRepository';
import { toast } from 'sonner';
import type { Product } from '../../../shared/types/Product';

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  shortName: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional().default('general'),
  brandId: z.string().optional().default('general'),
  manufacturerId: z.string().optional(),
  productTypeId: z.string().optional(),
  unitId: z.string().optional().default('pcs'),
  rackLocationId: z.string().optional(),
  purchasePrice: z.coerce.number().optional().default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  mrp: z.coerce.number().optional(),
  openingStock: z.coerce.number().min(0).default(0),
  minimumStock: z.coerce.number().min(0).default(0),
  maximumStock: z.coerce.number().optional(),
  isSerialized: z.boolean().default(false),
  status: z.enum(['Active', 'Inactive', 'Discontinued', 'Coming Soon', 'Archived']).default('Active'),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product;
}

export function ProductFormDialog({ isOpen, onClose, onSuccess, product }: ProductFormDialogProps) {
  const { user, company } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'basic' | 'inventory'>('basic');
  const [isSaving, setIsSaving] = useState(false);

  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: product ? {
      name: product.name,
      shortName: product.shortName || '',
      description: product.description || '',
      categoryId: product.categoryId || 'general',
      brandId: product.brandId || 'general',
      manufacturerId: product.manufacturerId || '',
      productTypeId: product.productTypeId || '',
      unitId: product.unitId || 'pcs',
      rackLocationId: product.rackLocationId || '',
      purchasePrice: product.purchasePrice || 0,
      sellingPrice: product.sellingPrice || 0,
      mrp: product.mrp || 0,
      openingStock: product.openingStock || 0,
      minimumStock: product.minimumStock || 0,
      maximumStock: product.maximumStock || 0,
      isSerialized: product.isSerialized || false,
      status: product.status || 'Active',
    } : {
      name: '', shortName: '', description: '',
      categoryId: 'general', brandId: 'general', unitId: 'pcs',
      manufacturerId: '', productTypeId: '', rackLocationId: '',
      purchasePrice: 0, sellingPrice: 0, mrp: 0,
      openingStock: 0, minimumStock: 0, maximumStock: 0,
      isSerialized: false, status: 'Active',
    }
  });

  const onSubmit = async (data: ProductFormData) => {
    if (!company?.companyId || !user?.uid) return;
    try {
      setIsSaving(true);
      const payload = {
        ...data,
        categoryId: data.categoryId || 'general',
        brandId: data.brandId || 'general',
        unitId: data.unitId || 'pcs',
        companyId: company.companyId,
        currentStock: data.openingStock,
      };
      if (product?.id) {
        await productRepository.update(product.id, payload, company.companyId, user.uid);
        toast.success('Product updated successfully');
      } else {
        await productRepository.createDirect({ ...payload, sku: `SKU-${Date.now()}` }, user.uid);
        toast.success('Product created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'inventory', label: 'Inventory & Pricing' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[75vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>Fill in the product details below.</DialogDescription>
        </DialogHeader>

        <div className="flex border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <FormProvider {...methods}>
          <form id="product-form" onSubmit={methods.handleSubmit(onSubmit as any)} className="flex-1 overflow-y-auto p-4 custom-scrollbar">

            {/* BASIC INFO TAB */}
            {activeTab === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Product Name *</Label>
                  <Input {...methods.register('name')} placeholder="e.g. Copper Pipe 1/2 inch" />
                  {methods.formState.errors.name && <p className="text-red-500 text-xs mt-1">{methods.formState.errors.name.message}</p>}
                </div>
                <div>
                  <Label>Short Name</Label>
                  <Input {...methods.register('shortName')} placeholder="e.g. Cop Pipe 1/2" />
                </div>
                <div>
                  <Label>Status</Label>
                  <select {...methods.register('status')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Discontinued">Discontinued</option>
                    <option value="Coming Soon">Coming Soon</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <textarea {...methods.register('description')} className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Optional description..." />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input {...methods.register('categoryId')} placeholder="e.g. Electrical, Plumbing" />
                </div>
                <div>
                  <Label>Brand</Label>
                  <Input {...methods.register('brandId')} placeholder="e.g. Havells, Finolex" />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input {...methods.register('unitId')} placeholder="e.g. pcs, meter, roll" />
                </div>
                <div>
                  <Label>Rack / Location</Label>
                  <Input {...methods.register('rackLocationId')} placeholder="e.g. Shelf A3" />
                </div>
              </div>
            )}

            {/* INVENTORY & PRICING TAB */}
            {activeTab === 'inventory' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Selling Price (₹)</Label>
                  <Input type="number" step="0.01" {...methods.register('sellingPrice')} />
                </div>
                <div>
                  <Label>MRP (₹)</Label>
                  <Input type="number" step="0.01" {...methods.register('mrp')} />
                </div>

                <div className="col-span-2 border-t border-border my-1" />

                <div>
                  <Label>Opening Stock</Label>
                  <Input type="number" disabled={!!product?.id} {...methods.register('openingStock')} />
                  {product?.id && <p className="text-xs text-muted-foreground mt-1">Use Stock Adjustments to change stock.</p>}
                </div>
                <div>
                  <Label>Minimum Stock (Alert Level)</Label>
                  <Input type="number" {...methods.register('minimumStock')} />
                </div>
                <div>
                  <Label>Maximum Stock</Label>
                  <Input type="number" {...methods.register('maximumStock')} />
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <input type="checkbox" id="isSerialized" {...methods.register('isSerialized')} className="h-4 w-4" />
                  <Label htmlFor="isSerialized">Track Serial Numbers</Label>
                </div>
              </div>
            )}
          </form>
        </FormProvider>

        <DialogFooter className="mt-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" form="product-form" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
