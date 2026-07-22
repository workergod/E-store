import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';

interface MasterDataFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  extraFields?: ReactNode;
}

export function MasterDataForm({
  isOpen,
  onClose,
  title,
  description,
  form,
  onSubmit,
  isSubmitting,
  extraFields
}: MasterDataFormProps) {
  const { register, handleSubmit, formState: { errors } } = form;

  const handleOpenChange = (open: boolean) => !isSubmitting && !open && onClose();

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input id="name" {...register('name')} disabled={isSubmitting} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message as string}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="code">Code <span className="text-red-500">*</span></Label>
            <Input id="code" {...register('code')} disabled={isSubmitting} />
            {errors.code && <p className="text-sm text-red-500">{errors.code.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} disabled={isSubmitting} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...register('notes')} disabled={isSubmitting} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display Order</Label>
            <Input 
              id="displayOrder" 
              type="number" 
              {...register('displayOrder', { valueAsNumber: true })} 
              disabled={isSubmitting} 
            />
          </div>

          {extraFields}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
