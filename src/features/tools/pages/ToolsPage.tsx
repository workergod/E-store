import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Wrench, Plus, ArrowUpRight, ArrowDownLeft, Search, Filter, 
  Printer, Edit, Trash2, CheckCircle2, AlertTriangle, Clock, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '../../../store/authStore';
import { Role } from '../../../constants/roles';
import { toolRepository } from '../../../repositories/ToolRepository';
import { toolTransactionRepository } from '../../../repositories/ToolTransactionRepository';
import type { Tool, ToolIssueTransaction, ToolReturnTransaction } from '../../../shared/types/Tool';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';
import { MetricCard } from '../../../shared/widgets/MetricWidget';
import { ToolFormDialog } from '../components/ToolFormDialog';
import { escapeHtml } from '../../../shared/utils/security';

export default function ToolsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [activeTab, setActiveTab] = useState<'CATALOG' | 'LOG'>('CATALOG');
  const [tools, setTools] = useState<Tool[]>([]);
  const [issueLogs, setIssueLogs] = useState<ToolIssueTransaction[]>([]);
  const [returnLogs, setReturnLogs] = useState<ToolReturnTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [conditionFilter, setConditionFilter] = useState('ALL');

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | undefined>(undefined);

  const printRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsLoading(true);
      const [toolList, issues, returns] = await Promise.all([
        toolRepository.getAll(companyId).catch(() => []),
        toolTransactionRepository.getIssueTransactions(companyId).catch(() => []),
        toolTransactionRepository.getReturnTransactions(companyId).catch(() => [])
      ]);
      setTools(toolList.filter(t => t.status !== 'DELETED'));
      setIssueLogs(issues);
      setReturnLogs(returns);
    } catch (err: any) {
      console.error('Failed to load tools data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Metrics
  const metrics = useMemo(() => {
    let totalQty = 0;
    let availableQty = 0;
    let issuedQty = 0;
    let maintenanceQty = 0;

    tools.forEach(t => {
      totalQty += Number(t.totalQty) || 0;
      availableQty += Number(t.availableQty) || 0;
      issuedQty += Number(t.issuedQty) || 0;
      maintenanceQty += Number(t.maintenanceQty) || 0;
    });

    return { totalQty, availableQty, issuedQty, maintenanceQty, totalTools: tools.length };
  }, [tools]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    tools.forEach(t => { if (t.category) set.add(t.category); });
    return Array.from(set).sort();
  }, [tools]);

  // Filtered tools
  const filteredTools = useMemo(() => {
    return tools.filter(t => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        t.name.toLowerCase().includes(q) ||
        t.toolCode.toLowerCase().includes(q) ||
        (t.brand && t.brand.toLowerCase().includes(q)) ||
        (t.serialNumber && t.serialNumber.toLowerCase().includes(q)) ||
        (t.location && t.location.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'ALL' || t.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesCond = conditionFilter === 'ALL' || t.condition === conditionFilter;

      return matchesSearch && matchesCat && matchesStatus && matchesCond;
    });
  }, [tools, search, categoryFilter, statusFilter, conditionFilter]);

  const handleEdit = (tool: Tool) => {
    setSelectedTool(tool);
    setIsFormOpen(true);
  };

  const handleDelete = async (tool: Tool) => {
    if (!companyId || !user) return;
    if (tool.issuedQty > 0) {
      toast.error(`Cannot delete "${tool.name}" while ${tool.issuedQty} units are issued to technicians. Please return them first.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete tool "${tool.name}" (${tool.toolCode})?`)) {
      try {
        await toolRepository.delete(tool.id!, companyId, user.uid);
        toast.success(`Tool "${tool.name}" removed from active inventory`);
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete tool');
      }
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { window.print(); return; }
    w.document.write(`
      <html><head><title>Tools & Equipment Inventory - ${company?.companyName || 'Cryodeal'}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #222; }
        h2 { text-align: center; margin-bottom: 2px; }
        p.sub { text-align: center; color: #666; margin-bottom: 16px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #f3f4f6; padding: 7px 8px; text-align: left; font-size: 10px; border: 1px solid #ddd; text-transform: uppercase; }
        td { padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 11px; vertical-align: middle; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
      </style></head><body>
      <h2>${escapeHtml(company?.companyName || 'Cryodeal')} - Tools & Equipment Inventory</h2>
      <p class="sub">Total: ${metrics.totalTools} Types (${metrics.totalQty} Units) • Available: ${metrics.availableQty} • In Use: ${metrics.issuedQty} • Maintenance: ${metrics.maintenanceQty}</p>
      ${printContent}
      <p style="text-align:center;margin-top:20px;font-size:10px;color:#888;">
        Printed on ${new Date().toLocaleString('en-IN')}
      </p>
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 250);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">AVAILABLE</span>;
      case 'IN_USE':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">IN USE</span>;
      case 'MAINTENANCE':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">MAINTENANCE</span>;
      case 'DAMAGED':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">DAMAGED</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">{status}</span>;
    }
  };

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'NEW':
      case 'EXCELLENT':
        return <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">★ {condition}</span>;
      case 'GOOD':
        return <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">● {condition}</span>;
      case 'FAIR':
        return <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">▲ {condition}</span>;
      case 'NEEDS_REPAIR':
      case 'DAMAGED':
        return <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">✖ {condition}</span>;
      default:
        return <span className="text-[10px] text-muted-foreground">{condition}</span>;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Tools & Equipment"
        description="Catalog, issue, and manage tools, machinery, and instruments issued to technicians."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <AppButton variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" /> Print Report
            </AppButton>
            <AppButton variant="outline" size="sm" onClick={() => navigate('/tools/return')} className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
              <ArrowDownLeft className="h-4 w-4 mr-1.5" /> Return Tools
            </AppButton>
            <AppButton variant="outline" size="sm" onClick={() => navigate('/tools/issue')} className="border-primary text-primary hover:bg-primary/10">
              <ArrowUpRight className="h-4 w-4 mr-1.5" /> Issue Tools
            </AppButton>
            <AppButton size="sm" onClick={() => { setSelectedTool(undefined); setIsFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Tool
            </AppButton>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Tools"
          value={metrics.totalQty}
          description={`${metrics.totalTools} types registered`}
          icon={<Wrench className="h-5 w-5 text-primary" />}
        />
        <MetricCard
          title="Available in Store"
          value={metrics.availableQty}
          description="Ready for issue"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          title="In Use (Issued)"
          value={metrics.issuedQty}
          description="With technicians on site"
          icon={<ArrowUpRight className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Maintenance / Repair"
          value={metrics.maintenanceQty}
          description="Service required"
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-border mb-6">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('CATALOG')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'CATALOG'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Tools Catalog ({filteredTools.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LOG')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LOG'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Movement Log</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-mono">
              {issueLogs.length + returnLogs.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <AppButton size="sm" variant="ghost" onClick={loadData} title="Refresh tools">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </AppButton>
        </div>
      </div>

      {/* VIEW 1: TOOLS CATALOG */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-card p-4 rounded-xl border border-border shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tools by name, tag code, brand, serial #..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              )}

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="DAMAGED">Damaged</option>
                <option value="RETIRED">Retired</option>
              </select>

              <select
                value={conditionFilter}
                onChange={e => setConditionFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Conditions</option>
                <option value="NEW">New</option>
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="NEEDS_REPAIR">Needs Repair</option>
                <option value="DAMAGED">Damaged</option>
              </select>

              {(search || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || conditionFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('ALL');
                    setStatusFilter('ALL');
                    setConditionFilter('ALL');
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium underline px-1 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tool Code</th>
                    <th className="px-4 py-3 font-semibold min-w-[200px]">Tool Name</th>
                    <th className="px-4 py-3 font-semibold">Category / Brand</th>
                    <th className="px-4 py-3 font-semibold">Serial / Location</th>
                    <th className="px-4 py-3 font-semibold text-center">Available / Total</th>
                    <th className="px-4 py-3 font-semibold text-center">Condition</th>
                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading tools inventory...
                      </td>
                    </tr>
                  ) : filteredTools.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Wrench className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="font-medium text-foreground">No tools found</p>
                        <p className="text-xs mt-1">Add your first tool using the "+ Add Tool" button above.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTools.map(tool => (
                      <tr key={tool.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-xs text-primary whitespace-nowrap">
                          {tool.toolCode}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <div className="font-semibold text-foreground">{tool.name}</div>
                          {tool.notes && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1">{tool.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-foreground font-medium">{tool.category}</div>
                          {tool.brand && (
                            <div className="text-[11px] text-muted-foreground">{tool.brand} {tool.modelNumber ? `(${tool.modelNumber})` : ''}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {tool.serialNumber ? (
                            <div className="font-mono text-[11px] text-foreground">{tool.serialNumber}</div>
                          ) : (
                            <span className="text-muted-foreground/60">-</span>
                          )}
                          {tool.location && (
                            <div className="text-[10px] text-muted-foreground font-medium">Loc: {tool.location}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`font-bold text-sm ${tool.availableQty > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {tool.availableQty}
                          </span>
                          <span className="text-xs text-muted-foreground font-semibold"> / {tool.totalQty}</span>
                          {tool.issuedQty > 0 && (
                            <div className="text-[10px] text-blue-600 font-medium">({tool.issuedQty} issued)</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {getConditionBadge(tool.condition)}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {getStatusBadge(tool.status)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {tool.availableQty > 0 && (
                              <button
                                type="button"
                                onClick={() => navigate(`/tools/issue?toolId=${tool.id}`)}
                                className="px-2 py-1 rounded text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                                title="Issue this tool"
                              >
                                Issue
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEdit(tool)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Edit tool"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tool)}
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors cursor-pointer"
                              title="Delete tool"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MOVEMENT LOG */}
      {activeTab === 'LOG' && (
        <div className="space-y-6">
          {/* Recent Tool Issues */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">Recent Tool Issues</h3>
              </div>
              <AppButton size="sm" onClick={() => navigate('/tools/issue')}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New Tool Issue
              </AppButton>
            </div>

            {issueLogs.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No tool issues recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
                    <tr>
                      <th className="px-3 py-2.5">Issue ID</th>
                      <th className="px-3 py-2.5">Technician / Site</th>
                      <th className="px-3 py-2.5">Tools Issued</th>
                      <th className="px-3 py-2.5">Date & Time</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {issueLogs.slice(0, 15).map(issue => {
                      const d = (issue.createdAt as any)?.toDate ? (issue.createdAt as any).toDate() : new Date(issue.issueDate);
                      return (
                        <tr key={issue.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2.5 font-mono font-bold text-xs text-primary">
                            {issue.issueNumber}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-foreground">{issue.employeeName}</div>
                            {issue.siteName && (
                              <div className="text-[11px] text-muted-foreground font-medium">Site: {issue.siteName}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-xs text-foreground">
                              {issue.items.map(it => `${it.toolName} (x${it.quantity})`).join(', ')}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {d.toLocaleDateString('en-IN')} {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              issue.status === 'CLOSED'
                                ? 'bg-zinc-100 text-zinc-700'
                                : issue.status === 'PARTIALLY_RETURNED'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {issue.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Tool Returns */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-foreground">Recent Tool Returns</h3>
              </div>
              <AppButton size="sm" variant="outline" onClick={() => navigate('/tools/return')}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Process Return
              </AppButton>
            </div>

            {returnLogs.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No tool returns recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
                    <tr>
                      <th className="px-3 py-2.5">Return ID</th>
                      <th className="px-3 py-2.5">Technician / Site</th>
                      <th className="px-3 py-2.5">Tools Returned</th>
                      <th className="px-3 py-2.5">Condition In</th>
                      <th className="px-3 py-2.5">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {returnLogs.slice(0, 15).map(ret => {
                      const d = (ret.createdAt as any)?.toDate ? (ret.createdAt as any).toDate() : new Date(ret.returnDate);
                      return (
                        <tr key={ret.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2.5 font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                            {ret.returnNumber}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-foreground">{ret.employeeName}</div>
                            {ret.siteName && (
                              <div className="text-[11px] text-muted-foreground font-medium">Site: {ret.siteName}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-foreground">
                            {ret.items.map(it => `${it.toolName} (x${it.returnQty})`).join(', ')}
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            {ret.items.map((it, idx) => (
                              <span key={idx} className="mr-2">
                                {getConditionBadge(it.conditionIn)}
                              </span>
                            ))}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {d.toLocaleDateString('en-IN')} {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Print Content */}
      <div className="hidden">
        <div ref={printRef}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Tool Name</th>
                <th>Category</th>
                <th>Brand & Model</th>
                <th>Serial #</th>
                <th>Available</th>
                <th>Issued</th>
                <th>Total</th>
                <th>Condition</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTools.map(t => (
                <tr key={t.id}>
                  <td><b>{t.toolCode}</b></td>
                  <td>{t.name}</td>
                  <td>{t.category}</td>
                  <td>{t.brand || ''} {t.modelNumber || ''}</td>
                  <td>{t.serialNumber || '-'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{t.availableQty}</td>
                  <td style={{ textAlign: 'center' }}>{t.issuedQty}</td>
                  <td style={{ textAlign: 'center' }}>{t.totalQty}</td>
                  <td>{t.condition}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Tool Modal */}
      {companyId && user && (
        <ToolFormDialog
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          tool={selectedTool}
          companyId={companyId}
          userId={user.uid}
          onSuccess={loadData}
        />
      )}
    </PageContainer>
  );
}
