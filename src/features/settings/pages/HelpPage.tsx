import { useState } from 'react';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy, BookOpen, Mail, MessageCircle, FileText, Keyboard, ArrowDown, ArrowUp, Command, Search, Navigation } from 'lucide-react';
import { KeyboardShortcutsModal } from '../../../shared/overlays/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from '../../../shared/hooks/useKeyboardShortcuts';

export default function HelpPage() {
  const navigate = useNavigate();
  const { navItems, showShortcutsModal, openShortcutsModal, closeShortcutsModal } = useKeyboardShortcuts();

  return (
    <PageContainer>
      <PageHeader 
        title="Help & Support" 
        description="Find answers to your questions, master keyboard shortcuts, and get in touch with our team." 
      />

      {/* Top 4 Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        
        {/* Knowledge Base */}
        <div onClick={() => navigate('/knowledge-base')} className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-start transition-all hover:shadow-md cursor-pointer group">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Knowledge Base</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Browse our detailed guides, tutorials, and step-by-step articles to master the Cryodeal platform.
          </p>
          <span className="text-primary text-sm font-medium mt-auto flex items-center">
            Read Articles &rarr;
          </span>
        </div>

        {/* Keyboard Shortcuts */}
        <div onClick={openShortcutsModal} className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-start transition-all hover:shadow-md cursor-pointer group">
          <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:bg-purple-500/20 transition-colors">
            <Keyboard className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Shortcuts Guide</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Navigate instantly from Dashboard to Transaction Log using top-row numbers (1–7) without NumLock.
          </p>
          <span className="text-purple-600 dark:text-purple-400 text-sm font-medium mt-auto flex items-center">
            Open Shortcuts &rarr;
          </span>
        </div>

        {/* Video Tutorials */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-start transition-all hover:shadow-md cursor-pointer group">
          <div className="h-12 w-12 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center text-[hsl(var(--success))] mb-4 group-hover:bg-[hsl(var(--success))]/20 transition-colors">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Video Tutorials</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Watch quick video lessons covering everything from inventory adjustments to employee management.
          </p>
          <span className="text-[hsl(var(--success))] text-sm font-medium mt-auto flex items-center">
            Watch Videos &rarr;
          </span>
        </div>

        {/* Contact Support */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-start transition-all hover:shadow-md cursor-pointer group">
          <div className="h-12 w-12 rounded-lg bg-[hsl(var(--destructive))]/10 flex items-center justify-center text-[hsl(var(--destructive))] mb-4 group-hover:bg-[hsl(var(--destructive))]/20 transition-colors">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Contact Support</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Need direct assistance? Our dedicated technical team is available 24/7 to resolve your issues.
          </p>
          <div className="flex flex-col gap-2 w-full mt-auto">
            <a href="mailto:edgaredgefx@gmail.com" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <Mail className="h-4 w-4 mr-2" /> edgaredgefx@gmail.com
            </a>
            <span onClick={() => navigate('/support-chat')} className="flex items-center text-sm text-primary font-medium hover:underline cursor-pointer">
              <MessageCircle className="h-4 w-4 mr-2" /> Live Chat Available
            </span>
          </div>
        </div>

      </div>

      {/* Full Keyboard Shortcuts Reference Section */}
      <div className="mt-12 bg-card border border-border rounded-xl p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold tracking-tight text-foreground">Keyboard Navigation Shortcuts</h3>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Move effortlessly across Cryodeal using your top number row (no NumLock required) or access keys.
            </p>
          </div>
          <button
            onClick={openShortcutsModal}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 self-start sm:self-auto cursor-pointer"
          >
            Launch Interactive Cheat Sheet
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          
          {/* Column 1: Direct Number Row */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Navigation className="h-3.5 w-3.5 text-primary" />
              <span>Direct Numbers (Top Row 1–7)</span>
            </div>
            <div className="space-y-2">
              {navItems.map((item) => (
                <div 
                  key={item.key} 
                  onClick={() => navigate(item.path)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/60 transition-colors cursor-pointer group"
                >
                  <div>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{item.label}</span>
                    <p className="text-[11px] text-muted-foreground">{item.description}</p>
                  </div>
                  <kbd className="px-2 py-1 text-xs font-mono font-bold rounded border border-border bg-card shadow-xs text-primary shrink-0 ml-2">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Traversal & Arrow Keys */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <ArrowDown className="h-3.5 w-3.5 text-primary" />
              <span>Move Up & Down the Sidebar</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-muted/20">
                <div>
                  <span className="text-sm font-medium text-foreground">Next Page Down</span>
                  <p className="text-[11px] text-muted-foreground">Move towards Transaction Log</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Alt</kbd>
                  <span className="text-xs text-muted-foreground">+</span>
                  <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">↓</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-muted/20">
                <div>
                  <span className="text-sm font-medium text-foreground">Previous Page Up</span>
                  <p className="text-[11px] text-muted-foreground">Move towards Dashboard</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Alt</kbd>
                  <span className="text-xs text-muted-foreground">+</span>
                  <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">↑</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-muted/20">
                <div>
                  <span className="text-sm font-medium text-foreground">Jump to Top (Dashboard)</span>
                  <p className="text-[11px] text-muted-foreground">Instantly return to top</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Alt</kbd>
                  <span className="text-xs text-muted-foreground">+</span>
                  <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Home</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-muted/20">
                <div>
                  <span className="text-sm font-medium text-foreground">Jump to Bottom Log</span>
                  <p className="text-[11px] text-muted-foreground">Directly to Transaction Log</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Alt</kbd>
                  <span className="text-xs text-muted-foreground">+</span>
                  <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">End</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Global Hotkeys & Best Practices */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Command className="h-3.5 w-3.5 text-primary" />
              <span>Universal Shortcuts</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-muted/20">
                <div>
                  <span className="text-sm font-medium text-foreground">Global Search</span>
                  <p className="text-[11px] text-muted-foreground">Focus search bar from anywhere</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">Ctrl</kbd>
                  <span className="text-xs text-muted-foreground">+</span>
                  <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-card">K</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-muted/20">
                <div>
                  <span className="text-sm font-medium text-foreground">Toggle Cheat Sheet</span>
                  <p className="text-[11px] text-muted-foreground">Press anytime outside inputs</p>
                </div>
                <kbd className="px-2 py-0.5 text-xs font-mono rounded border border-border bg-card font-bold text-primary shrink-0 ml-2">
                  ?
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-muted/20">
                <div>
                  <span className="text-sm font-medium text-foreground">Close Popups / Search</span>
                  <p className="text-[11px] text-muted-foreground">Dismiss dialogs & blur inputs</p>
                </div>
                <kbd className="px-2 py-0.5 text-xs font-mono rounded border border-border bg-card shrink-0 ml-2">
                  Esc
                </kbd>
              </div>

              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs text-muted-foreground mt-3">
                <span className="font-semibold text-foreground">Typing protection:</span> While entering numbers inside form fields, search inputs, or notes, direct number shortcuts are automatically paused.
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="mt-12 bg-muted/30 rounded-xl p-8 border border-border">
        <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <details className="group border-b border-border pb-4 cursor-pointer">
            <summary className="font-medium text-foreground outline-none">How do I navigate Cryodeal using keyboard shortcuts without NumLock?</summary>
            <p className="text-muted-foreground text-sm mt-2">
              Cryodeal utilizes the standard top-row number keys (1 to 7) located above your letter keys. You never need a numeric keypad or NumLock turned on. Simply press 1 for Dashboard, 2 for Products, 3 for Issue Materials, 4 for Return Materials, 5 for Purchasing, 6 for Employees, or 7 for Transaction Log. You can also use Alt+1 through Alt+7 or Alt+Down/Up arrows to step between pages.
            </p>
          </details>
          <details className="group border-b border-border pb-4 cursor-pointer">
            <summary className="font-medium text-foreground outline-none">How do I issue materials to a new technician?</summary>
            <p className="text-muted-foreground text-sm mt-2">
              Navigate to "Issue Materials" under Inventory. Simply type the name of the new technician in the employee field. If they don't exist in the system, Cryodeal will automatically create their profile for you and assign the materials to them instantly.
            </p>
          </details>
          <details className="group border-b border-border pb-4 cursor-pointer">
            <summary className="font-medium text-foreground outline-none">Can I process a partial material return?</summary>
            <p className="text-muted-foreground text-sm mt-2">
              Yes. Go to "Return Materials", select the active issue from the dropdown, and specify exactly how much is being returned in the "Return Qty Now" column. The remaining amount will be logged as used.
            </p>
          </details>
          <details className="group border-b border-border pb-4 cursor-pointer">
            <summary className="font-medium text-foreground outline-none">How is my stock value calculated on the dashboard?</summary>
            <p className="text-muted-foreground text-sm mt-2">
              The Estimated Stock Value is calculated by taking your current on-hand stock for each product and multiplying it by its respective purchase price.
            </p>
          </details>
        </div>
      </div>

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={closeShortcutsModal}
        navItems={navItems}
      />
    </PageContainer>
  );
}
