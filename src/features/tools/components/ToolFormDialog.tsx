import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { AppButton } from '../../../shared/app/AppButton';
import { toolRepository } from '../../../repositories/ToolRepository';
import type { Tool, ToolCondition, ToolStatus } from '../../../shared/types/Tool';

const toolSchema = z.object({
  toolCode: z.string().optional(),
  name: z.string().min(2, 'Tool name must be at least 2 characters'),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  totalQty: z.coerce.number().min(1, 'Total quantity must be at least 1'),
  condition: z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_REPAIR', 'DAMAGED']),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'DAMAGED', 'RETIRED']),
  location: z.string().optional(),
  purchaseCost: z.coerce.number().min(0).optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional()
});

type ToolFormData = z.infer<typeof toolSchema>;

interface ToolFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tool?: Tool;
  companyId: string;
  userId: string;
  onSuccess: () => void;
}

const CATEGORIES = [
  'HVAC & Refrigeration Equipment',
  'Vacuum Pumps & Gauges',
  'Power Tools',
  'Hand Tools',
  'Testing & Diagnostic Meters',
  'Welding & Brazing Kits',
  'Recovery Machines',
  'Piping & Flaring Tools',
  'Safety & Protection Gear',
  'Ladders & Access',
  'General Workshop'
];

export function ToolFormDialog({
  isOpen,
  onClose,
  tool,
  companyId,
  userId,
  onSuccess
}: ToolFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoCode, setAutoCode] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ToolFormData>({
    resolver: zodResolver(toolSchema) as any,
    defaultValues: {
      toolCode: '',
      name: '',
      category: 'HVAC & Refrigeration Equipment',
      brand: '',
      modelNumber: '',
      serialNumber: '',
      totalQty: 1,
      condition: 'GOOD',
      status: 'AVAILABLE',
      location: '',
      purchaseCost: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (tool) {
        reset({
          toolCode: tool.toolCode,
          name: tool.name,
          category: tool.category || 'HVAC & Refrigeration Equipment',
          brand: tool.brand || '',
          modelNumber: tool.modelNumber || '',
          serialNumber: tool.serialNumber || '',
          totalQty: tool.totalQty || 1,
          condition: tool.condition || 'GOOD',
          status: tool.status || 'AVAILABLE',
          location: tool.location || '',
          purchaseCost: tool.purchaseCost || 0,
          purchaseDate: tool.purchaseDate || '',
          notes: tool.notes || ''
        });
      } else {
        toolRepository.generateToolCode(companyId).then(code => {
          setAutoCode(code);
          reset({
            toolCode: code,
            name: '',
            category: 'HVAC & Refrigeration Equipment',
            brand: '',
            modelNumber: '',
            serialNumber: '',
            totalQty: 1,
            condition: 'GOOD',
            status: 'AVAILABLE',
            location: '',
            purchaseCost: 0,
            purchaseDate: new Date().toISOString().split('T')[0],
            notes: ''
          });
        });
      }
    }
  }, [isOpen, tool, companyId, reset]);

  const onSubmit = async (data: ToolFormData) => {
    try {
      setIsSubmitting(true);
      if (tool && tool.id) {
        // Edit existing tool
        const issuedQty = tool.issuedQty || 0;
        const maintenanceQty = tool.maintenanceQty || 0;
        const totalQty = Number(data.totalQty);
        const availableQty = Math.max(0, totalQty - issuedQty - maintenanceQty);

        await toolRepository.update(tool.id, {
          ...data,
          totalQty,
          availableQty,
          companyId
        }, companyId, userId);
        toast.success(`Tool "${data.name}" updated successfully`);
      } else {
        // Create new tool
        const totalQty = Number(data.totalQty);
        await toolRepository.create({
          ...data,
          toolCode: data.toolCode || autoCode,
          companyId,
          totalQty,
          availableQty: totalQty,
          issuedQty: 0,
          maintenanceQty: 0,
          condition: data.condition as ToolCondition,
          status: data.status as ToolStatus
        }, userId);
        toast.success(`Tool "${data.name}" added to inventory`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save tool');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppDialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tool ? `Edit Tool: ${tool.name}` : 'Add New Tool'}
      description="Register or update tools, machinery, and equipment in your inventory."
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Tool Code / Tag ID
            </label>
            <input
              type="text"
              {...register('toolCode')}
              placeholder={autoCode || "e.g. TOOL-001"}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono font-semibold"
            />
            {errors.toolCode && <p className="text-xs text-destructive mt-1">{errors.toolCode.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Tool Name *
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. 2-Stage Vacuum Pump 1/2 HP"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Category *
            </label>
            <select
              {...register('category')}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Brand / Manufacturer
            </label>
            <input
              type="text"
              {...register('brand')}
              placeholder="e.g. Yellow Jacket, Bosch, Makita, Value"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Model Number
            </label>
            <input
              type="text"
              {...register('modelNumber')}
              placeholder="e.g. V-i240SV"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Serial Number (Optional)
            </label>
            <input
              type="text"
              {...register('serialNumber')}
              placeholder="e.g. SN-894210"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Total Quantity Owned *
            </label>
            <input
              type="number"
              min="1"
              {...register('totalQty')}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold"
            />
            {errors.totalQty && <p className="text-xs text-destructive mt-1">{errors.totalQty.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Condition
            </label>
            <select
              {...register('condition')}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="NEW">New</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="NEEDS_REPAIR">Needs Repair</option>
              <option value="DAMAGED">Damaged</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Status
            </label>
            <select
              {...register('status')}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="AVAILABLE">Available</option>
              <option value="IN_USE">In Use</option>
              <option value="MAINTENANCE">Maintenance / Repair</option>
              <option value="DAMAGED">Damaged</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Storage Location
            </label>
            <input
              type="text"
              {...register('location')}
              placeholder="e.g. Shelf B3, Toolbox 4"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Approx. Cost (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              {...register('purchaseCost')}
              placeholder="0.00"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
            Notes / Accessories Included
          </label>
          <textarea
            rows={2}
            {...register('notes')}
            placeholder="e.g. Includes charging cable, 2 extra batteries, calibration certificate..."
            className="w-full rounded-lg border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <AppButton type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : tool ? 'Update Tool' : 'Add Tool'}
          </AppButton>
        </div>
      </form>
    </AppDialog>
  );
}
