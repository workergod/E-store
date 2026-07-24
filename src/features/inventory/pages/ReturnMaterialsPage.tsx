import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { issueRepository } from '../../../repositories/IssueRepository';
import type { IssueTransaction } from '../../../shared/types/IssueTransaction';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppForm, FormActions } from '../../../shared/forms/FormLayout';
import { FormSection } from '../../../shared/forms/FormSection';
import { AppInput } from '../../../shared/forms/AppInput';
import { AppButton } from '../../../shared/app/AppButton';

const returnSchema = z.object({
  returns: z.array(z.object({
    productId: z.string(),
    returnQty: z.coerce.number().min(0, 'Cannot be negative')
  }))
});

export default function ReturnMaterialsPage() {
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [employees, setEmployees] = useState<any[]>([]);
  const [allActiveIssues, setAllActiveIssues] = useState<IssueTransaction[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  
  const [isSaving, setIsSaving] = useState(false);

  const methods = useForm<{ returns: { productId: string; returnQty: number }[] }>({
    resolver: zodResolver(returnSchema) as any,
    defaultValues: { returns: [] }
  });

  const { fields, replace } = useFieldArray({
    control: methods.control,
    name: "returns"
  });

  // 1. Load Data
  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      employeeRepository.getAll(companyId),
      issueRepository.getAll(companyId)
    ]).then(([empData, issueData]) => {
      setEmployees(empData);
      setAllActiveIssues(issueData.filter(i => i.status !== 'CLOSED'));
    });
  }, [companyId]);

  // 2. Derive employees with issues
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

  // 3. Filter issues for selected employee
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

  // 3. Populate Form when Issue Selected
  useEffect(() => {
    const issue = issues.find(i => i.id === selectedIssueId);
    if (issue) {
      replace(issue.items.map(item => ({
        productId: item.productId,
        returnQty: 0
      })));
    } else {
      replace([]);
    }
  }, [selectedIssueId, issues, replace]);

  const onSubmit = async (data: any) => {
    if (!companyId || !user || !selectedIssueId) return;
    try {
      setIsSaving(true);
      await issueRepository.returnItems(selectedIssueId, data.returns, companyId, user.uid);
      toast.success("Materials returned successfully");
      navigate('/products');
    } catch (error: any) {
      toast.error(error.message || "Failed to return materials");
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

      {selectedIssue && (
        <FormProvider {...methods}>
          <AppForm onSubmit={methods.handleSubmit(onSubmit)}>
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
                          <td className="px-4 py-3 text-center">{item.issuedQty}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{item.returnedQty}</td>
                          <td className="px-4 py-3 text-center font-semibold text-[hsl(var(--success))]">{maxReturnable}</td>
                          <td className="px-2 py-2">
                            <AppInput 
                              type="number" 
                              step="0.01" 
                              max={maxReturnable}
                              min={0}
                              {...methods.register(`returns.${index}.returnQty` as const)} 
                              disabled={maxReturnable <= 0}
                            />
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
    </PageContainer>
  );
}
