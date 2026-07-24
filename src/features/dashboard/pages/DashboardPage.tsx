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

export default function DashboardPage() {
  const { company } = useAuthStore()
  const companyId = company?.companyId
  const navigate = useNavigate()

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
        const [products, issues, returnSnap] = await Promise.all([
          productRepository.getAll(companyId),
          issueRepository.getAll(companyId),
          getDocs(query(collection(db, 'returnTransactions'), where('companyId', '==', companyId)))
        ])

        const totalProducts = products.length
        const lowStock = products.filter(p => (p.currentStock || 0) <= (p.minimumStock || 0)).length
        const pendingReturns = issues.filter(i => i.status === 'PARTIALLY_RETURNED' || i.status === 'ISSUED').length

        setMetrics({
          totalProducts,
          lowStock,
          pendingReturns
        })

        // In a real app, we would query the stockLedgerRepository directly with limit(5).
        // Since we don't have a getRecent() method yet, we'll leave the table empty for now 
        // or just show a message. Let's populate it with issues as activity.
        // Only show recent active issues
        const activeIssues = issues.filter(i => i.status === 'ISSUED' || i.status === 'PARTIALLY_RETURNED');
        const recent = activeIssues.slice(0, 5).map(i => ({
          id: i.id,
          action: 'Issued',
          item: i.items.map(it => it.productName).join(', '),
          date: new Date((i.createdAt as any)?.toDate ? (i.createdAt as any).toDate() : (i.issueDate ? new Date(i.issueDate) : new Date())).toLocaleDateString(),
          user: i.employeeId
        }))
        setRecentActivity(recent)

        // Show recent returns from returnTransactions
        const returnsData = returnSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const recentReturnsList = returnsData.sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tb - ta;
        }).slice(0, 5).map(r => ({
          id: r.id,
          action: 'Returned',
          item: (r.items || []).map((it:any) => it.productName).join(', '),
          date: new Date(r.createdAt?.toDate ? r.createdAt.toDate() : new Date()).toLocaleDateString(),
          user: r.employeeId
        }))
        setRecentReturns(recentReturnsList)

      } catch (error) {
        console.error("Dashboard error", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadDashboard()
  }, [companyId])


  const recentActivityCols = [
    { header: 'Action', accessorKey: 'action' },
    { header: 'Item', accessorKey: 'item', cell: ({row}: any) => <span className="truncate max-w-[120px] block">{row.original.item}</span> },
    { header: 'Date', accessorKey: 'date' },
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
        />
        <MetricCard 
          title="Active Issues" 
          value={isLoading ? "..." : metrics.pendingReturns.toString()} 
          icon={<RefreshCw className={`h-5 w-5 ${metrics.pendingReturns > 0 ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground'}`} />} 
          description="Pending returns"
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
            columns={recentActivityCols} 
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
            columns={recentActivityCols} 
            data={recentReturns} 
            isLoading={isLoading}
            emptyTitle="No returns yet"
          />
        </div>
      </div>
    </PageContainer>
  )
}
