import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, PackageSearch, ShoppingCart, Settings, Users, 
  BarChart, 
  ChevronLeft, ChevronRight, HelpCircle,
  ArrowUpRight, ArrowDownLeft, ShoppingBag, ClipboardList
  } from 'lucide-react'
import { cn } from "../utils/cn"
import { useAuthStore } from "../../store/authStore"

const MAIN_NAV = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
]

const INVENTORY_NAV = [
  { path: '/products', label: 'Products', icon: PackageSearch },
  { path: '/issue', label: 'Issue Materials', icon: ArrowUpRight },
  { path: '/returns', label: 'Return Materials', icon: ArrowDownLeft },
]

const PURCHASING_NAV = [
  { path: '/purchases', label: 'Purchasing', icon: ShoppingCart },
]


const OPERATIONS_NAV = [
  { path: '/employees', label: 'Employees', icon: Users },
  { path: '/reports', label: 'Analytics', icon: BarChart },
  { path: '/transaction-log', label: 'Transaction Log', icon: ClipboardList },
]

const NavItem = ({ item, collapsed, pathname }: { item: { path: string, label: string, icon: any }, collapsed: boolean, pathname: string }) => {
  const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
  const Icon = item.icon
  
  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-[var(--radius-btn)] text-[14px] font-medium transition-colors group",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (val: boolean) => void }) {
  const location = useLocation()
  const { company } = useAuthStore()

  return (
    <aside 
      className={cn(
        "relative flex flex-col h-full bg-card border-r border-border shadow-floating transition-all duration-300 z-20 shrink-0",
        collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      <div className="h-[72px] flex items-center px-6 border-b border-border/50 shrink-0">
        <div className={cn("flex items-center gap-3 overflow-hidden transition-all", collapsed ? "w-8" : "w-full")}>
          <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden shadow-sm flex items-center justify-center bg-white">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <span className="font-bold tracking-tight text-foreground truncate text-lg">
              {company?.companyName || 'E Store Pro'}
            </span>
          )}
        </div>
      </div>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[80px] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted text-muted-foreground transition-colors z-30"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 custom-scrollbar flex flex-col gap-[var(--spacing-3xl)]">
        
        <div className="px-4">
          <div className="space-y-[var(--spacing-xs)]">
            {MAIN_NAV.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} pathname={location.pathname} />)}
          </div>
        </div>

        <div className="px-4">
          {!collapsed && <h4 className="px-3 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inventory</h4>}
          <div className="space-y-[var(--spacing-xs)]">
            {INVENTORY_NAV.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} pathname={location.pathname} />)}
          </div>
        </div>

        <div className="px-4">
          {!collapsed && <h4 className="px-3 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchasing</h4>}
          <div className="space-y-[var(--spacing-xs)]">
            {PURCHASING_NAV.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} pathname={location.pathname} />)}
          </div>
        </div>


        <div className="px-4">
          {!collapsed && <h4 className="px-3 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operations</h4>}
          <div className="space-y-[var(--spacing-xs)]">
            {OPERATIONS_NAV.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} pathname={location.pathname} />)}
          </div>
        </div>

      </div>

      <div className="p-4 mt-auto border-t border-border/50">
        <div className="space-y-[var(--spacing-xs)]">
          <NavItem item={{ path: '/settings', label: 'Settings', icon: Settings }} collapsed={collapsed} pathname={location.pathname} />
          <NavItem item={{ path: '/help', label: 'Help', icon: HelpCircle }} collapsed={collapsed} pathname={location.pathname} />
        </div>
        {!collapsed && (
          <div className="mt-4 p-4 rounded-[var(--radius)] bg-muted/50 border border-border/50">
            <h4 className="font-semibold text-sm mb-1">E Store Pro</h4>
            <p className="text-xs text-muted-foreground">Version 0.4.0 (Beta)</p>
          </div>
        )}
      </div>
    </aside>
  )
}
