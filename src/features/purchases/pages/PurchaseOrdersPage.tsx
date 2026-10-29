import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Eye, Edit, Trash2, Printer, 
  ShoppingCart, Clock, CheckCircle2, PackageSearch, AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { Role } from '../../../constants/roles';
import { purchaseOrderRepository } from '../../../repositories/PurchaseOrderRepository';
import { supplierRepository } from '../../../repositories/SupplierRepository';
import { productRepository } from '../../../repositories/ProductRepository';
import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder';
import type { Supplier } from '../../../shared/types/Supplier';
import type { Product } from '../../../shared/types/Product';
import { printPurchaseOrder } from '../utils/printPurchaseOrder';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';
import { AppTable } from '../../../shared/tables/AppTable';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { ProductSearchSelect } from '../../../shared/forms/ProductSearchSelect';
import { SupplierSearchSelect } from '../../../shared/forms/SupplierSearchSelect';
import { cn } from '../../../shared/utils/cn';

type FilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED';

interface RefillItem {
  productId: string;
  productName: string;
  quantity: number | string;
  unit?: string;
  unitPrice?: number;
}

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
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  // Refill Form Modal State
  const [isCreateRefillOpen, setIsCreateRefillOpen] = useState(false);
  const [isSubmittingRefill, setIsSubmittingRefill] = useState(false);
  const [refillItems, setRefillItems] = useState<RefillItem[]>([
    { productId: '', productName: '', quantity: 1, unit: 'pcs', unitPrice: 0 }
  ]);
  const [refillSupplierId, setRefillSupplierId] = useState('');
  const [refillSupplierName, setRefillSupplierName] = useState('');
  const [refillPurchaseDate, setRefillPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [refillNotes, setRefillNotes] = useState('');
  const [refillMarkAsReceived, setRefillMarkAsReceived] = useState(false);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsLoading(true);
      const [posData, suppliersData, productsData] = await Promise.all([
        purchaseOrderRepository.getAll(companyId),
        supplierRepository.getAll(companyId),
        productRepository.getAll(companyId)
      ]);
      setPos(posData);
      setProducts(productsData.filter(p => !p.status || p.status.toLowerCase() === 'active'));
      
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

  const lowStockProducts = useMemo(() => {
    return products.filter(p => (Number(p.currentStock) || 0) <= (Number(p.minimumStock) || 0));
  }, [products]);

  const refillTotalUnits = useMemo(() => {
    return refillItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  }, [refillItems]);

  const handleAddAllLowStock = () => {
    if (lowStockProducts.length === 0) {
      toast.info("No low stock products found!");
      return;
    }
    const items: RefillItem[] = lowStockProducts.map(p => {
      const minStock = Number(p.minimumStock) || 0;
      const curStock = Number(p.currentStock) || 0;
      const needed = Math.max(minStock - curStock, 1);
      const u = p.unitId || (p as any).unit || 'pcs';
      return {
        productId: p.id || '',
        productName: p.name,
        quantity: needed,
        unit: u,
        unitPrice: 0
      };
    });
    setRefillItems(items);
    toast.success(`Added ${items.length} low-stock products to refill list!`);
  };

  const handleAddItem = () => {
    setRefillItems(prev => [...prev, { productId: '', productName: '', quantity: 1, unit: 'pcs', unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setRefillItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof RefillItem, val: any) => {
    setRefillItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const resetRefillForm = () => {
    setRefillItems([{ productId: '', productName: '', quantity: 1, unit: 'pcs', unitPrice: 0 }]);
    setRefillSupplierId('');
    setRefillSupplierName('');
    setRefillPurchaseDate(new Date().toISOString().split('T')[0]);
    setRefillNotes('');
    setRefillMarkAsReceived(false);
  };

  const handleCreateRefillOrder = async (shouldPrint = true) => {
    if (!companyId || !user) return;
    
    const validItems = refillItems.filter(i => (i.productName && i.productName.trim().length > 0) || i.productId);
    if (validItems.length === 0) {
      toast.error("Please add at least one product or item to refill");
      return;
    }

    for (const it of validItems) {
      if (!it.quantity || Number(it.quantity) <= 0) {
        toast.error(`Please enter a valid quantity for "${it.productName || 'Item'}"`);
        return;
      }
    }

    try {
      setIsSubmittingRefill(true);

      const enrichedItems = validItems.map(item => {
        const prod = products.find(p => p.id === item.productId);
        const finalName = item.productName?.trim() || prod?.name || 'Item';
        const unit = prod?.unitId || (prod as any)?.unit || item.unit || 'pcs';
        const qty = Number(item.quantity) || 0;
        return {
          productId: item.productId || '',
          productName: finalName,
          sku: prod?.sku || '',
          quantity: qty,
          unitPrice: 0,
          totalAmount: 0,
          unit,
          receivedQuantity: refillMarkAsReceived ? qty : 0
        };
      });

      const totalQuantity = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);

      const effectiveSupplierName = refillSupplierName?.trim() || 
        (refillSupplierId ? suppliers[refillSupplierId]?.companyName : '') || 
        'Direct Vendor / Cash';

      const payload = {
        companyId,
        supplierId: refillSupplierId || '',
        supplierName: effectiveSupplierName,
        status: (refillMarkAsReceived ? 'Completed' : 'Ordered') as any,
        purchaseDate: new Date(refillPurchaseDate || new Date().toISOString().split('T')[0]),
        notes: refillNotes || '',
        items: enrichedItems,
        totalQuantity,
        totalAmount: 0,
        attachments: [],
        attachmentUrls: [],
        createdBy: user.uid
      };

      const newId = await purchaseOrderRepository.create(payload, user.uid, Boolean(refillMarkAsReceived));
      const createdPO = await purchaseOrderRepository.getById(newId, companyId);

      toast.success("Purchase Order created successfully!");

      if (shouldPrint && createdPO) {
        const sup = suppliers[createdPO.supplierId] || null;
        printPurchaseOrder(
          createdPO,
          sup,
          company,
          user?.displayName || user?.email || 'Store In-Charge'
        );
      }

      setIsCreateRefillOpen(false);
      resetRefillForm();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create purchase order");
    } finally {
      setIsSubmittingRefill(false);
    }
  };

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
          <AppButton 
            onClick={() => {
              resetRefillForm();
              setIsCreateRefillOpen(true);
            }} 
            className="shadow-xs font-semibold"
          >
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
          <AppButton 
            onClick={() => {
              resetRefillForm();
              setIsCreateRefillOpen(true);
            }} 
            className="font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create First Purchase Order
          </AppButton>
        </div>
      )}

      {/* Refill Store Items Form Modal */}
      <AppDialog
        isOpen={isCreateRefillOpen}
        onOpenChange={setIsCreateRefillOpen}
        title="Create Purchase Order (Store Items Refill)"
        description="Select store products to refill, specify order quantities, and print the purchase list."
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-5">
          {/* Low Stock Quick Helper */}
          {lowStockProducts.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{lowStockProducts.length} product(s)</strong> are low in stock or need restocking.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddAllLowStock}
                className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
              >
                + Add All Low Stock Items
              </button>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Products to Refill
              </label>
              <span className="text-xs text-muted-foreground font-medium">
                {refillItems.filter(i => i.productName || i.productId).length} items • {refillTotalUnits} units
              </span>
            </div>

            <div className="border border-border rounded-lg overflow-visible">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold text-left w-[55%]">Product / Item</th>
                    <th className="px-3 py-2.5 font-semibold text-left w-[20%]">Current Stock</th>
                    <th className="px-3 py-2.5 font-semibold text-left w-[20%] min-w-[120px]">Refill Qty</th>
                    <th className="px-2 py-2.5 text-center w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {refillItems.map((item, idx) => {
                    const prod = products.find(p => p.id === item.productId);
                    const currentStock = prod ? Number(prod.currentStock) || 0 : 0;
                    const unit = prod ? (prod.unitId || (prod as any).unit || 'pcs') : (item.unit || 'pcs');

                    return (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="p-2.5 relative">
                          <ProductSearchSelect
                            value={item.productId || ''}
                            productName={item.productName || ''}
                            onChange={(prodId, prodName, product) => {
                              handleItemChange(idx, 'productId', prodId);
                              handleItemChange(idx, 'productName', prodName || product?.name || '');
                              if (product) {
                                const u = product.unitId || (product as any).unit || 'pcs';
                                handleItemChange(idx, 'unit', u);
                              }
                            }}
                            products={products}
                            allowCustom={true}
                            placeholder="Type or select product to refill..."
                          />
                          {prod?.sku ? (
                            <div className="text-[11px] font-mono text-muted-foreground mt-1 ml-1 flex items-center gap-1.5">
                              <span className="bg-muted px-1.5 py-0.5 rounded border border-border/40 text-[10px]">SKU</span>
                              <span>{prod.sku}</span>
                            </div>
                          ) : item.productName && !item.productId ? (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 ml-1">
                              <span className="bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10px]">Custom Item</span>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-xs">
                          {prod ? (
                            <span className={currentStock > 0 ? "text-[hsl(var(--success))] font-bold text-sm" : "text-destructive font-bold text-sm"}>
                              {currentStock} <span className="font-normal text-xs text-muted-foreground">{unit}</span>
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-2.5">
                          <div className="relative flex items-center min-w-[100px]">
                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full h-9 rounded-md border border-input bg-background px-3 pr-12 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                              placeholder="1"
                            />
                            {unit && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-muted-foreground">
                                {unit}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={refillItems.length === 1}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline cursor-pointer pt-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Another Product
            </button>
          </div>

          {/* Supplier & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Supplier (Optional)</label>
              <SupplierSearchSelect
                supplierId={refillSupplierId}
                supplierName={refillSupplierName}
                onChange={(supId, supName) => {
                  setRefillSupplierId(supId);
                  setRefillSupplierName(supName);
                }}
                suppliers={Object.values(suppliers)}
                placeholder="Select or type vendor..."
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Purchase Date</label>
              <input
                type="date"
                value={refillPurchaseDate}
                onChange={(e) => setRefillPurchaseDate(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Buying Instructions / Notes</label>
            <textarea
              value={refillNotes}
              onChange={(e) => setRefillNotes(e.target.value)}
              placeholder="Instructions for the purchasing team or supplier..."
              rows={3}
              className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Mark as Received checkbox */}
          <div className="p-3 rounded-lg border border-border bg-muted/20">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={refillMarkAsReceived}
                onChange={(e) => setRefillMarkAsReceived(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  Already Purchased & Received
                </span>
                <span className="text-[11px] text-muted-foreground block leading-tight">
                  Check if goods are already received to immediately complete order and add quantities to store stock.
                </span>
              </div>
            </label>
          </div>

          {/* Dialog Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
            <AppButton
              type="button"
              variant="ghost"
              onClick={() => setIsCreateRefillOpen(false)}
              disabled={isSubmittingRefill}
            >
              Cancel
            </AppButton>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <AppButton
                type="button"
                variant="outline"
                onClick={() => handleCreateRefillOrder(false)}
                disabled={isSubmittingRefill}
              >
                Create Only
              </AppButton>
              <AppButton
                type="button"
                onClick={() => handleCreateRefillOrder(true)}
                disabled={isSubmittingRefill}
                className="bg-primary text-primary-foreground font-semibold shadow-xs"
              >
                <Printer className="h-4 w-4 mr-2" />
                {isSubmittingRefill ? 'Creating...' : 'Print & Create Refill List'}
              </AppButton>
            </div>
          </div>
        </div>
      </AppDialog>
    </PageContainer>
  );
}
