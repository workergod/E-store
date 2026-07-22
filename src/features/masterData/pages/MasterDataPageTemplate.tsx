import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import type { BaseMasterData, MasterDataStatus } from '../../../shared/types/MasterData';
import { useAuthStore } from "../../../store/authStore";

import { MasterDataTable } from '../../../shared/master-data/MasterDataTable';
import { MasterDataForm } from '../../../shared/master-data/MasterDataForm';
import { StatusBadge } from '../../../shared/master-data/StatusBadge';
import { ConfirmDeleteDialog } from '../../../shared/master-data/ConfirmDeleteDialog';
import { RestoreDialog } from '../../../shared/master-data/RestoreDialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../../shared/ui/DropdownMenu';
import { Button } from '../../../shared/ui/Button';

const baseMasterDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(50),
  description: z.string().max(255).optional(),
  notes: z.string().optional(),
  displayOrder: z.number().int().default(0)
});

type BaseFormData = {
  name: string;
  code: string;
  description?: string;
  notes?: string;
  displayOrder: number;
};

interface MasterDataPageTemplateProps {
  title: string;
  description: string;
  repository: any; // Using any here to bypass complex generics for the specific repositories
  entityName: string;
}

export function MasterDataPageTemplate({ title, description, repository, entityName }: MasterDataPageTemplateProps) {
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;
  const userId = user?.uid;

  const [data, setData] = useState<BaseMasterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BaseMasterData | null>(null);

  const [deleteRecord, setDeleteRecord] = useState<BaseMasterData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [restoreRecord, setRestoreRecord] = useState<BaseMasterData | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const form = useForm<BaseFormData>({
    resolver: zodResolver(baseMasterDataSchema) as any,
    defaultValues: {
      name: '',
      code: '',
      description: '',
      notes: '',
      displayOrder: 0
    }
  });

  const loadData = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsLoading(true);
      const records = await repository.getAll(companyId);
      setData(records);
    } catch (error) {
      toast.error(`Failed to load ${entityName.toLowerCase()}s`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, repository, entityName]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleOpenForm = (record?: BaseMasterData) => {
    if (record) {
      setEditingRecord(record);
      form.reset({
        name: record.name,
        code: record.code,
        description: record.description || '',
        notes: record.notes || '',
        displayOrder: record.displayOrder
      });
    } else {
      setEditingRecord(null);
      form.reset({
        name: '',
        code: '',
        description: '',
        notes: '',
        displayOrder: 0
      });
    }
    setIsFormOpen(true);
  };

  const onSubmitForm = async (formData: BaseFormData) => {
    if (!companyId || !userId) return;
    try {
      setIsSubmitting(true);
      if (editingRecord && editingRecord.id) {
        await repository.update(editingRecord.id, formData, companyId, userId);
        toast.success(`${entityName} updated successfully`);
      } else {
        await repository.create({ ...formData, companyId, status: 'ACTIVE' }, userId);
        toast.success(`${entityName} created successfully`);
      }
      setIsFormOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || `Failed to save ${entityName.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!companyId || !userId || !deleteRecord?.id) return;
    try {
      setIsDeleting(true);
      await repository.softDelete(deleteRecord.id, companyId, userId);
      toast.success(`${entityName} archived successfully`);
      setDeleteRecord(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || `Failed to archive ${entityName.toLowerCase()}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const onConfirmRestore = async () => {
    if (!companyId || !userId || !restoreRecord?.id) return;
    try {
      setIsRestoring(true);
      await repository.restore(restoreRecord.id, companyId, userId);
      toast.success(`${entityName} restored successfully`);
      setRestoreRecord(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || `Failed to restore ${entityName.toLowerCase()}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const columns: ColumnDef<BaseMasterData>[] = [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'description', header: 'Description' },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status') as MasterDataStatus} />
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const record = row.original;
        const isActive = record.status === 'ACTIVE';

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenForm(record)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {isActive ? (
                <DropdownMenuItem className="text-red-600" onClick={() => setDeleteRecord(record)}>
                  <Trash className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setRestoreRecord(record)}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Restore
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <MasterDataTable 
        columns={columns} 
        data={data} 
        onAdd={() => handleOpenForm()} 
        addLabel={`Add ${entityName}`}
        isLoading={isLoading}
      />

      <MasterDataForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingRecord ? `Edit ${entityName}` : `Add ${entityName}`}
        form={form}
        onSubmit={onSubmitForm}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        isOpen={!!deleteRecord}
        onClose={() => setDeleteRecord(null)}
        onConfirm={onConfirmDelete}
        title={`Archive ${entityName}`}
        description={`Are you sure you want to archive "${deleteRecord?.name}"? It will no longer be available for new products.`}
        isDeleting={isDeleting}
      />

      <RestoreDialog
        isOpen={!!restoreRecord}
        onClose={() => setRestoreRecord(null)}
        onConfirm={onConfirmRestore}
        title={`Restore ${entityName}`}
        description={`Are you sure you want to restore "${restoreRecord?.name}"? It will become active again.`}
        isRestoring={isRestoring}
      />
    </div>
  );
}
