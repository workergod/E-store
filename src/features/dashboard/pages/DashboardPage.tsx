import { useState, useEffect } from 'react'
import { PageContainer } from '../../../shared/layouts/PageContainer'
import { PageHeader } from '../../../shared/layouts/PageHeader'
import { MetricCard } from '../../../shared/widgets/MetricWidget'
import { ChartCard } from '../../../shared/widgets/ChartWidget'
import { AppTable } from '../../../shared/tables/AppTable'
import { Package, AlertCircle, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

import { useAuthStore } from "../../../store/authStore"
import { productRepository } from '../../../repositories/ProductRepository'
import { issueRepository } from '../../../repositories/IssueRepository'

export default function DashboardPage() {
  const { company } = useAuthStore()
  const companyId = company?.companyId

  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    lowStock: 0,
    pendingReturns: 0,
  })
  
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    if (!companyId) return
    const loadDashboard = async () => {
      try {
        setIsLoading(true)
        const [products, issues] = await Promise.all([
          productRepository.getAll(companyId),
          issueRepository.getAll(companyId),
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
        const activeIssues = issues.filter(i => i.status === 'ISSUED');
        const recent = activeIssues.slice(0, 5).map(i => ({
          id: i.id,
          action: 'Issued',
          item: i.items.map(it => it.productName).join(', '),
          date: new Date((i.createdAt as any)?.toDate ? (i.createdAt as any).toDate() : (i.issueDate ? new Date(i.issueDate) : new Date())).toLocaleDateString(),
          user: i.employeeId
        }))
        setRecentActivity(recent)

      } catch (error) {
        console.error("Dashboard error", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadDashboard()
  }, [companyId])

  const mockChartData = [
    { name: 'Mon', sales: 4000, purchases: 2400 },
    { name: 'Tue', sales: 3000, purchases: 1398 },
    { name: 'Wed', sales: 2000, purchases: 9800 },
    { name: 'Thu', sales: 2780, purchases: 3908 },
    { name: 'Fri', sales: 1890, purchases: 4800 },
    { name: 'Sat', sales: 2390, purchases: 3800 },
    { name: 'Sun', sales: 3490, purchases: 4300 },
  ]

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-3xl)] mt-8">
        <div className="lg:col-span-2">
          <ChartCard title="Movement Overview" subtitle="Stock in vs Stock out for the past week" height={350}>
            <BarChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
              <Tooltip 
                cursor={{ fill: 'var(--muted)' }}
                contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-floating)' }}
              />
              <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="purchases" fill="var(--muted-foreground)" opacity={0.3} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>
        
        <div className="lg:col-span-1">
          <div className="mb-4">
            <h3 className="text-card-title">Recent Issues</h3>
            <p className="text-caption text-muted-foreground mt-1">Latest materials issued to techs.</p>
          </div>
          <AppTable 
            columns={recentActivityCols} 
            data={recentActivity} 
            isLoading={isLoading}
            emptyTitle="No activity yet"
          />
        </div>
      </div>
    </PageContainer>
  )
}
