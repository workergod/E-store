import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, Plus, Trash2, RotateCcw, PlusCircle, PackageCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { issueRepository } from '../../../repositories/IssueRepository';
import { productRepository } from '../../../repositories/ProductRepository';
import type { IssueTransaction } from '../../../shared/types/IssueTransaction';
import type { Product } from '../../../shared/types/Product';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppForm, FormActions } from '../../../shared/forms/FormLayout';
import { FormSection } from '../../../shared/forms/FormSection';
import { AppInput } from '../../../shared/forms/AppInput';
import { AppButton } from '../../../shared/app/AppButton';
import { ProductSearchSelect } from '../../../shared/forms/ProductSearchSelect';
import { cn } from '../../../shared/utils/cn';

const returnSchema = z.object({
  returns: z.array(z.object({
    productId: z.string(),
    returnQty: z.coerce.number().min(0, 'Cannot be negative')
  }))
});

interface DirectReturnRow {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  unit?: string;
  currentStock: number;
  returnQty: number | '';
}

export default function ReturnMaterialsPage() {
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  // Mode: 'ISSUE' (return from active issue) or 'DIRECT' (return without issue)
  const [returnMode, setReturnMode] = useState<'ISSUE' | 'DIRECT'>('ISSUE');

  // Shared Data
  const [employees, setEmployees] = useState<any[]>([]);
  const [allActiveIssues, setAllActiveIssues] = useState<IssueTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 1. "From Active Issue" State
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');

  // 2. "Direct Return" State
  const [directEmpId, setDirectEmpId] = useState<string>('');
  const [directNotes, setDirectNotes] = useState<string>('');
  const [directItems, setDirectItems] = useState<DirectReturnRow[]>([
    {
      id: `row_${Date.now()}_1`,
      productId: '',
      productName: '',
      sku: '',
      unit: '',
      currentStock: 0,
      returnQty: ''
    }
  ]);

  const methods = useForm<{ returns: { productId: string; returnQty: number }[] }>({
    resolver: zodResolver(returnSchema) as any,
    defaultValues: { returns: [] }
  });

  const { fields, replace } = useFieldArray({
    control: methods.control,
    name: "returns"
  });

  // Load Data
  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      employeeRepository.getAll(companyId),
      issueRepository.getAll(companyId),
      productRepository.getAll(companyId)
    ]).then(([empData, issueData, prodData]) => {
      setEmployees(empData.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '')));
      setAllActiveIssues(issueData.filter(i => i.status !== 'CLOSED'));
      setProducts(prodData.sort((a, b) => a.name.localeCompare(b.name)));
    }).catch(err => {
      console.error("Failed to load return page data", err);
    });
  }, [companyId]);

  // Derive employees with issues
  const employeesWithIssues = useMemo(() => {
    const empIdsWithIssues = new Set(allActiveIssues.map(i => i.employeeId));
    const validEmps = employees.filter(e => empIdsWithIssues.has(e.id));
    
    // Add fallback for deleted/unknown employees that still have active issues
    const validEmpIds = new Set(validEmps.map(e => e.id));
    allActiveIssues.forEach(issue => {
      if (!validEmpIds.has(issue.employeeId)) {
        validEmps.push({
          id: issue.employeeId,
          firstName: 'Unknown/Deleted',
          lastName: 'Employee',
          role: 'Unknown'
        });
        validEmpIds.add(issue.employeeId);
      }
    });
    return validEmps;
  }, [employees, allActiveIssues]);

  // Filter issues for selected employee
  const issues = useMemo(() => {
    return allActiveIssues.filter(i => i.employeeId === selectedEmpId);
  }, [allActiveIssues, selectedEmpId]);

  // Reset or auto-select issue if employee changes
  useEffect(() => {
    if (issues.length === 1) {
      setSelectedIssueId(issues[0].id!);
    } else {
      setSelectedIssueId('');
    }
  }, [selectedEmpId, issues]);

  // Populate Form when Issue Selected
  useEffect(() => {
    const issue = issues.find(i => i.id === selectedIssueId);
    if (issue) {
      const sortedItems = [...issue.items].sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
      replace(sortedItems.map(item => ({
        productId: item.productId,
        returnQty: 0
      })));
    } else {
      replace([]);
    }
  }, [selectedIssueId, issues, replace]);

  // Submit Linked Return
  const onSubmitLinked = async (data: any) => {
    if (!companyId || !user || !selectedIssueId) return;

    const hasAnyReturn = data.returns.some((r: any) => Number(r.returnQty) > 0);
    if (!hasAnyReturn) {
      toast.error("Please enter a return quantity greater than 0 for at least one item.");
      return;
    }

    try {
      setIsSaving(true);
      await issueRepository.returnItems(selectedIssueId, data.returns, companyId, user.uid);
      toast.success("Materials returned successfully and restocked!");
      navigate('/products');
    } catch (error: any) {
      toast.error(error.message || "Failed to return materials");
    } finally {
      setIsSaving(false);
    }
  };

  // Direct Return Handlers
  const addDirectRow = () => {
    setDirectItems(prev => [
      ...prev,
      {
        id: `row_${Date.now()}_${prev.length + 1}`,
        productId: '',
        productName: '',
        sku: '',
        unit: '',
        currentStock: 0,
        returnQty: ''
      }
    ]);
  };

  const removeDirectRow = (id: string) => {
    if (directItems.length <= 1) {
      setDirectItems([{
        id: `row_${Date.now()}`,
        productId: '',
        productName: '',
        sku: '',
        unit: '',
        currentStock: 0,
        returnQty: ''
      }]);
      return;
    }
    setDirectItems(prev => prev.filter(item => item.id !== id));
  };

  const updateDirectProduct = (rowId: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    setDirectItems(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      if (!prod) {
        return {
          ...row,
          productId: '',
          productName: '',
          sku: '',
          unit: '',
          currentStock: 0,
          returnQty: ''
        };
      }
      return {
        ...row,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku || '',
        unit: prod.unit || '',
        currentStock: prod.currentStock || 0,
        returnQty: row.returnQty === '' ? 1 : row.returnQty
      };
    }));
  };

  const updateDirectQty = (rowId: string, qty: string) => {
    const val = qty === '' ? '' : parseFloat(qty);
    setDirectItems(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      return { ...row, returnQty: val };
    }));
  };

  // Submit Direct Return (Without Issue)
  const onSubmitDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user) return;

    // Filter valid rows
    const validRows = directItems.filter(r => r.productId && Number(r.returnQty) > 0);
    if (validRows.length === 0) {
      toast.error("Please select at least one product and enter a return quantity greater than 0.");
      return;
    }

    try {
      setIsSaving(true);
      await issueRepository.returnDirectItems({
        employeeId: directEmpId || 'UNLINKED',
        items: validRows.map(r => ({
          productId: r.productId,
          productName: r.productName,
          sku: r.sku,
          unit: r.unit,
          returnQty: Number(r.returnQty)
        })),
        notes: directNotes.trim()
      }, companyId, user.uid);

      toast.success("Direct return processed successfully and inventory restocked!");
      navigate('/products');
    } catch (error: any) {
      toast.error(error.message || "Failed to process direct return");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedIssue = issues.find(i => i.id === selectedIssueId);

  return (
    <PageContainer>
      <div className="mb-[var(--spacing-md)]">
        <AppButton variant="ghost" size="sm" onClick={() => navigate('/products')} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </AppButton>
      </div>

      <PageHeader 
        title="Return Materials" 
        description="Process unused materials returned by technicians to restock inventory." 
      />

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-muted/60 rounded-xl max-w-md border border-border">
        <button
          type="button"
          onClick={() => setReturnMode('ISSUE')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer",
            returnMode === 'ISSUE'
              ? "bg-card text-foreground shadow-sm font-semibold border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <RotateCcw className="h-4 w-4 text-primary" />
          <span>From Active Issue</span>
        </button>
        <button
          type="button"
          onClick={() => setReturnMode('DIRECT')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer",
            returnMode === 'DIRECT'
              ? "bg-card text-foreground shadow-sm font-semibold border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PlusCircle className="h-4 w-4 text-primary" />
          <span>Direct Return (Without Issue)</span>
        </button>
      </div>

      {/* TAB 1: FROM ACTIVE ISSUE */}
      {returnMode === 'ISSUE' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-card rounded-xl p-6 border border-border shadow-sm">
            <div>
              <label className="text-sm font-medium leading-none mb-2 block">1. Select Technician</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
              >
                <option value="">{employeesWithIssues.length > 0 ? 'Choose technician...' : 'No active returns pending'}</option>
                {employeesWithIssues.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.role})</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium leading-none mb-2 block">2. Select Active Issue</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedIssueId}
                onChange={e => setSelectedIssueId(e.target.value)}
                disabled={!selectedEmpId || issues.length === 0}
              >
                <option value="">{issues.length > 0 ? 'Choose an issue...' : 'No active issues found'}</option>
                {issues.map(i => {
                  const dateObj = new Date((i.createdAt as any)?.toDate ? (i.createdAt as any).toDate() : (i.createdAt || i.issueDate));
                  return (
                    <option key={i.id} value={i.id!}>
                      Issue {i.id?.slice(-6)} - {dateObj.toLocaleDateString('en-IN')} {dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Prompt to switch to Direct Return if no active issues */}
          {selectedEmpId && issues.length === 0 && (
            <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground text-sm">No active issues found for this technician.</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    If they are returning extra, unissued, or untracked materials, you can return them directly to restock your inventory.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReturnMode('DIRECT');
                  setDirectEmpId(selectedEmpId);
                }}
                className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shrink-0 shadow-sm"
              >
                Return Without Issue &rarr;
              </button>
            </div>
          )}

          {selectedIssue && (
            <FormProvider {...methods}>
              <AppForm onSubmit={methods.handleSubmit(onSubmitLinked)}>
                <FormSection title="Items to Return" description="Enter the quantity the technician is returning. The remaining quantity will be marked as Used.">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
                        <tr>
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium text-center">Qty Issued</th>
                          <th className="px-4 py-3 font-medium text-center">Already Returned</th>
                          <th className="px-4 py-3 font-medium text-center">Max Returnable</th>
                          <th className="px-4 py-3 font-medium w-40">Return Qty Now</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => {
                          const item = selectedIssue.items.find(i => i.productId === field.productId);
                          if (!item) return null;
                          const maxReturnable = item.issuedQty - item.returnedQty;

                          return (
                            <tr key={field.id} className="border-b border-border">
                              <td className="px-4 py-3 font-medium">
                                {item.productName}
                              </td>
                              <td className="px-4 py-3 text-center">{item.issuedQty} <span className="text-xs text-muted-foreground">{item.unit || ''}</span></td>
                              <td className="px-4 py-3 text-center text-muted-foreground">{item.returnedQty} <span className="text-xs">{item.unit || ''}</span></td>
                              <td className="px-4 py-3 text-center font-semibold text-[hsl(var(--success))]">{maxReturnable} <span className="text-xs">{item.unit || ''}</span></td>
                              <td className="px-2 py-2">
                                <div className="relative flex items-center">
                                  <AppInput 
                                    type="number" 
                                    step="any" 
                                    max={maxReturnable}
                                    min={0}
                                    {...methods.register(`returns.${index}.returnQty` as const)} 
                                    disabled={maxReturnable <= 0}
                                    className="pr-10"
                                  />
                                  {item.unit && (
                                    <span className="absolute right-2 pointer-events-none text-xs text-muted-foreground font-semibold">
                                      {item.unit}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </FormSection>
                
                <FormActions>
                  <AppButton type="button" variant="outline" onClick={() => navigate('/products')} disabled={isSaving}>Cancel</AppButton>
                  <AppButton type="submit" disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Processing...' : 'Confirm Return & Restock'}
                  </AppButton>
                </FormActions>
              </AppForm>
            </FormProvider>
          )}
        </>
      )}

      {/* TAB 2: DIRECT RETURN (WITHOUT ISSUE) */}
      {returnMode === 'DIRECT' && (
        <form onSubmit={onSubmitDirect} className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <PackageCheck className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Direct / Unissued Return</h3>
                <p className="text-xs text-muted-foreground">Return materials back to warehouse inventory without needing a prior issue record.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium leading-none mb-2 block">Technician / Employee (Optional)</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={directEmpId}
                  onChange={e => setDirectEmpId(e.target.value)}
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
                <label className="text-sm font-medium leading-none mb-2 block">Reason / Return Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Leftover material from project, surplus, customer return..."
                  value={directNotes}
                  onChange={e => setDirectNotes(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Direct Items List */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Materials to Restock</h4>
                <p className="text-xs text-muted-foreground">Search and select any product from your catalog to restock.</p>
              </div>
              <button
                type="button"
                onClick={addDirectRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Another Product
              </button>
            </div>

            <div className="overflow-visible min-h-[340px]">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
                  <tr>
                    <th className="px-4 py-3 font-medium min-w-[280px]">Select Product</th>
                    <th className="px-4 py-3 font-medium text-center w-28">Current Stock</th>
                    <th className="px-4 py-3 font-medium text-center w-36">Return Qty</th>
                    <th className="px-4 py-3 font-medium text-center w-20">Unit</th>
                    <th className="px-4 py-3 font-medium text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {directItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors relative focus-within:z-40">
                      <td className="px-3 py-2.5 relative">
                        <ProductSearchSelect
                          products={products}
                          value={item.productId}
                          onChange={(prodId) => updateDirectProduct(item.id, prodId)}
                          placeholder="Type product name or SKU..."
                        />
                      </td>

                      <td className="px-3 py-2.5 text-center text-muted-foreground font-mono">
                        {item.productId ? (
                          <span>{item.currentStock}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">-</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            placeholder="0"
                            value={item.returnQty}
                            onChange={(e) => updateDirectQty(item.id, e.target.value)}
                            disabled={!item.productId}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-center font-semibold text-xs text-muted-foreground">
                        {item.unit || '-'}
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeDirectRow(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={addDirectRow}
                className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> + Add Another Item
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <AppButton type="button" variant="outline" onClick={() => navigate('/products')} disabled={isSaving}>
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Restocking...' : 'Confirm Return & Restock Inventory'}
            </AppButton>
          </div>
        </form>
      )}
    </PageContainer>
  );
}
