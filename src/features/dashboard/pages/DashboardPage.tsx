import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../firebase/firestore'
import { PageContainer } from '../../../shared/layouts/PageContainer'
import { PageHeader } from '../../../shared/layouts/PageHeader'
import { MetricCard } from '../../../shared/widgets/MetricWidget'
import { ChartCard } from '../../../shared/widgets/ChartWidget'
import { AppTable } from '../../../shared/tables/AppTable'
import { Package, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react'

import { useAuthStore } from "../../../store/authStore"
import { productRepository } from '../../../repositories/ProductRepository'
import { issueRepository } from '../../../repositories/IssueRepository'
import { employeeRepository } from '../../../repositories/EmployeeRepository'

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
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    lowStock: 0,
    pendingReturns: 0,
  })
  
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [recentReturns, setRecentReturns] = useState<any[]>([])

  useEffect(() => {
    if (!companyId) return
    const loadDashboard = async () => {
      try {
        setIsLoading(true)
        const [products, issues, returnSnap, employees] = await Promise.all([
          productRepository.getAll(companyId),
          issueRepository.getAll(companyId),
          getDocs(query(collection(db, 'returnTransactions'), where('companyId', '==', companyId))),
          employeeRepository.getAll(companyId)
        ])

        const totalProducts = products.length
        const lowStock = products.filter(p => (p.currentStock || 0) <= (p.minimumStock || 0)).length
        const pendingReturns = issues.filter(i => i.status === 'PARTIALLY_RETURNED' || i.status === 'ISSUED').length

        setMetrics({
          totalProducts,
          lowStock,
          pendingReturns
        })

        // Build employee ID -> name map
        const empMap: Record<string, string> = {}
        employees.forEach(e => {
          if (e.id) {
            empMap[e.id] = `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.username || 'Technician'
          }
        })

        // Recent Issues sorted newest first
        const sortedIssues = [...issues].sort((a, b) => {
          const ta = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : (a.issueDate ? new Date(a.issueDate).getTime() : 0);
          const tb = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : (b.issueDate ? new Date(b.issueDate).getTime() : 0);
          return tb - ta;
        });

        const recent = sortedIssues.slice(0, 5).map(i => {
          const d = (i.createdAt as any)?.toDate ? (i.createdAt as any).toDate() : (i.issueDate ? new Date(i.issueDate) : new Date());
          const dateFormatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const timeFormatted = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          const techName = i.employeeName || empMap[i.employeeId] || i.employeeId || 'Technician';
          const itemsText = (i.items || []).map(it => `${it.productName} (${it.issuedQty} ${it.unit || ''})`).join(', ');

          return {
            id: i.id,
            issueNumber: i.issueNumber || 'CRYO-1',
            technician: techName,
            siteName: i.siteName || '',
            item: itemsText || 'No items',
            date: `${dateFormatted}, ${timeFormatted}`,
            status: i.status || 'ISSUED'
          };
        });
        setRecentActivity(recent)

        // Recent Returns from returnTransactions
        const returnsData = returnSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const recentReturnsList = returnsData.sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tb - ta;
        }).slice(0, 5).map(r => {
          const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date();
          const dateFormatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const timeFormatted = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          const techName = r.employeeName || empMap[r.employeeId] || r.employeeId || 'Technician';
          const itemsText = (r.items || []).map((it: any) => `${it.productName} (${it.returnedQty} ${it.unit || ''})`).join(', ');
          const returnRef = r.isDirectReturn 
            ? (r.directReturnNumber || 'CRYO(W/O)-1') 
            : (r.issueNumber ? r.issueNumber : 'Return');

          return {
            id: r.id,
            returnRef,
            isDirectReturn: Boolean(r.isDirectReturn),
            technician: techName,
            siteName: r.siteName || '',
            item: itemsText || 'No items',
            date: `${dateFormatted}, ${timeFormatted}`,
            status: r.isDirectReturn ? 'DIRECT RETURN' : 'RETURN'
          };
        });
        setRecentReturns(recentReturnsList)

      } catch (error) {
        console.error("Dashboard error", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadDashboard()
  }, [companyId])

  const recentIssuesCols = [
    { 
      header: 'Issue ID', 
      accessorKey: 'issueNumber',
      cell: ({ row }: any) => (
        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {row.original.issueNumber}
        </span>
      )
    },
    { 
      header: 'Technician', 
      accessorKey: 'technician',
      cell: ({ row }: any) => (
        <div>
          <span className="font-medium text-foreground">{row.original.technician}</span>
          {row.original.siteName && (
            <div className="text-[10px] text-muted-foreground font-semibold">
              Site: {row.original.siteName}
            </div>
          )}
        </div>
      )
    },
    { 
      header: 'Items', 
      accessorKey: 'item', 
      cell: ({ row }: any) => (
        <span className="truncate max-w-[280px] block text-xs text-muted-foreground" title={row.original.item}>
          {row.original.item}
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
      cell: ({ row }: any) => (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          row.original.status === 'CLOSED'
            ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
            : row.original.status === 'PARTIALLY_RETURNED'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        }`}>
          {row.original.status}
        </span>
      )
    }
  ]

  const recentReturnsCols = [
    { 
      header: 'Return / Issue ID', 
      accessorKey: 'returnRef',
      cell: ({ row }: any) => (
        <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded border ${
          row.original.isDirectReturn
            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        }`}>
          {row.original.returnRef}
        </span>
      )
    },
    { 
      header: 'Technician', 
      accessorKey: 'technician',
      cell: ({ row }: any) => (
        <div>
          <span className="font-medium text-foreground">{row.original.technician}</span>
          {row.original.siteName && (
            <div className="text-[10px] text-muted-foreground font-semibold">
              Site: {row.original.siteName}
            </div>
          )}
        </div>
      )
    },
    { 
      header: 'Items Returned', 
      accessorKey: 'item', 
      cell: ({ row }: any) => (
        <span className="truncate max-w-[280px] block text-xs text-muted-foreground" title={row.original.item}>
          {row.original.item}
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
      header: 'Type', 
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          row.original.isDirectReturn
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        }`}>
          {row.original.status}
        </span>
      )
    }
  ]

  return (
    <PageContainer>
      <PageHeader 
        title="Dashboard" 
        description="Overview of your inventory and operations."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-3xl)]">
        <MetricCard 
          title="Total Products" 
          value={isLoading ? "..." : metrics.totalProducts.toString()} 
          icon={<Package className="h-5 w-5" />} 
          description="Active catalog items"
        />
        <MetricCard 
          title="Low Stock Alerts" 
          value={isLoading ? "..." : metrics.lowStock.toString()} 
          icon={<AlertCircle className={`h-5 w-5 ${metrics.lowStock > 0 ? 'text-[hsl(var(--destructive))]' : 'text-muted-foreground'}`} />} 
          description="Needs attention"
          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
          onClick={() => navigate('/products', { state: { filter: 'low-stock' }})}
        />
        <MetricCard 
          title="Active Issues" 
          value={isLoading ? "..." : metrics.pendingReturns.toString()} 
          icon={<RefreshCw className={`h-5 w-5 ${metrics.pendingReturns > 0 ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground'}`} />} 
          description="Pending returns"
          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
          onClick={() => navigate('/transaction-log', { state: { filter: 'ISSUE' }})}
        />
      </div>

      <div className="space-y-8 mt-8">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-card-title">Recent Issues</h3>
              <p className="text-caption text-muted-foreground mt-1">Latest materials issued to techs.</p>
            </div>
            <button onClick={() => navigate('/transaction-log', { state: { filter: 'ISSUE' }})} className="text-sm font-medium text-primary hover:underline flex items-center">
              See All Issues <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <AppTable 
            columns={recentIssuesCols} 
            data={recentActivity} 
            isLoading={isLoading}
            emptyTitle="No activity yet"
          />
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-card-title">Recent Returns</h3>
              <p className="text-caption text-muted-foreground mt-1">Latest materials returned from techs.</p>
            </div>
            <button onClick={() => navigate('/transaction-log', { state: { filter: 'RETURN' }})} className="text-sm font-medium text-primary hover:underline flex items-center">
              See All Returns <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <AppTable 
            columns={recentReturnsCols} 
            data={recentReturns} 
            isLoading={isLoading}
            emptyTitle="No returns yet"
          />
        </div>
      </div>
    </PageContainer>
  )
}
