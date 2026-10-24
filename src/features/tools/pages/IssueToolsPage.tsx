import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, Plus, Trash2, Printer, Wrench, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '../../../store/authStore';
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { toolRepository } from '../../../repositories/ToolRepository';
import { toolTransactionRepository } from '../../../repositories/ToolTransactionRepository';
import type { Tool } from '../../../shared/types/Tool';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { escapeHtml } from '../../../shared/utils/security';

const toolIssueItemSchema = z.object({
  toolId: z.string().min(1, 'Please select a tool'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  conditionOut: z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_REPAIR', 'DAMAGED']).default('GOOD')
});

const toolIssueSchema = z.object({
  employeeId: z.string().min(1, 'Please select a technician'),
  siteName: z.string().optional(),
  issueDate: z.string().min(1, 'Date is required'),
  expectedReturnDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(toolIssueItemSchema).min(1, 'Add at least one tool')
});

type FormData = z.infer<typeof toolIssueSchema>;

export default function IssueToolsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedToolId = searchParams.get('toolId');

  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [employees, setEmployees] = useState<any[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success modal state
  const [issuedSlip, setIssuedSlip] = useState<{
    id: string;
    issueNumber: string;
    techName: string;
    siteName: string;
    date: string;
    items: { name: string; code: string; qty: number; condition: string }[];
  } | null>(null);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(toolIssueSchema) as any,
    defaultValues: {
      employeeId: '',
      siteName: '',
      issueDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: '',
      notes: '',
      items: [{ toolId: preselectedToolId || '', quantity: 1, conditionOut: 'GOOD' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      employeeRepository.getAll(companyId),
      toolRepository.getAll(companyId)
    ]).then(([empList, toolList]) => {
      setEmployees(empList.filter(e => e.status === 'ACTIVE' || !e.status));
      setTools(toolList.filter(t => t.status !== 'DELETED'));
      if (preselectedToolId) {
        setValue('items.0.toolId', preselectedToolId);
      }
    }).catch(err => {
      console.error('Failed to load issue page data', err);
      toast.error('Failed to load employees or tools');
    }).finally(() => {
      setIsLoading(false);
    });
  }, [companyId, preselectedToolId, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!companyId || !user) return;

    // Validate quantities against available stock
    for (const item of data.items) {
      const tool = tools.find(t => t.id === item.toolId);
      if (!tool) {
        toast.error('One or more selected tools could not be found');
        return;
      }
      if (tool.availableQty < item.quantity) {
        toast.error(`Not enough "${tool.name}" in store. Available: ${tool.availableQty}, Requested: ${item.quantity}`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const selectedEmp = employees.find(e => e.id === data.employeeId);
      const techName = selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}`.trim() : 'Technician';

      const res = await toolTransactionRepository.issueTools({
        companyId,
        employeeId: data.employeeId,
        employeeName: techName,
        siteName: data.siteName?.trim() || '',
        issueDate: new Date(data.issueDate),
        expectedReturnDate: data.expectedReturnDate,
        notes: data.notes?.trim() || '',
        items: data.items.map(it => ({
          toolId: it.toolId,
          quantity: Number(it.quantity),
          conditionOut: it.conditionOut
        }))
      }, user.uid);

      toast.success(`Tools issued successfully! Slip #${res.issueNumber}`);

      const enrichedItems = data.items.map(it => {
        const t = tools.find(tool => tool.id === it.toolId);
        return {
          name: t?.name || 'Tool',
          code: t?.toolCode || '',
          qty: it.quantity,
          condition: it.conditionOut
        };
      });

      setIssuedSlip({
        id: res.id,
        issueNumber: res.issueNumber,
        techName,
        siteName: data.siteName || '',
        date: data.issueDate,
        items: enrichedItems
      });

    } catch (err: any) {
      toast.error(err.message || 'Failed to issue tools');
    } finally {
      setIsSubmitting(false);
    }
  };

  const printSlip = () => {
    if (!issuedSlip) return;
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><title>Tool Issue Slip - ${issuedSlip.issueNumber}</title>
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
        <div style="font-size: 14px; font-weight: bold; color: #444;">TOOL ISSUE SLIP</div>
        <div>Slip #: <b>${issuedSlip.issueNumber}</b></div>
      </div>
      <div class="info-grid">
        <div>
          <div>Technician: <b>${escapeHtml(issuedSlip.techName)}</b></div>
          <div>Site / Location: <b>${escapeHtml(issuedSlip.siteName || 'N/A')}</b></div>
        </div>
        <div style="text-align: right;">
          <div>Issue Date: <b>${issuedSlip.date}</b></div>
          <div>Issued By: <b>${escapeHtml(user?.fullName || 'Store Keeper')}</b></div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Tool Code</th>
            <th>Tool Name & Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: center;">Condition Out</th>
          </tr>
        </thead>
        <tbody>
          ${issuedSlip.items.map(it => `
            <tr>
              <td><b>${escapeHtml(it.code)}</b></td>
              <td>${escapeHtml(it.name)}</td>
              <td style="text-align: center; font-weight: bold;">${it.qty}</td>
              <td style="text-align: center;">${it.condition}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 25px; font-size: 11px; color: #555;">
        * Note: The technician is responsible for the care and safety of all tools listed above until returned in good condition.
      </div>
      <div class="sig">
        <div class="sig-box">Technician Signature</div>
        <div class="sig-box">Store Keeper / Issuer Signature</div>
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
        title="Issue Tools to Technicians"
        description="Assign equipment, power tools, gauges, and instruments to technicians for site assignments."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
        {/* Assignment Metadata */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-xs space-y-4">
          <h3 className="font-semibold text-foreground text-sm border-b border-border pb-2">
            1. Technician & Assignment Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                Select Technician *
              </label>
              <select
                {...register('employeeId')}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Choose technician...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.role || 'Staff'})
                  </option>
                ))}
              </select>
              {errors.employeeId && (
                <p className="text-xs text-destructive mt-1">{errors.employeeId.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                Site Name / Job Location
              </label>
              <input
                type="text"
                {...register('siteName')}
                placeholder="e.g. 4S Catering (Pattom)"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                {...register('issueDate')}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.issueDate && (
                <p className="text-xs text-destructive mt-1">{errors.issueDate.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                Expected Return Date (Optional)
              </label>
              <input
                type="date"
                {...register('expectedReturnDate')}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Issue Notes / Job Remarks
            </label>
            <input
              type="text"
              {...register('notes')}
              placeholder="e.g. Compressor overhaul assignment, return on Friday"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Tools Selection */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h3 className="font-semibold text-foreground text-sm">
                2. Select Tools to Issue
              </h3>
              <p className="text-xs text-muted-foreground">Select available tools and specify the quantity to issue.</p>
            </div>
            <button
              type="button"
              onClick={() => append({ toolId: '', quantity: 1, conditionOut: 'GOOD' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Another Tool
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40 rounded-t-lg">
                <tr>
                  <th className="px-3 py-2.5 min-w-[280px]">Select Tool</th>
                  <th className="px-3 py-2.5 text-center w-28">Available</th>
                  <th className="px-3 py-2.5 text-center w-32">Issue Qty</th>
                  <th className="px-3 py-2.5 text-center w-36">Condition Out</th>
                  <th className="px-3 py-2.5 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fields.map((field, idx) => {
                  const currentToolId = watchedItems[idx]?.toolId;
                  const selectedToolData = tools.find(t => t.id === currentToolId);

                  return (
                    <tr key={field.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-2.5">
                        <select
                          {...register(`items.${idx}.toolId` as const)}
                          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select tool...</option>
                          {tools.map(tool => (
                            <option
                              key={tool.id}
                              value={tool.id}
                              disabled={tool.availableQty <= 0 && tool.id !== currentToolId}
                            >
                              [{tool.toolCode}] {tool.name} {tool.brand ? `(${tool.brand})` : ''} — {tool.availableQty > 0 ? `${tool.availableQty} Avail` : 'Out of stock'}
                            </option>
                          ))}
                        </select>
                        {selectedToolData && (
                          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3">
                            <span>Tag: <b className="text-foreground">{selectedToolData.toolCode}</b></span>
                            {selectedToolData.serialNumber && <span>SN: <b className="font-mono text-foreground">{selectedToolData.serialNumber}</b></span>}
                            {selectedToolData.location && <span>Loc: {selectedToolData.location}</span>}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-center font-mono font-bold text-sm">
                        {selectedToolData ? (
                          <span className={selectedToolData.availableQty > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                            {selectedToolData.availableQty}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min="1"
                          max={selectedToolData ? selectedToolData.availableQty : 999}
                          {...register(`items.${idx}.quantity` as const)}
                          disabled={!selectedToolData || selectedToolData.availableQty <= 0}
                          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        />
                      </td>

                      <td className="px-3 py-2.5">
                        <select
                          {...register(`items.${idx}.conditionOut` as const)}
                          className="w-full h-10 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="NEW">New</option>
                          <option value="EXCELLENT">Excellent</option>
                          <option value="GOOD">Good</option>
                          <option value="FAIR">Fair</option>
                          <option value="NEEDS_REPAIR">Needs Repair</option>
                        </select>
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => fields.length > 1 && remove(idx)}
                          disabled={fields.length <= 1}
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
              onClick={() => append({ toolId: '', quantity: 1, conditionOut: 'GOOD' })}
              className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> + Add Another Tool
            </button>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <AppButton type="button" variant="outline" onClick={() => navigate('/tools')} disabled={isSubmitting}>
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Issuing Tools...' : 'Confirm & Issue Tools'}
          </AppButton>
        </div>
      </form>

      {/* Success Modal with Print Option */}
      {issuedSlip && (
        <AppDialog
          isOpen={true}
          onOpenChange={() => { setIssuedSlip(null); navigate('/tools'); }}
          title="Tools Issued Successfully"
          description={`Issue Slip #${issuedSlip.issueNumber} recorded in inventory.`}
          className="max-w-md"
        >
          <div className="py-3 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="bg-muted/40 p-3 rounded-lg border border-border text-left text-xs space-y-1">
              <div>Issue ID: <b className="font-mono text-primary">{issuedSlip.issueNumber}</b></div>
              <div>Technician: <b>{issuedSlip.techName}</b></div>
              {issuedSlip.siteName && <div>Site: <b>{issuedSlip.siteName}</b></div>}
              <div>Tools Issued: <b>{issuedSlip.items.length} items</b></div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <AppButton variant="outline" onClick={printSlip}>
                <Printer className="h-4 w-4 mr-1.5" /> Print Issue Slip
              </AppButton>
              <AppButton onClick={() => { setIssuedSlip(null); navigate('/tools'); }}>
                Done
              </AppButton>
            </div>
          </div>
        </AppDialog>
      )}
    </PageContainer>
  );
}
