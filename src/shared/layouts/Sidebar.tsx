import { useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, PackageSearch, ShoppingCart, Settings, Users, 
  BarChart, 
  HelpCircle, MessageCircle,
  ArrowUpRight, ArrowDownLeft, ShoppingBag, ClipboardList,
  PanelLeft, Wrench
} from 'lucide-react'
import { cn } from "../utils/cn"
import { useAuthStore } from "../../store/authStore"
import { SupervisorLoginModal } from '../../features/supervisor/components/SupervisorLoginModal'
import { Role } from '../../constants/roles'

interface NavItemDef {
  path: string
  label: string
  icon: any
}

const MAIN_NAV: NavItemDef[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
]

const INVENTORY_NAV: NavItemDef[] = [
  { path: '/products', label: 'Products', icon: PackageSearch },
  { path: '/issue', label: 'Issue Materials', icon: ArrowUpRight },
  { path: '/returns', label: 'Return Materials', icon: ArrowDownLeft },
]

const TOOLS_NAV: NavItemDef[] = [
  { path: '/tools', label: 'Tools', icon: Wrench },
  { path: '/tools/issue', label: 'Issue Tools', icon: ArrowUpRight },
  { path: '/tools/return', label: 'Return Tools', icon: ArrowDownLeft },
]

const PURCHASING_NAV: NavItemDef[] = [
  { path: '/purchases', label: 'Purchasing', icon: ShoppingCart },
]

const OPERATIONS_NAV: NavItemDef[] = [
  { path: '/employees', label: 'Employees', icon: Users },
  { path: '/transaction-log', label: 'Transaction Log', icon: ClipboardList },
]

const NavItem = ({ item, collapsed, pathname }: { item: NavItemDef, collapsed: boolean, pathname: string }) => {
  const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
  const Icon = item.icon
  
  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-btn)] text-[14px] font-medium transition-all duration-150 group relative select-none",
        isActive 
          ? "text-primary font-semibold" 
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      {/* Animated active background that smoothly glides between items */}
      {isActive && (
        <motion.div
          layoutId="sidebarActiveBackground"
          className="absolute inset-0 rounded-[var(--radius-btn)] bg-primary/12 border border-primary/20 shadow-xs z-0"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      )}

      {/* Animated active vertical accent bar on the left edge */}
      {isActive && (
        <motion.div
          layoutId="sidebarActiveIndicator"
          className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary z-20 shadow-[0_0_8px_rgba(37,99,235,0.4)]"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      )}

      <div className={cn(
        "flex items-center justify-center transition-colors relative z-10 shrink-0",
        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
      )}>
        <Icon className="h-5 w-5" />
      </div>

      {!collapsed && (
        <span className="truncate relative z-10 tracking-tight">
          {item.label}
        </span>
      )}
    </Link>
  )
}

export function Sidebar({ 
  collapsed, 
  setCollapsed
}: { 
  collapsed: boolean
  setCollapsed: (val: boolean) => void
  onOpenShortcuts?: () => void
}) {
  const location = useLocation()
  const { company, user } = useAuthStore()

  const [clickCount, setClickCount] = useState(0)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [showSupervisorModal, setShowSupervisorModal] = useState(false)

  const handleCompanyNameClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }
    
    const newCount = clickCount + 1
    setClickCount(newCount)
    
    if (newCount >= 7) {
      setClickCount(0)
      setShowSupervisorModal(true)
    } else {
      clickTimerRef.current = setTimeout(() => {
        setClickCount(0)
      }, 1500) // Reset if 1.5 seconds pass without a click
    }
  }

  return (
    <aside 
      className={cn(
        "relative flex flex-col h-full bg-card border-r border-border shadow-floating transition-all duration-300 z-20 shrink-0",
        collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      <div className="h-[72px] flex items-center px-6 border-b border-border/50 shrink-0">
        <div className={cn("flex items-center gap-3 overflow-hidden transition-all", collapsed ? "w-8" : "w-full")}>
          <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden shadow-sm flex items-center justify-center bg-white cursor-pointer" onClick={handleCompanyNameClick}>
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <span className="font-bold tracking-tight text-foreground truncate text-lg cursor-pointer select-none" onClick={handleCompanyNameClick}>
              {company?.companyName || 'Cryodeal'}
            </span>
          )}
        </div>
      </div>

      <button 
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-[76px] flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-30 cursor-pointer"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 custom-scrollbar flex flex-col gap-[var(--spacing-3xl)]">
        
        {/* MAIN NAV (Dashboard) */}
        {user?.role !== Role.TECHNICIAN && (
          <div className="px-4">
            <div className="space-y-[var(--spacing-xs)]">
              {MAIN_NAV.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} pathname={location.pathname} />)}
            </div>
          </div>
        )}

        {/* INVENTORY NAV */}
        <div className="px-4">
          {!collapsed && <h4 className="px-3 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{user?.role === Role.TECHNICIAN ? 'My Items' : 'Inventory'}</h4>}
          <div className="space-y-[var(--spacing-xs)]">
            {user?.role === Role.TECHNICIAN ? (
              <NavItem item={{ path: '/my-materials', label: 'My Materials', icon: PackageSearch }} collapsed={collapsed} pathname={location.pathname} />
            ) : (
              INVENTORY_NAV.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} pathname={location.pathname} />)
            )}
          </div>
        </div>

        {/* TOOLS & EQUIPMENT NAV */}
        {user?.role !== Role.TECHNICIAN && (
          <div className="px-4">
            {!collapsed && <h4 className="px-3 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tools</h4>}
            <div className="space-y-[var(--spacing-xs)]">
              {TOOLS_NAV.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} pathname={location.pathname} />)}
            </div>
          </div>
        )}

        {/* PURCHASING NAV */}
        {user?.role !== Role.TECHNICIAN && user?.role !== Role.STORE_KEEPER && (
          <div className="px-4">
            {!collapsed && <h4 className="px-3 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchasing</h4>}
            <div className="space-y-[var(--spacing-xs)]">
              {PURCHASING_NAV.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} pathname={location.pathname} />)}
            </div>
          </div>
        )}

        {/* OPERATIONS NAV */}
        {user?.role !== Role.TECHNICIAN && (
          <div className="px-4">
            {!collapsed && <h4 className="px-3 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operations</h4>}
            <div className="space-y-[var(--spacing-xs)]">
              {OPERATIONS_NAV.filter(item => {
                // Store Keeper has access to Transaction Log, but not Employee roster management
                if (user?.role === Role.STORE_KEEPER && item.path === '/employees') return false;
                return true;
              }).map(item => <NavItem key={item.path} item={item} collapsed={collapsed} pathname={location.pathname} />)}
            </div>
          </div>
        )}


      </div>

      <div className="p-4 mt-auto border-t border-border/50">
        <div className="space-y-[var(--spacing-xs)]">
          {user?.role === Role.SUPER_ADMIN && (
            <NavItem item={{ path: '/developer/chat', label: 'Dev Support Chats', icon: MessageCircle }} collapsed={collapsed} pathname={location.pathname} />
          )}
          {user?.role !== Role.TECHNICIAN && user?.role !== Role.STORE_KEEPER && (
            <NavItem item={{ path: '/settings', label: 'Settings', icon: Settings }} collapsed={collapsed} pathname={location.pathname} />
          )}
          <NavItem item={{ path: '/help', label: 'Help & Support', icon: HelpCircle }} collapsed={collapsed} pathname={location.pathname} />
          {user?.role !== Role.SUPER_ADMIN && (
            <NavItem item={{ path: '/support-chat', label: 'Contact Developer', icon: MessageCircle }} collapsed={collapsed} pathname={location.pathname} />
          )}
        </div>
        {!collapsed && (
          <div className="mt-4 p-4 rounded-[var(--radius)] bg-muted/50 border border-border/50">
            <h4 className="font-semibold text-sm mb-1">Cryodeal</h4>
            <p className="text-xs text-muted-foreground">Version 0.4.0 (Beta)</p>
          </div>
        )}
      </div>

      {showSupervisorModal && (
        <SupervisorLoginModal onClose={() => setShowSupervisorModal(false)} />
      )}
    </aside>
  )
}
