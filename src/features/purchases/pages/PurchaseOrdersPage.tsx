import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
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
  const { company } = useAuthStore();
  const companyId = company?.companyId;

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

  const columns = [
    {
      header: 'PO Number',
      accessorKey: 'poNumber',
      cell: ({ row }: any) => <span className="font-medium">{row.original.poNumber}</span>
    },
    {
      header: 'Date',
      accessorKey: 'purchaseDate',
      cell: ({ row }: any) => {
        return row.original.purchaseDate && typeof (row.original.purchaseDate as any).toDate === 'function'
          ? (row.original.purchaseDate as any).toDate().toLocaleDateString()
          : 'Pending';
      }
    },
    {
      header: 'Supplier',
      accessorKey: 'supplierId',
      cell: ({ row }: any) => suppliers[row.original.supplierId]?.companyName || 'Unknown'
    },
    {
      header: 'Total Amount',
      accessorKey: 'totalAmount',
      cell: ({ row }: any) => <span className="font-medium">${row.original.totalAmount.toFixed(2)}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <StatusBadge status={row.original.status} />
      )
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: ({ row }: any) => (
        <div className="flex justify-end gap-2">
          {row.original.status === 'Draft' && (
            <AppButton variant="ghost" size="icon" onClick={() => navigate(`/purchases/edit/${row.original.id}`)}>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </AppButton>
          )}
          <AppButton variant="ghost" size="icon" onClick={() => navigate(`/purchases/${row.original.id}`)}>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </AppButton>
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
