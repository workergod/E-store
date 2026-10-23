import React from 'react'
import { AppDialog } from './AppDialog'
import type { ShortcutItem } from '../hooks/useKeyboardShortcuts'
import { ArrowDown, ArrowUp, Command, Search, HelpCircle, Navigation } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
  navItems: ShortcutItem[]
}

export function KeyboardShortcutsModal({ isOpen, onClose, navItems }: KeyboardShortcutsModalProps) {
  return (
    <AppDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Keyboard Navigation Shortcuts"
      description="Navigate quickly across Cryodeal using your top number row (no NumLock required) or access keys."
      className="max-w-xl"
    >
      <div className="space-y-6 text-sm">
        {/* Top-row Navigation section */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Navigation className="h-3.5 w-3.5 text-primary" />
            <span>Primary Pages (Press 1–7 or Alt+1–7)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {navItems.map((item) => (
              <div 
                key={item.key} 
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-[11px] text-muted-foreground">{item.description}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <kbd className="px-2 py-1 text-xs font-mono font-bold rounded border border-border bg-card shadow-sm text-primary">
                    {item.key}
                  </kbd>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow Navigation */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
            <span>Move Up & Down (Dashboard to Transaction Log)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/30">
              <span className="text-foreground">Next sidebar page</span>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Alt</kbd>
                <span className="text-xs text-muted-foreground">+</span>
                <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">↓</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/30">
              <span className="text-foreground">Previous sidebar page</span>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Alt</kbd>
                <span className="text-xs text-muted-foreground">+</span>
                <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">↑</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/30">
              <span className="text-foreground">Jump to top (Dashboard)</span>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Alt</kbd>
                <span className="text-xs text-muted-foreground">+</span>
                <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Home</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/30">
              <span className="text-foreground">Jump to Transaction Log</span>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Alt</kbd>
                <span className="text-xs text-muted-foreground">+</span>
                <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">End</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Global Shortcuts */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Command className="h-3.5 w-3.5 text-primary" />
            <span>General Utilities</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground">Focus Search bar</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Ctrl</kbd>
                <span className="text-xs text-muted-foreground">+</span>
                <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">K</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground">Toggle shortcuts guide</span>
              </div>
              <kbd className="px-2 py-0.5 text-xs font-mono rounded border border-border bg-card">?</kbd>
            </div>
          </div>
        </div>

        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs text-muted-foreground flex items-center justify-between">
          <span>Tip: Top-row number shortcuts work directly when you are not typing in a text field.</span>
          <button
            onClick={onClose}
            className="text-xs font-medium text-primary hover:underline ml-2"
          >
            Got it
          </button>
        </div>
      </div>
    </AppDialog>
  )
}
