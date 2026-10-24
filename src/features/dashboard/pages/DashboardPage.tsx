import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../firebase/firestore'
import { PageContainer } from '../../../shared/layouts/PageContainer'
import { AppTable } from '../../../shared/tables/AppTable'
import { 
  Package, AlertCircle, RefreshCw, ArrowRight, ArrowUpRight, ArrowDownLeft, 
  Wrench, Hammer, RotateCcw, ShoppingCart, CheckCircle2,
  Boxes, ShieldAlert, Sparkles, Calendar
} from 'lucide-react'

import { useAuthStore } from "../../../store/authStore"
import { productRepository } from '../../../repositories/ProductRepository'
import { issueRepository } from '../../../repositories/IssueRepository'
import { employeeRepository } from '../../../repositories/EmployeeRepository'
import { toolRepository } from '../../../repositories/ToolRepository'
import { toolTransactionRepository } from '../../../repositories/ToolTransactionRepository'
import { purchaseOrderRepository } from '../../../repositories/PurchaseOrderRepository'
import type { Product } from '../../../shared/types/Product'
import type { Tool, ToolIssueTransaction, ToolReturnTransaction } from '../../../shared/types/Tool'
import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder'

type DashboardTab = 'materials' | 'tools' | 'low-stock' | 'purchases'
type MaterialSubFilter = 'ALL' | 'ISSUE' | 'RETURN'
type ToolSubFilter = 'ALL' | 'ISSUE' | 'RETURN'

export default function DashboardPage() {
  const { company, user } = useAuthStore()
  const companyId = company?.companyId
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role === 'Technician') {
      navigate('/my-materials', { replace: true })
    }
  }, [user, navigate])

  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<DashboardTab>('materials')
  const [materialFilter, setMaterialFilter] = useState<MaterialSubFilter>('ALL')
  const [toolFilter, setToolFilter] = useState<ToolSubFilter>('ALL')

  // Raw data state
  const [productsList, setProductsList] = useState<Product[]>([])
  const [purchaseList, setPurchaseList] = useState<PurchaseOrder[]>([])
  const [recentMaterialMovements, setRecentMaterialMovements] = useState<any[]>([])
  const [recentToolMovements, setRecentToolMovements] = useState<any[]>([])

  // Metrics summary
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalTools: 0,
    toolsInUse: 0,
    toolsAvailable: 0,
    pendingReturns: 0,
    openPurchases: 0,
    totalPurchases: 0
  })

  useEffect(() => {
    if (!companyId) return

    const loadDashboard = async () => {
      try {
        setIsLoading(true)
        const [
          products, 
          issues, 
          returnSnap, 
          employees,
          tools,
          toolIssues,
          toolReturns,
          purchases
        ] = await Promise.all([
          productRepository.getAll(companyId),
          issueRepository.getAll(companyId),
          getDocs(query(collection(db, 'returnTransactions'), where('companyId', '==', companyId))),
          employeeRepository.getAll(companyId),
          toolRepository.getAll(companyId),
          toolTransactionRepository.getIssueTransactions(companyId),
          toolTransactionRepository.getReturnTransactions(companyId),
          purchaseOrderRepository.getAll(companyId)
        ])

        setProductsList(products)
        setPurchaseList(purchases)

        // Metrics calculations
        const totalProducts = products.length
        const lowStockProducts = products.filter(p => (p.currentStock || 0) <= (p.minimumStock || 0))
        const lowStock = lowStockProducts.length

        const totalTools = tools.length
        const toolsInUse = tools.reduce((acc, t) => acc + (t.issuedQty || (t.status === 'IN_USE' ? 1 : 0)), 0)
        const toolsAvailable = tools.reduce((acc, t) => acc + (t.availableQty || (t.status === 'AVAILABLE' ? 1 : 0)), 0)

        const pendingReturns = issues.filter(i => i.status === 'PARTIALLY_RETURNED' || i.status === 'ISSUED').length
        const openPurchases = purchases.filter(p => p.status === 'Ordered' || p.status === 'Approved' || p.status === 'Partially Received').length

        setMetrics({
          totalProducts,
          lowStock,
          totalTools,
          toolsInUse,
          toolsAvailable,
          pendingReturns,
          openPurchases,
          totalPurchases: purchases.length
        })

        // Build employee ID -> name map
        const empMap: Record<string, string> = {}
        employees.forEach(e => {
          if (e.id) {
            empMap[e.id] = `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.username || 'Technician'
          }
        })

        // 1. Format Material Issues
        const formattedIssues = issues.map(i => {
          const d = (i.createdAt as any)?.toDate ? (i.createdAt as any).toDate() : (i.issueDate ? new Date(i.issueDate) : new Date());
          const dateFormatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const timeFormatted = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          const techName = i.employeeName || empMap[i.employeeId] || i.employeeId || 'Technician';
          const itemsText = (i.items || []).map(it => `${it.productName} (${it.issuedQty} ${it.unit || ''})`).join(', ');

          return {
            id: i.id,
            movementType: 'ISSUE' as const,
            refNumber: i.issueNumber || 'CRYO-1',
            technician: techName,
            siteName: i.siteName || '',
            items: itemsText || 'No items',
            rawDate: d.getTime(),
            date: `${dateFormatted}, ${timeFormatted}`,
            status: i.status || 'ISSUED'
          };
        });

        // 2. Format Material Returns
        const returnsData = returnSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const formattedReturns = returnsData.map(r => {
          const d = r.createdAt?.toDate ? r.createdAt.toDate() : (r.returnDate ? new Date(r.returnDate) : new Date());
          const dateFormatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const timeFormatted = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          const techName = r.employeeName || empMap[r.employeeId] || r.employeeId || 'Technician';
          const itemsText = (r.items || []).map((it: any) => `${it.productName} (${it.returnedQty} ${it.unit || ''})`).join(', ');
          const refNumber = r.isDirectReturn 
            ? (r.directReturnNumber || 'CRYO(W/O)-1') 
            : (r.issueNumber ? `${r.issueNumber} (Ret)` : 'Return');

          return {
            id: r.id,
            movementType: 'RETURN' as const,
            isDirectReturn: Boolean(r.isDirectReturn),
            refNumber,
            technician: techName,
            siteName: r.siteName || '',
            items: itemsText || 'No items',
            rawDate: d.getTime(),
            date: `${dateFormatted}, ${timeFormatted}`,
            status: r.isDirectReturn ? 'DIRECT RETURN' : 'RETURNED'
          };
        });

        // Combine and sort material movements (newest first, limit 10)
        const combinedMaterials = [...formattedIssues, ...formattedReturns].sort((a, b) => b.rawDate - a.rawDate);
        setRecentMaterialMovements(combinedMaterials);

        // 3. Format Tool Issues & Returns
        const formattedToolIssues = toolIssues.map(ti => {
          const d = (ti.createdAt as any)?.toDate ? (ti.createdAt as any).toDate() : (ti.issueDate ? new Date(ti.issueDate) : new Date());
          const dateFormatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const timeFormatted = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          const techName = ti.employeeName || empMap[ti.employeeId] || ti.employeeId || 'Technician';
          const toolsSummary = (ti.items || []).map(it => `${it.toolName} (x${it.quantity})`).join(', ');

          return {
            id: ti.id,
            movementType: 'ISSUE' as const,
            refNumber: ti.issueNumber || 'CRYO-TISS-1',
            technician: techName,
            siteName: ti.siteName || '',
            toolsSummary: toolsSummary || 'No tools',
            rawDate: d.getTime(),
            date: `${dateFormatted}, ${timeFormatted}`,
            status: ti.status || 'ISSUED'
          };
        });

        const formattedToolReturns = toolReturns.map(tr => {
          const d = (tr.createdAt as any)?.toDate ? (tr.createdAt as any).toDate() : (tr.returnDate ? new Date(tr.returnDate) : new Date());
          const dateFormatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const timeFormatted = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          const techName = tr.employeeName || empMap[tr.employeeId] || tr.employeeId || 'Technician';
          const toolsSummary = (tr.items || []).map(it => `${it.toolName} (x${it.returnQty} - ${it.conditionIn})`).join(', ');

          return {
            id: tr.id,
            movementType: 'RETURN' as const,
            refNumber: tr.returnNumber || 'CRYO-TRET-1',
            technician: techName,
            siteName: tr.siteName || '',
            toolsSummary: toolsSummary || 'No tools',
            rawDate: d.getTime(),
            date: `${dateFormatted}, ${timeFormatted}`,
            status: 'RETURNED'
          };
        });

        const combinedTools = [...formattedToolIssues, ...formattedToolReturns].sort((a, b) => b.rawDate - a.rawDate);
        setRecentToolMovements(combinedTools);

      } catch (error) {
        console.error("Dashboard error", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadDashboard()
  }, [companyId])

  // Filtered lists
  const filteredMaterials = useMemo(() => {
    if (materialFilter === 'ALL') return recentMaterialMovements.slice(0, 8);
    return recentMaterialMovements.filter(m => m.movementType === materialFilter).slice(0, 8);
  }, [recentMaterialMovements, materialFilter]);

  const filteredTools = useMemo(() => {
    if (toolFilter === 'ALL') return recentToolMovements.slice(0, 8);
    return recentToolMovements.filter(t => t.movementType === toolFilter).slice(0, 8);
  }, [recentToolMovements, toolFilter]);

  const lowStockItems = useMemo(() => {
    return productsList
      .filter(p => (p.currentStock || 0) <= (p.minimumStock || 0))
      .sort((a, b) => (a.currentStock || 0) - (b.currentStock || 0))
      .slice(0, 8);
  }, [productsList]);

  const recentPurchases = useMemo(() => {
    return [...purchaseList]
      .sort((a, b) => {
        const ta = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : 0;
        const tb = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : 0;
        return tb - ta;
      })
      .slice(0, 8);
  }, [purchaseList]);

  // Table Columns Definitions
  const materialColumns = [
    { 
      header: 'Reference ID', 
      accessorKey: 'refNumber',
      cell: ({ row }: any) => {
        const isRet = row.original.movementType === 'RETURN';
        const isDir = row.original.isDirectReturn;
        return (
          <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded border inline-flex items-center gap-1 ${
            isDir 
              ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              : isRet
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
          }`}>
            {row.original.refNumber}
          </span>
        )
      }
    },
    { 
      header: 'Technician & Site', 
      accessorKey: 'technician',
      cell: ({ row }: any) => (
        <div>
          <span className="font-semibold text-foreground text-xs block">{row.original.technician}</span>
          {row.original.siteName ? (
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              {row.original.siteName}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic">No site assigned</span>
          )}
        </div>
      )
    },
    { 
      header: 'Items Dispatched / Returned', 
      accessorKey: 'items', 
      cell: ({ row }: any) => (
        <span className="truncate max-w-[300px] block text-xs text-muted-foreground font-medium" title={row.original.items}>
          {row.original.items}
        </span>
      )
    },
    { 
      header: 'Date & Time', 
      accessorKey: 'date',
      cell: ({ row }: any) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{row.original.date}</span>
      )
    },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: ({ row }: any) => {
        const s = row.original.status;
        return (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
            s === 'CLOSED'
              ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              : s === 'PARTIALLY_RETURNED'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
              : s === 'DIRECT RETURN'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
              : s === 'RETURNED'
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
          }`}>
            {s}
          </span>
        )
      }
    }
  ];

  const toolColumns = [
    { 
      header: 'Transaction ID', 
      accessorKey: 'refNumber',
      cell: ({ row }: any) => (
        <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded border inline-flex items-center gap-1 ${
          row.original.movementType === 'RETURN'
            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        }`}>
          {row.original.movementType === 'RETURN' ? <RotateCcw className="h-3 w-3" /> : <Hammer className="h-3 w-3" />}
          {row.original.refNumber}
        </span>
      )
    },
    { 
      header: 'Technician & Location', 
      accessorKey: 'technician',
      cell: ({ row }: any) => (
        <div>
          <span className="font-semibold text-foreground text-xs block">{row.original.technician}</span>
          {row.original.siteName ? (
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              {row.original.siteName}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic">Store / Workshop</span>
          )}
        </div>
      )
    },
    { 
      header: 'Tools & Equipment', 
      accessorKey: 'toolsSummary', 
      cell: ({ row }: any) => (
        <span className="truncate max-w-[320px] block text-xs text-muted-foreground font-medium" title={row.original.toolsSummary}>
          {row.original.toolsSummary}
        </span>
      )
    },
    { 
      header: 'Date & Time', 
      accessorKey: 'date',
      cell: ({ row }: any) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{row.original.date}</span>
      )
    },
    { 
      header: 'Movement', 
      accessorKey: 'movementType',
      cell: ({ row }: any) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
          row.original.movementType === 'RETURN'
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
        }`}>
          {row.original.movementType === 'RETURN' ? 'RETURNED TO STORE' : 'ISSUED TO FIELD'}
        </span>
      )
    }
  ];

  const lowStockColumns = [
    {
      header: 'Product Name',
      accessorKey: 'name',
      cell: ({ row }: any) => (
        <div>
          <span className="font-semibold text-foreground text-xs block">{row.original.name}</span>
          <span className="text-[11px] text-muted-foreground">{row.original.category || 'General'}</span>
        </div>
      )
    },
    {
      header: 'SKU / Barcode',
      accessorKey: 'sku',
      cell: ({ row }: any) => (
        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {row.original.sku || 'N/A'}
        </span>
      )
    },
    {
      header: 'Current Stock',
      accessorKey: 'currentStock',
      cell: ({ row }: any) => {
        const cur = row.original.currentStock || 0;
        const min = row.original.minimumStock || 0;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-bold text-xs ${cur === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {cur} {row.original.unit || ''}
            </span>
            <span className="text-[10px] text-muted-foreground">
              (Min: {min})
            </span>
          </div>
        );
      }
    },
    {
      header: 'Urgency',
      id: 'urgency',
      cell: ({ row }: any) => {
        const cur = row.original.currentStock || 0;
        return cur === 0 ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            OUT OF STOCK
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            LOW STOCK
          </span>
        );
      }
    },
    {
      header: 'Quick Action',
      id: 'action',
      cell: ({ row }: any) => (
        <button
          onClick={() => navigate('/purchases/new', { state: { prefillProduct: row.original } })}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
        >
          <ShoppingCart className="h-3 w-3" />
          + Reorder
        </button>
      )
    }
  ];

  const purchaseColumns = [
    {
      header: 'Purchase ID',
      accessorKey: 'poNumber',
      cell: ({ row }: any) => (
        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          {row.original.poNumber}
        </span>
      )
    },
    {
      header: 'Supplier / Vendor',
      accessorKey: 'supplierName',
      cell: ({ row }: any) => (
        <span className="font-semibold text-foreground text-xs">
          {row.original.supplierName || 'General Supplier'}
        </span>
      )
    },
    {
      header: 'Items Count',
      id: 'itemsCount',
      cell: ({ row }: any) => {
        const count = row.original.items?.length || 0;
        return (
          <span className="text-xs text-muted-foreground">
            {count} product{count === 1 ? '' : 's'}
          </span>
        );
      }
    },
    {
      header: 'Order Date',
      accessorKey: 'purchaseDate',
      cell: ({ row }: any) => {
        const d = row.original.purchaseDate?.toDate 
          ? row.original.purchaseDate.toDate() 
          : (row.original.purchaseDate ? new Date(row.original.purchaseDate) : new Date());
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      }
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => {
        const s = row.original.status;
        return (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
            s === 'Completed'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              : s === 'Partially Received'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
              : s === 'Cancelled'
              ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
          }`}>
            {s || 'Ordered'}
          </span>
        );
      }
    },
    {
      header: 'Action',
      id: 'action',
      cell: () => (
        <button
          onClick={() => navigate('/purchases')}
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          View <ArrowRight className="h-3 w-3" />
        </button>
      )
    }
  ];

  return (
    <PageContainer>
      {/* Title & Live Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Dashboard
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Store Active
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time control center for inventory, tools, technician site dispatches & purchases.
          </p>
        </div>

        {/* Store Keeper Quick Status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/60">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* QUICK ACTIONS TOOLBAR */}
      <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground block">Quick Store Actions</span>
              <span className="text-[11px] text-muted-foreground">Fast 1-click workflows for daily operations</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Issue Materials */}
            <button
              onClick={() => navigate('/issue')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Issue materials to technicians"
            >
              <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
              Issue Materials
            </button>

            {/* 2. Return Materials */}
            <button
              onClick={() => navigate('/returns')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Process material returns from site"
            >
              <ArrowDownLeft className="h-3.5 w-3.5 stroke-[2.5]" />
              Return Materials
            </button>

            {/* 3. Issue Tools */}
            <button
              onClick={() => navigate('/tools/issue')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Assign equipment & tools to technician"
            >
              <Hammer className="h-3.5 w-3.5 stroke-[2.5]" />
              Issue Tools
            </button>

            {/* 4. Return Tools */}
            <button
              onClick={() => navigate('/tools/return')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Inspect and check in returned tools"
            >
              <RotateCcw className="h-3.5 w-3.5 stroke-[2.5]" />
              Return Tools
            </button>

            {/* 5. New Purchase */}
            <button
              onClick={() => navigate('/purchases/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Create new vendor purchase order"
            >
              <ShoppingCart className="h-3.5 w-3.5 stroke-[2.5]" />
              New Purchase
            </button>
          </div>
        </div>
      </div>

      {/* 4-METRIC RESPONSIVE STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Products */}
        <div 
          onClick={() => navigate('/products')}
          className="bg-card border border-border/70 rounded-xl p-4.5 shadow-xs hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Products Catalog</span>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {isLoading ? '...' : metrics.totalProducts}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">Active inventory items</span>
            {metrics.lowStock > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                {metrics.lowStock} Low Stock
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                In Stock
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Tools & Equipment */}
        <div 
          onClick={() => navigate('/tools')}
          className="bg-card border border-border/70 rounded-xl p-4.5 shadow-xs hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tools & Equipment</span>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wrench className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {isLoading ? '...' : metrics.totalTools}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">Units registered</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              {metrics.toolsInUse} on site / {metrics.toolsAvailable} store
            </span>
          </div>
        </div>

        {/* Card 3: Active Materials Dispatched */}
        <div 
          onClick={() => navigate('/transaction-log', { state: { filter: 'ISSUE' } })}
          className="bg-card border border-border/70 rounded-xl p-4.5 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Dispatches</span>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <RefreshCw className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {isLoading ? '...' : metrics.pendingReturns}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">Material vouchers pending</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Techs on site
            </span>
          </div>
        </div>

        {/* Card 4: Purchases & Orders */}
        <div 
          onClick={() => navigate('/purchases')}
          className="bg-card border border-border/70 rounded-xl p-4.5 shadow-xs hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchases & Orders</span>
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingCart className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {isLoading ? '...' : metrics.openPurchases}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">Active vendor orders</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {metrics.totalPurchases} Total POs
            </span>
          </div>
        </div>
      </div>

      {/* OPERATIONS & MOVEMENTS HUB (TABS) */}
      <div className="space-y-4 pt-2">
        {/* Hub Header with Tabs and Context Link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-2">
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            {/* Tab 1: Material Movements */}
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'materials'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              Material Movements
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === 'materials' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground'
              }`}>
                {recentMaterialMovements.length}
              </span>
            </button>

            {/* Tab 2: Tool Movements */}
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'tools'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              Tool Movements
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === 'tools' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
              }`}>
                {recentToolMovements.length}
              </span>
            </button>

            {/* Tab 3: Low Stock Alerts */}
            <button
              onClick={() => setActiveTab('low-stock')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'low-stock'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Low Stock Urgent
              {metrics.lowStock > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-white text-rose-600">
                  {metrics.lowStock}
                </span>
              )}
            </button>

            {/* Tab 4: Purchase Orders */}
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'purchases'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Recent Purchases
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === 'purchases' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
              }`}>
                {purchaseList.length}
              </span>
            </button>
          </div>

          {/* Contextual Jump Link */}
          <div>
            {activeTab === 'materials' && (
              <button 
                onClick={() => navigate('/transaction-log')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                Full Transaction Log <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {activeTab === 'tools' && (
              <button 
                onClick={() => navigate('/tools')}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Manage All Tools <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {activeTab === 'low-stock' && (
              <button 
                onClick={() => navigate('/products')}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                All Products Catalog <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {activeTab === 'purchases' && (
              <button 
                onClick={() => navigate('/purchases')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                All Purchase Orders <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab 1 Content: Material Movements */}
        {activeTab === 'materials' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMaterialFilter('ALL')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer ${
                    materialFilter === 'ALL' ? 'bg-secondary text-secondary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All ({recentMaterialMovements.length})
                </button>
                <button
                  onClick={() => setMaterialFilter('ISSUE')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer ${
                    materialFilter === 'ISSUE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Issues Only
                </button>
                <button
                  onClick={() => setMaterialFilter('RETURN')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer ${
                    materialFilter === 'RETURN' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Returns Only
                </button>
              </div>

              <span className="text-[11px] text-muted-foreground">
                Showing latest dispatches & returns
              </span>
            </div>

            <AppTable
              columns={materialColumns}
              data={filteredMaterials}
              isLoading={isLoading}
              emptyTitle="No material movements recorded"
              emptyDescription="Start by issuing materials to technicians using the action button above."
              hidePagination={true}
            />
          </div>
        )}

        {/* Tab 2 Content: Tool Movements */}
        {activeTab === 'tools' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setToolFilter('ALL')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer ${
                    toolFilter === 'ALL' ? 'bg-secondary text-secondary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All ({recentToolMovements.length})
                </button>
                <button
                  onClick={() => setToolFilter('ISSUE')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer ${
                    toolFilter === 'ISSUE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Checkouts (Issues)
                </button>
                <button
                  onClick={() => setToolFilter('RETURN')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer ${
                    toolFilter === 'RETURN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-semibold' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Check-ins (Returns)
                </button>
              </div>

              <span className="text-[11px] text-muted-foreground">
                Live equipment tracking across job sites
              </span>
            </div>

            <AppTable
              columns={toolColumns}
              data={filteredTools}
              isLoading={isLoading}
              emptyTitle="No tool movements yet"
              emptyDescription="Issue equipment or testing instruments to track field assignments."
              hidePagination={true}
            />
          </div>
        )}

        {/* Tab 3 Content: Urgent Low Stock */}
        {activeTab === 'low-stock' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                  {lowStockItems.length} items currently below minimum stock threshold
                </span>
              </div>
              <button
                onClick={() => navigate('/purchases/new')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                + Create Consolidated PO <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <AppTable
              columns={lowStockColumns}
              data={lowStockItems}
              isLoading={isLoading}
              emptyTitle="Stock is Healthy!"
              emptyDescription="All products are currently stocked at or above minimum threshold levels."
              hidePagination={true}
            />
          </div>
        )}

        {/* Tab 4 Content: Purchase Orders */}
        {activeTab === 'purchases' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing latest purchase orders with suppliers
              </span>
              <button
                onClick={() => navigate('/purchases/new')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                + New Purchase Order <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <AppTable
              columns={purchaseColumns}
              data={recentPurchases}
              isLoading={isLoading}
              emptyTitle="No purchase orders created"
              emptyDescription="Create purchase orders to restock supplies and track vendor deliveries."
              hidePagination={true}
            />
          </div>
        )}
      </div>
    </PageContainer>
  )
}
