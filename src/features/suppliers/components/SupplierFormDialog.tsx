import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/ui/Dialog';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Label } from '../../../shared/ui/Label';
import { useAuthStore } from "../../../store/authStore";
import { supplierRepository } from '../../../repositories/SupplierRepository';
import { toast } from 'sonner';
import type { Supplier } from '../../../shared/types/Supplier';

const supplierSchema = z.object({
  companyName: z.string().min(1, "Company Name is required"),
  supplierCode: z.string().optional(),
  contactPerson: z.string().min(1, "Contact Person is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email"),
  website: z.string().optional(),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.coerce.number().optional(),
  creditDays: z.coerce.number().optional(),
  defaultCurrency: z.string().default('USD'),
  isPreferredSupplier: z.boolean().default(false),
  notes: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).default('Active')
});

type SupplierFormData = {
  companyName: string;
  supplierCode?: string;
  contactPerson: string;
  phone: string;
  email: string;
  website?: string;
  gstNumber?: string;
  address?: string;
  paymentTerms?: string;
  creditLimit?: number;
  creditDays?: number;
  defaultCurrency: string;
  isPreferredSupplier: boolean;
  notes?: string;
  status: 'Active' | 'Inactive';
};

interface SupplierFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier;
}

export function SupplierFormDialog({ isOpen, onClose, onSuccess, supplier }: SupplierFormDialogProps) {
  const { user, company } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'basic' | 'financial'>('basic');
  const [isSaving, setIsSaving] = useState(false);

  const methods = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: supplier ? {
      companyName: supplier.companyName,
      supplierCode: supplier.supplierCode || '',
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      website: supplier.website || '',
      gstNumber: supplier.gstNumber || '',
      address: supplier.address || '',
      paymentTerms: supplier.paymentTerms || '',
      creditLimit: supplier.creditLimit || 0,
      creditDays: supplier.creditDays || 0,
      defaultCurrency: supplier.defaultCurrency || 'USD',
      isPreferredSupplier: supplier.isPreferredSupplier || false,
      notes: supplier.notes || '',
      status: supplier.status || 'Active'
    } : {
      companyName: '', supplierCode: '', contactPerson: '', phone: '', email: '', website: '', gstNumber: '', address: '', paymentTerms: 'Net 30', creditLimit: 0, creditDays: 30, defaultCurrency: 'USD', isPreferredSupplier: false, notes: '', status: 'Active'
    }
  });

  const onSubmit = async (data: SupplierFormData) => {
    if (!company?.companyId || !user?.uid) return;
    try {
      setIsSaving(true);
      if (supplier?.id) {
        await supplierRepository.update(supplier.id, data, company.companyId, user.uid);
        toast.success('Supplier updated successfully');
      } else {
        await supplierRepository.create({ ...data, companyId: company.companyId }, user.uid);
        toast.success('Supplier created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save supplier');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          <DialogDescription>Manage supplier contact and financial details.</DialogDescription>
        </DialogHeader>

        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'basic' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Basic & Contact
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'financial' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Financial & Tax
          </button>
        </div>

        <FormProvider {...methods}>
          <form id="supplier-form" onSubmit={methods.handleSubmit(onSubmit as any)} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            
            {activeTab === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Company Name *</Label>
                  <Input {...methods.register('companyName')} />
                  {methods.formState.errors.companyName && <p className="text-red-500 text-xs mt-1">{methods.formState.errors.companyName.message}</p>}
                </div>
                <div>
                  <Label>Supplier Code</Label>
                  <Input {...methods.register('supplierCode')} placeholder="e.g. SUP-001" />
                </div>
                <div>
                  <Label>Status</Label>
                  <select {...methods.register('status')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <Label>Contact Person *</Label>
                  <Input {...methods.register('contactPerson')} />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input {...methods.register('phone')} />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" {...methods.register('email')} />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input {...methods.register('website')} />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <textarea {...methods.register('address')} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>GST / Tax Number</Label>
                  <Input {...methods.register('gstNumber')} />
                </div>
                <div>
                  <Label>Payment Terms</Label>
                  <Input {...methods.register('paymentTerms')} placeholder="e.g. Net 30, Due on Receipt" />
                </div>
                <div>
                  <Label>Credit Limit</Label>
                  <Input type="number" {...methods.register('creditLimit')} />
                </div>
                <div>
                  <Label>Credit Days</Label>
                  <Input type="number" {...methods.register('creditDays')} />
                </div>
                <div>
                  <Label>Default Currency</Label>
                  <Input {...methods.register('defaultCurrency')} />
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <input type="checkbox" id="isPreferredSupplier" {...methods.register('isPreferredSupplier')} className="h-4 w-4" />
                  <Label htmlFor="isPreferredSupplier">Mark as Preferred Supplier</Label>
                </div>
                <div className="col-span-2">
                  <Label>Internal Notes</Label>
                  <textarea {...methods.register('notes')} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
            )}
          </form>
        </FormProvider>

        <DialogFooter className="mt-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" form="supplier-form" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Supplier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
