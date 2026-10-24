import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, RotateCcw, PlusCircle, 
  Printer, CheckCircle2, AlertCircle, Wrench 
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '../../../store/authStore';
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { toolRepository } from '../../../repositories/ToolRepository';
import { toolTransactionRepository } from '../../../repositories/ToolTransactionRepository';
import type { Tool, ToolIssueTransaction, ToolCondition } from '../../../shared/types/Tool';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { escapeHtml } from '../../../shared/utils/security';
import { cn } from '../../../shared/utils/cn';

interface DirectReturnRow {
  id: string;
  toolId: string;
  toolCode?: string;
  toolName?: string;
  returnQty: number | '';
  conditionIn: ToolCondition;
  actionNeeded: 'RESTOCK' | 'MAINTENANCE' | 'WRITE_OFF';
}

export default function ReturnToolsPage() {
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [mode, setMode] = useState<'ISSUE' | 'DIRECT'>('ISSUE');
  const [employees, setEmployees] = useState<any[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [activeIssues, setActiveIssues] = useState<ToolIssueTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Linked Return State
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  const [linkedSiteName, setLinkedSiteName] = useState<string>('');
  const [linkedNotes, setLinkedNotes] = useState<string>('');
  const [linkedReturns, setLinkedReturns] = useState<{
    [toolId: string]: {
      returnQty: number;
      conditionIn: ToolCondition;
      actionNeeded: 'RESTOCK' | 'MAINTENANCE' | 'WRITE_OFF';
    };
  }>({});

  // Direct Return State
  const [directEmpId, setDirectEmpId] = useState<string>('');
  const [directSiteName, setDirectSiteName] = useState<string>('');
  const [directNotes, setDirectNotes] = useState<string>('');
  const [directRows, setDirectRows] = useState<DirectReturnRow[]>([
    {
      id: `dir_${Date.now()}_1`,
      toolId: '',
      returnQty: 1,
      conditionIn: 'GOOD',
      actionNeeded: 'RESTOCK'
    }
  ]);

  // Success Slip Modal State
  const [returnedSlip, setReturnedSlip] = useState<{
    id: string;
    returnNumber: string;
    techName: string;
    siteName: string;
    items: { name: string; code: string; qty: number; condition: string; action: string }[];
  } | null>(null);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      employeeRepository.getAll(companyId),
      toolRepository.getAll(companyId),
      toolTransactionRepository.getIssueTransactions(companyId)
    ]).then(([empList, toolList, issueList]) => {
      setEmployees(empList.filter(e => e.status === 'ACTIVE' || !e.status));
      setTools(toolList.filter(t => t.status !== 'DELETED'));
      setActiveIssues(issueList.filter(i => i.status !== 'CLOSED'));
    }).catch(err => {
      console.error('Failed to load tool return data', err);
      toast.error('Failed to load data for tool returns');
    }).finally(() => {
      setIsLoading(false);
    });
  }, [companyId]);

  // Technicians who currently hold tools
  const employeesWithTools = useMemo(() => {
    const empIds = new Set(activeIssues.map(i => i.employeeId));
    return employees.filter(e => empIds.has(e.id));
  }, [employees, activeIssues]);

  // Issues for selected technician
  const technicianIssues = useMemo(() => {
    return activeIssues.filter(i => i.employeeId === selectedEmpId);
  }, [activeIssues, selectedEmpId]);

  // Auto-select issue when single issue found
  useEffect(() => {
    if (technicianIssues.length === 1) {
      setSelectedIssueId(technicianIssues[0].id!);
    } else {
      setSelectedIssueId('');
    }
  }, [selectedEmpId, technicianIssues]);

  const selectedIssue = useMemo(() => {
    return activeIssues.find(i => i.id === selectedIssueId);
  }, [activeIssues, selectedIssueId]);

  // Populate linked return state when issue selected
  useEffect(() => {
    if (selectedIssue) {
      setLinkedSiteName(selectedIssue.siteName || '');
      const initialMap: any = {};
      selectedIssue.items.forEach(it => {
        initialMap[it.toolId] = {
          returnQty: 0,
          conditionIn: it.conditionOut || 'GOOD',
          actionNeeded: 'RESTOCK'
        };
      });
      setLinkedReturns(initialMap);
    } else {
      setLinkedSiteName('');
      setLinkedReturns({});
    }
  }, [selectedIssue]);

  // Submit Linked Return
  const handleSubmitLinked = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user || !selectedIssueId || !selectedIssue) return;

    const returnPayload = Object.entries(linkedReturns)
      .filter(([_, val]) => Number(val.returnQty) > 0)
      .map(([toolId, val]) => ({
        toolId,
        returnQty: Number(val.returnQty),
        conditionIn: val.conditionIn,
        actionNeeded: val.actionNeeded
      }));

    if (returnPayload.length === 0) {
      toast.error('Please enter a return quantity greater than 0 for at least one tool.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await toolTransactionRepository.returnTools(
        selectedIssueId,
        returnPayload,
        companyId,
        user.uid,
        linkedSiteName.trim(),
        linkedNotes.trim()
      );

      toast.success(`Tools returned successfully! Return #${res.returnNumber}`);

      const slipItems = returnPayload.map(rp => {
        const item = selectedIssue.items.find(i => i.toolId === rp.toolId);
        return {
          name: item?.toolName || 'Tool',
          code: item?.toolCode || '',
          qty: rp.returnQty,
          condition: rp.conditionIn,
          action: rp.actionNeeded
        };
      });

      setReturnedSlip({
        id: res.id,
        returnNumber: res.returnNumber,
        techName: selectedIssue.employeeName || 'Technician',
        siteName: linkedSiteName || '',
        items: slipItems
      });

    } catch (err: any) {
      toast.error(err.message || 'Failed to process tool return');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Return Handlers
  const addDirectRow = () => {
    setDirectRows(prev => [
      ...prev,
      {
        id: `dir_${Date.now()}_${prev.length + 1}`,
        toolId: '',
        returnQty: 1,
        conditionIn: 'GOOD',
        actionNeeded: 'RESTOCK'
      }
    ]);
  };

  const removeDirectRow = (id: string) => {
    if (directRows.length <= 1) return;
    setDirectRows(prev => prev.filter(r => r.id !== id));
  };

  const updateDirectRow = (id: string, field: keyof DirectReturnRow, value: any) => {
    setDirectRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSubmitDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user) return;

    const validRows = directRows.filter(r => r.toolId && Number(r.returnQty) > 0);
    if (validRows.length === 0) {
      toast.error('Please select at least one tool and enter a valid return quantity.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedEmp = employees.find(e => e.id === directEmpId);
      const techName = selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}`.trim() : 'Technician';

      const res = await toolTransactionRepository.returnDirectTools({
        employeeId: directEmpId || 'UNLINKED',
        siteName: directSiteName.trim(),
        notes: directNotes.trim(),
        items: validRows.map(r => ({
          toolId: r.toolId,
          returnQty: Number(r.returnQty),
          conditionIn: r.conditionIn,
          actionNeeded: r.actionNeeded
        }))
      }, companyId, user.uid);

      toast.success(`Direct tool return ${res.returnNumber} processed successfully!`);

      const slipItems = validRows.map(r => {
        const tool = tools.find(t => t.id === r.toolId);
        return {
          name: tool?.name || 'Tool',
          code: tool?.toolCode || '',
          qty: Number(r.returnQty),
          condition: r.conditionIn,
          action: r.actionNeeded
        };
      });

      setReturnedSlip({
        id: res.id,
        returnNumber: res.returnNumber,
        techName: techName || 'Direct Return',
        siteName: directSiteName || '',
        items: slipItems
      });

    } catch (err: any) {
      toast.error(err.message || 'Failed to process direct tool return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const printSlip = () => {
    if (!returnedSlip) return;
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><title>Tool Return Slip - ${returnedSlip.returnNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 30px; color: #111; }
        .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; }
        .title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background: #f0f0f0; border: 1px solid #ccc; padding: 8px; font-size: 11px; text-align: left; }
        td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
        .sig { margin-top: 50px; display: flex; justify-content: space-between; }
        .sig-box { width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 6px; font-size: 11px; }
      </style></head><body>
      <div class="header">
        <div class="title">${escapeHtml(company?.companyName || 'Cryodeal')}</div>
        <div style="font-size: 14px; font-weight: bold; color: #15803d;">TOOL RETURN ACKNOWLEDGEMENT</div>
        <div>Slip #: <b>${returnedSlip.returnNumber}</b></div>
      </div>
      <div class="info-grid">
        <div>
          <div>Technician: <b>${escapeHtml(returnedSlip.techName)}</b></div>
          <div>Site / Location: <b>${escapeHtml(returnedSlip.siteName || 'N/A')}</b></div>
        </div>
        <div style="text-align: right;">
          <div>Return Date: <b>${new Date().toLocaleDateString('en-IN')}</b></div>
          <div>Received By: <b>${escapeHtml(user?.fullName || 'Store Keeper')}</b></div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Tool Code</th>
            <th>Tool Name</th>
            <th style="text-align: center;">Qty Returned</th>
            <th style="text-align: center;">Condition In</th>
            <th style="text-align: center;">Inventory Action</th>
          </tr>
        </thead>
        <tbody>
          ${returnedSlip.items.map(it => `
            <tr>
              <td><b>${escapeHtml(it.code)}</b></td>
              <td>${escapeHtml(it.name)}</td>
              <td style="text-align: center; font-weight: bold;">${it.qty}</td>
              <td style="text-align: center;">${it.condition}</td>
              <td style="text-align: center;">${it.action === 'RESTOCK' ? 'Restocked to Store' : it.action === 'MAINTENANCE' ? 'Sent to Maintenance' : 'Written Off'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="sig">
        <div class="sig-box">Technician Signature</div>
        <div class="sig-box">Store Keeper / Receiver Signature</div>
      </div>
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 250);
  };

  return (
    <PageContainer>
      <div className="mb-4">
        <AppButton variant="ghost" size="sm" onClick={() => navigate('/tools')} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tools
        </AppButton>
      </div>

      <PageHeader
        title="Return Tools to Inventory"
        description="Check in returned equipment, verify condition, and update available tool stock."
      />

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-muted/60 rounded-xl max-w-md border border-border">
        <button
          type="button"
          onClick={() => setMode('ISSUE')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer",
            mode === 'ISSUE'
              ? "bg-card text-foreground shadow-sm font-semibold border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <RotateCcw className="h-4 w-4 text-emerald-600" />
          <span>From Tool Issue</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('DIRECT')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer",
            mode === 'DIRECT'
              ? "bg-card text-foreground shadow-sm font-semibold border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PlusCircle className="h-4 w-4 text-primary" />
          <span>Direct Tool Return</span>
        </button>
      </div>

      {/* TAB 1: FROM ACTIVE TOOL ISSUE */}
      {mode === 'ISSUE' && (
        <form onSubmit={handleSubmitLinked} className="space-y-6 max-w-4xl">
          <div className="bg-card rounded-xl p-6 border border-border shadow-xs space-y-4">
            <h3 className="font-semibold text-foreground text-sm border-b border-border pb-2">
              1. Select Technician & Active Tool Issue
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                  Technician *
                </label>
                <select
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">
                    {employeesWithTools.length > 0 ? 'Choose technician with issued tools...' : 'No active tool issues pending'}
                  </option>
                  {employeesWithTools.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                  Active Issue Slip *
                </label>
                <select
                  value={selectedIssueId}
                  onChange={e => setSelectedIssueId(e.target.value)}
                  disabled={!selectedEmpId || technicianIssues.length === 0}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">
                    {technicianIssues.length > 0 ? 'Choose an issue slip...' : 'No active tool slips'}
                  </option>
                  {technicianIssues.map(i => {
                    const d = (i.createdAt as any)?.toDate ? (i.createdAt as any).toDate() : new Date(i.issueDate);
                    return (
                      <option key={i.id} value={i.id}>
                        {i.issueNumber} — {d.toLocaleDateString('en-IN')} {i.siteName ? `(${i.siteName})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {selectedEmpId && technicianIssues.length === 0 && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground text-sm">No active tool issues for this technician.</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      If they are returning extra tools or returning without a prior slip, use Direct Tool Return.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setMode('DIRECT'); setDirectEmpId(selectedEmpId); }}
                  className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  Direct Tool Return &rarr;
                </button>
              </div>
            )}

            {selectedIssue && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                    Site / Location (From Issue or Confirmed)
                  </label>
                  <input
                    type="text"
                    value={linkedSiteName}
                    onChange={e => setLinkedSiteName(e.target.value)}
                    placeholder="e.g. 4S Catering (Pattom)"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Specify where this equipment was retrieved from.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                    Return Notes / Handover Remarks
                  </label>
                  <input
                    type="text"
                    value={linkedNotes}
                    onChange={e => setLinkedNotes(e.target.value)}
                    placeholder="e.g. All cables intact, serviced filter"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tools on Slip */}
          {selectedIssue && (
            <div className="bg-card rounded-xl p-6 border border-border shadow-xs space-y-4">
              <h3 className="font-semibold text-foreground text-sm border-b border-border pb-2">
                2. Tools on Slip #{selectedIssue.issueNumber}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/40 rounded-t-lg">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Tool Details</th>
                      <th className="px-3 py-2.5 font-medium text-center">Issued</th>
                      <th className="px-3 py-2.5 font-medium text-center">Returned</th>
                      <th className="px-3 py-2.5 font-medium text-center">Pending</th>
                      <th className="px-3 py-2.5 font-medium w-28 text-center">Return Qty</th>
                      <th className="px-3 py-2.5 font-medium w-36">Condition In</th>
                      <th className="px-3 py-2.5 font-medium w-40">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedIssue.items.map(item => {
                      const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                      const currentVal = linkedReturns[item.toolId] || { returnQty: 0, conditionIn: 'GOOD', actionNeeded: 'RESTOCK' };

                      return (
                        <tr key={item.toolId} className="hover:bg-muted/10 transition-colors">
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-foreground">{item.toolName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              Tag: {item.toolCode} {item.serialNumber ? `• SN: ${item.serialNumber}` : ''}
                            </div>
                          </td>

                          <td className="px-3 py-2.5 text-center font-bold text-muted-foreground">
                            {item.quantity}
                          </td>

                          <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                            {item.returnedQuantity || 0}
                          </td>

                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {maxReturnable}
                          </td>

                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max={maxReturnable}
                              disabled={maxReturnable <= 0}
                              value={currentVal.returnQty}
                              onChange={e => {
                                const val = Math.min(maxReturnable, Math.max(0, parseInt(e.target.value, 10) || 0));
                                setLinkedReturns(prev => ({
                                  ...prev,
                                  [item.toolId]: { ...prev[item.toolId], returnQty: val }
                                }));
                              }}
                              className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
                            />
                          </td>

                          <td className="px-3 py-2.5">
                            <select
                              value={currentVal.conditionIn}
                              disabled={maxReturnable <= 0}
                              onChange={e => {
                                const cond = e.target.value as ToolCondition;
                                setLinkedReturns(prev => ({
                                  ...prev,
                                  [item.toolId]: {
                                    ...prev[item.toolId],
                                    conditionIn: cond,
                                    actionNeeded: (cond === 'NEEDS_REPAIR' || cond === 'DAMAGED') ? 'MAINTENANCE' : 'RESTOCK'
                                  }
                                }));
                              }}
                              className="w-full h-9 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
                            >
                              <option value="NEW">New</option>
                              <option value="EXCELLENT">Excellent</option>
                              <option value="GOOD">Good</option>
                              <option value="FAIR">Fair</option>
                              <option value="NEEDS_REPAIR">Needs Repair</option>
                              <option value="DAMAGED">Damaged</option>
                            </select>
                          </td>

                          <td className="px-3 py-2.5">
                            <select
                              value={currentVal.actionNeeded}
                              disabled={maxReturnable <= 0}
                              onChange={e => {
                                const act = e.target.value as any;
                                setLinkedReturns(prev => ({
                                  ...prev,
                                  [item.toolId]: { ...prev[item.toolId], actionNeeded: act }
                                }));
                              }}
                              className="w-full h-9 rounded-lg border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
                            >
                              <option value="RESTOCK">Restock (Store)</option>
                              <option value="MAINTENANCE">Send to Service</option>
                              <option value="WRITE_OFF">Write Off (Damaged)</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedIssue && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <AppButton type="button" variant="outline" onClick={() => navigate('/tools')} disabled={isSubmitting}>
                Cancel
              </AppButton>
              <AppButton type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Processing Return...' : 'Confirm Return & Restock Tools'}
              </AppButton>
            </div>
          )}
        </form>
      )}

      {/* TAB 2: DIRECT TOOL RETURN (WITHOUT ISSUE) */}
      {mode === 'DIRECT' && (
        <form onSubmit={handleSubmitDirect} className="space-y-6 max-w-4xl">
          <div className="bg-card rounded-xl p-6 border border-border shadow-xs space-y-4">
            <h3 className="font-semibold text-foreground text-sm border-b border-border pb-2">
              Direct / Unlisted Tool Return
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                  Technician (Optional)
                </label>
                <select
                  value={directEmpId}
                  onChange={e => setDirectEmpId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">General Return (No specific technician)</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                  Site / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4S Catering (Pattom)"
                  value={directSiteName}
                  onChange={e => setDirectSiteName(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                  Return Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Returned from site, surplus kit"
                  value={directNotes}
                  onChange={e => setDirectNotes(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Direct Tools Selection */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Tools to Restock
                </h3>
                <p className="text-xs text-muted-foreground">Select tools from your catalog to check back into inventory.</p>
              </div>
              <button
                type="button"
                onClick={addDirectRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Tool
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/40 rounded-t-lg">
                  <tr>
                    <th className="px-3 py-2.5 min-w-[280px]">Select Tool</th>
                    <th className="px-3 py-2.5 text-center w-28">Return Qty</th>
                    <th className="px-3 py-2.5 text-center w-36">Condition In</th>
                    <th className="px-3 py-2.5 text-center w-40">Action</th>
                    <th className="px-3 py-2.5 text-center w-16">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {directRows.map(row => {
                    const tool = tools.find(t => t.id === row.toolId);

                    return (
                      <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-2.5">
                          <select
                            value={row.toolId}
                            onChange={e => updateDirectRow(row.id, 'toolId', e.target.value)}
                            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Choose tool...</option>
                            {tools.map(t => (
                              <option key={t.id} value={t.id}>
                                [{t.toolCode}] {t.name} ({t.brand || 'No brand'})
                              </option>
                            ))}
                          </select>
                          {tool && (
                            <div className="text-[11px] text-muted-foreground mt-1">
                              Currently in Store: <b className="text-foreground">{tool.availableQty}</b> / Total: {tool.totalQty}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="1"
                            value={row.returnQty}
                            onChange={e => updateDirectRow(row.id, 'returnQty', e.target.value)}
                            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </td>

                        <td className="px-3 py-2.5">
                          <select
                            value={row.conditionIn}
                            onChange={e => updateDirectRow(row.id, 'conditionIn', e.target.value)}
                            className="w-full h-10 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="NEW">New</option>
                            <option value="EXCELLENT">Excellent</option>
                            <option value="GOOD">Good</option>
                            <option value="FAIR">Fair</option>
                            <option value="NEEDS_REPAIR">Needs Repair</option>
                            <option value="DAMAGED">Damaged</option>
                          </select>
                        </td>

                        <td className="px-3 py-2.5">
                          <select
                            value={row.actionNeeded}
                            onChange={e => updateDirectRow(row.id, 'actionNeeded', e.target.value)}
                            className="w-full h-10 rounded-lg border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="RESTOCK">Restock (Store)</option>
                            <option value="MAINTENANCE">Send to Service</option>
                            <option value="WRITE_OFF">Write Off</option>
                          </select>
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeDirectRow(row.id)}
                            disabled={directRows.length <= 1}
                            className="p-1 rounded text-muted-foreground hover:text-destructive disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={addDirectRow}
                className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> + Add Another Tool
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <AppButton type="button" variant="outline" onClick={() => navigate('/tools')} disabled={isSubmitting}>
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Restocking Tools...' : 'Confirm Return & Restock Tools'}
            </AppButton>
          </div>
        </form>
      )}

      {/* Return Slip Modal */}
      {returnedSlip && (
        <AppDialog
          isOpen={true}
          onOpenChange={() => { setReturnedSlip(null); navigate('/tools'); }}
          title="Tools Returned Successfully"
          description={`Return Slip #${returnedSlip.returnNumber} processed and inventory updated.`}
          className="max-w-md"
        >
          <div className="py-3 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="bg-muted/40 p-3 rounded-lg border border-border text-left text-xs space-y-1">
              <div>Return ID: <b className="font-mono text-emerald-700 dark:text-emerald-400">{returnedSlip.returnNumber}</b></div>
              <div>Technician: <b>{returnedSlip.techName}</b></div>
              {returnedSlip.siteName && <div>Site: <b>{returnedSlip.siteName}</b></div>}
              <div>Tools Restocked: <b>{returnedSlip.items.length} items</b></div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <AppButton variant="outline" onClick={printSlip}>
                <Printer className="h-4 w-4 mr-1.5" /> Print Return Slip
              </AppButton>
              <AppButton onClick={() => { setReturnedSlip(null); navigate('/tools'); }}>
                Done
              </AppButton>
            </div>
          </div>
        </AppDialog>
      )}
    </PageContainer>
  );
}
