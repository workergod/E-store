import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { Role } from '../../../constants/roles';
import { purchaseOrderRepository } from '../../../repositories/PurchaseOrderRepository';
import { supplierRepository } from '../../../repositories/SupplierRepository';
import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder';
import type { Supplier } from '../../../shared/types/Supplier';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppTable } from '../../../shared/tables/AppTable';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { company, user } = useAuthStore();
  const companyId = company?.companyId;

  const canDelete = 
    user?.role === Role.SUPER_ADMIN || 
    user?.role === Role.OWNER || 
    (user?.role as any) === Role.MD || 
    (user?.role as any) === 'MD' ||
    user?.email === 'workshop9283@gmail.com' || 
    user?.username === '@developeremil' ||
    user?.username === '@developeremilmd';

  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsLoading(true);
      const [posData, suppliersData] = await Promise.all([
        purchaseOrderRepository.getAll(companyId),
        supplierRepository.getAll(companyId)
      ]);
      setPos(posData);
      
      const supMap: Record<string, Supplier> = {};
      suppliersData.forEach(s => {
        if (s.id) supMap[s.id] = s;
      });
      setSuppliers(supMap);
    } catch (error) {
      toast.error('Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeletePO = async (poToDelete: PurchaseOrder) => {
    if (!companyId || !user || !poToDelete.id) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${poToDelete.poNumber}"?\n\nIf any goods were already received, stock balances will be reverted.`
    );
    if (!confirmed) return;

    try {
      await purchaseOrderRepository.delete(poToDelete.id, companyId, user.uid);
      toast.success(`Deleted Purchase Order ${poToDelete.poNumber}`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete purchase order');
    }
  };

  const columns = [
    {
      header: 'PO Number',
      accessorKey: 'poNumber',
      cell: ({ row }: any) => <span className="font-semibold text-primary font-mono">{row.original.poNumber}</span>
    },
    {
      header: 'Date',
      accessorKey: 'purchaseDate',
      cell: ({ row }: any) => {
        return row.original.purchaseDate && typeof (row.original.purchaseDate as any).toDate === 'function'
          ? (row.original.purchaseDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Pending';
      }
    },
    {
      header: 'Supplier',
      accessorKey: 'supplierId',
      cell: ({ row }: any) => {
        return row.original.supplierName || suppliers[row.original.supplierId]?.companyName || 'Not specified';
      }
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <StatusBadge status={row.original.status} />
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }: any) => (
        <div className="flex justify-end items-center gap-1.5">
          {row.original.status === 'Draft' && (
            <AppButton variant="ghost" size="icon" onClick={() => navigate(`/purchases/edit/${row.original.id}`)} title="Edit PO">
              <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </AppButton>
          )}
          <AppButton variant="ghost" size="icon" onClick={() => navigate(`/purchases/${row.original.id}`)} title="View PO Details">
            <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </AppButton>
          {canDelete && (
            <AppButton 
              variant="ghost" 
              size="icon" 
              onClick={() => handleDeletePO(row.original)} 
              title="Delete PO"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </AppButton>
          )}
        </div>
      )
    }
  ];

  return (
    <PageContainer>
      <PageHeader 
        title="Purchase Orders"
        description="Manage vendor orders and receive inventory."
        actions={
          <AppButton onClick={() => navigate('/purchases/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create PO
          </AppButton>
        }
      />
      
      <AppTable
        data={pos}
        columns={columns}
        isLoading={isLoading}
        searchKey="search"
        searchPlaceholder="Search by PO Number or Supplier..."
        emptyTitle="No purchase orders found"
        emptyDescription="Create your first purchase order to restock inventory."
      />
    </PageContainer>
  );
}
