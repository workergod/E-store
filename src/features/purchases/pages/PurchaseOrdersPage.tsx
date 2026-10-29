import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Eye, Edit, Trash2, Printer, 
  ShoppingCart, Clock, CheckCircle2, PackageSearch 
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { Role } from '../../../constants/roles';
import { purchaseOrderRepository } from '../../../repositories/PurchaseOrderRepository';
import { supplierRepository } from '../../../repositories/SupplierRepository';
import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder';
import type { Supplier } from '../../../shared/types/Supplier';
import { printPurchaseOrder } from '../utils/printPurchaseOrder';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';
import { AppTable } from '../../../shared/tables/AppTable';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';
import { cn } from '../../../shared/utils/cn';

type FilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED';

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
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

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
      toast.error('Failed to load purchases');
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
      toast.success(`Deleted Purchase ${poToDelete.poNumber}`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete purchase');
    }
  };

  const handlePrintPO = async (poToPrint: PurchaseOrder) => {
    let sup: Supplier | null = suppliers[poToPrint.supplierId] || null;
    if (!sup && poToPrint.supplierId && companyId) {
      try {
        sup = await supplierRepository.getById(poToPrint.supplierId, companyId);
      } catch {
        // ignore
      }
    }
    printPurchaseOrder(
      poToPrint, 
      sup, 
      company, 
      user?.displayName || user?.email || 'Store In-Charge'
    );
  };

  // Metrics
  const totalCount = pos.length;
  const activeCount = pos.filter(p => p.status === 'Ordered' || p.status === 'Approved' || p.status === 'Partially Received').length;
  const completedCount = pos.filter(p => p.status === 'Completed').length;
  const totalUnits = pos.reduce((sum, p) => sum + (p.totalQuantity ?? (p.items || []).reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0)), 0);

  // Filtered dataset
  const filteredPOs = useMemo(() => {
    if (activeTab === 'ACTIVE') {
      return pos.filter(p => p.status === 'Ordered' || p.status === 'Approved' || p.status === 'Partially Received');
    }
    if (activeTab === 'COMPLETED') {
      return pos.filter(p => p.status === 'Completed');
    }
    return pos;
  }, [pos, activeTab]);

  const columns = [
    {
      header: 'Purchase ID',
      accessorKey: 'poNumber',
      cell: ({ row }: any) => (
        <span 
          onClick={() => navigate(`/purchases/${row.original.id}`)}
          className="font-semibold text-primary font-mono cursor-pointer hover:underline"
        >
          {row.original.poNumber}
        </span>
      )
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
      header: 'Items & Qty',
      cell: ({ row }: any) => {
        const items = row.original.items || [];
        const units = row.original.totalQuantity ?? items.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0);
        return (
          <span className="text-xs text-foreground font-medium">
            {items.length} {items.length === 1 ? 'item' : 'items'} • <span className="text-muted-foreground">{units} units</span>
          </span>
        );
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
          <AppButton 
            variant="ghost" 
            size="icon" 
            onClick={() => handlePrintPO(row.original)} 
            title="Print Purchase Order"
          >
            <Printer className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </AppButton>
          <AppButton 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(`/purchases/${row.original.id}`)} 
            title="View Details"
          >
            <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </AppButton>
          {row.original.status !== 'Completed' && row.original.status !== 'Cancelled' && (
            <AppButton 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/purchases/edit/${row.original.id}`)} 
              title="Edit Purchase Order"
            >
              <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </AppButton>
          )}
          {canDelete && (
            <AppButton 
              variant="ghost" 
              size="icon" 
              onClick={() => handleDeletePO(row.original)} 
              title="Delete Purchase"
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
        description="Manage active orders, supplier deliveries, and history of completed purchases."
        actions={
          <AppButton onClick={() => navigate('/purchases/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Purchase Order
          </AppButton>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AppCard className="p-4 flex items-center justify-between border border-border shadow-xs">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-black text-foreground mt-1">{totalCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">All time purchase history</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShoppingCart className="h-5 w-5" />
          </div>
        </AppCard>

        <AppCard className="p-4 flex items-center justify-between border border-border shadow-xs">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In-Progress</p>
            <p className="text-2xl font-black text-warning mt-1">{activeCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting supplier delivery</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </AppCard>

        <AppCard className="p-4 flex items-center justify-between border border-border shadow-xs">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Already Purchased</p>
            <p className="text-2xl font-black text-success mt-1">{completedCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Completed & received stock</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </AppCard>

        <AppCard className="p-4 flex items-center justify-between border border-border shadow-xs">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Units</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {totalUnits}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total units across orders</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-500/10 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <PackageSearch className="h-5 w-5" />
          </div>
        </AppCard>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            activeTab === 'ALL'
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          All Orders ({totalCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE')}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            activeTab === 'ACTIVE'
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          Pending / In Progress ({activeCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('COMPLETED')}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            activeTab === 'COMPLETED'
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          Completed & Already Purchased ({completedCount})
        </button>
      </div>
      
      <AppTable
        data={filteredPOs}
        columns={columns}
        isLoading={isLoading}
        searchKey="search"
        searchPlaceholder="Search by PO Number or Supplier..."
        emptyTitle={activeTab === 'COMPLETED' ? "No Completed Purchases Yet" : activeTab === 'ACTIVE' ? "No In-Progress Orders" : "No Purchase Orders Yet"}
        emptyDescription={
          activeTab === 'COMPLETED'
            ? "When goods are received or recorded as already purchased, they will appear here."
            : "Create your first purchase order to restock inventory from suppliers."
        }
      />

      {pos.length === 0 && !isLoading && (
        <div className="text-center pt-2 pb-6">
          <AppButton onClick={() => navigate('/purchases/new')} className="font-semibold shadow-xs">
            <Plus className="h-4 w-4 mr-2" />
            Create First Purchase Order
          </AppButton>
        </div>
      )}
    </PageContainer>
  );
}
