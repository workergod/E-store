import React, { useState } from 'react'
import { Bell, Search, Sun, Moon, LogOut, MessageSquare } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useAuthStore } from "../../store/authStore"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
    if (!isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="flex h-screen bg-background font-sans antialiased overflow-hidden text-foreground selection:bg-primary/20">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-[72px] bg-background/80 backdrop-blur-md border-b border-border flex items-center px-8 justify-between sticky top-0 z-10 shrink-0">
          
          <div className="flex-1 flex items-center max-w-xl">
            <div className="relative w-full flex items-center group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search products, SKU, Barcode..." 
                className="w-full h-[52px] bg-muted/50 border border-transparent focus:bg-card focus:border-border pl-[44px] pr-4 rounded-[var(--radius-input)] text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 shadow-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
                <kbd className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-[var(--spacing-xl)] ml-auto shrink-0 pl-8">
            <div className="flex items-center gap-2">
              <button className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border border-background"></span>
              </button>
              <button className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <MessageSquare className="h-5 w-5" />
              </button>
              <button onClick={toggleTheme} className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
            
            <div className="h-8 w-px bg-border hidden sm:block"></div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end justify-center">
                <span className="text-[14px] font-semibold leading-none">{user?.fullName || 'Administrator'}</span>
                <span className="text-[12px] text-muted-foreground mt-1.5 leading-none">{user?.role || 'System Admin'}</span>
              </div>
              <div className="group relative">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm ring-2 ring-transparent transition-all cursor-pointer hover:ring-primary/20 border border-primary/20">
                  {user?.fullName?.charAt(0) || 'A'}
                </div>
                {/* Minimal dropdown placeholder */}
                <div className="absolute right-0 top-full mt-2 w-48 rounded-[var(--radius)] bg-popover p-2 shadow-premium border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all origin-top-right">
                  <button onClick={() => logout()} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-[var(--radius-btn)] transition-colors">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
