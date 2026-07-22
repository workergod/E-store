import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Plus, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { productRepository } from '../../../repositories/ProductRepository';
import { issueRepository } from '../../../repositories/IssueRepository';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppForm, FormActions, FormRow } from '../../../shared/forms/FormLayout';
import { FormSection } from '../../../shared/forms/FormSection';
import { FormField } from '../../../shared/forms/FormField';
import { AppInput } from '../../../shared/forms/AppInput';
import { AppButton } from '../../../shared/app/AppButton';

const itemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  issuedQty: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
});

const issueSchema = z.object({
  employeeName: z.string().min(1, 'Employee is required'),
  issueDate: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item')
});

type IssueFormData = z.infer<typeof issueSchema>;

export default function IssueMaterialsPage() {
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [issuedId, setIssuedId] = useState<string | null>(null);

  const methods = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema) as any,
    defaultValues: {
      employeeName: '',
      issueDate: new Date().toISOString().split('T')[0],
      items: [{ productId: '', issuedQty: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "items"
  });

  const watchedItems = methods.watch("items");

  useEffect(() => {
    if (!companyId) return;
    const loadData = async () => {
      const [empData, prodData] = await Promise.all([
        employeeRepository.getAll(companyId),
        productRepository.getAll(companyId)
      ]);
      setEmployees(empData.filter(e => e.status === 'ACTIVE'));
      setProducts(prodData.filter(p => p.status === 'Active'));
    };
    loadData();
  }, [companyId]);

  const onSubmit = async (data: IssueFormData) => {
    if (!companyId || !user) return;
    try {
      setIsSaving(true);

      // Find or create employee
      let finalEmployeeId = '';
      const existingEmp = employees.find(e => `${e.firstName} ${e.lastName}`.toLowerCase() === data.employeeName.toLowerCase().trim());
      
      if (existingEmp) {
        finalEmployeeId = existingEmp.id;
      } else {
        // Create new employee
        const nameParts = data.employeeName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';
        
        finalEmployeeId = await employeeRepository.create({
          companyId,
          firstName,
          lastName,
          
          status: 'ACTIVE',
          role: 'Technician',
          mobile: 'N/A',
          createdBy: user.uid,
          joiningDate: new Date(),
        }, user.uid);
        
        // Refresh local list just in case
        setEmployees(prev => [...prev, { id: finalEmployeeId, firstName, lastName, role: 'Technician', status: 'ACTIVE' }]);
      }
      
      const enrichedItems = data.items.map(item => {
        const prod = products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          productName: prod?.name || 'Unknown',
          sku: prod?.sku || '',
          issuedQty: item.issuedQty,
          returnedQty: 0,
          usedQty: item.issuedQty
        };
      });

      const payload = {
        companyId,
        employeeId: finalEmployeeId,
        issueDate: new Date(data.issueDate),
        notes: data.notes,
        items: enrichedItems,
      };

      const newId = await issueRepository.issueItems(payload, user.uid);
      toast.success("Materials issued successfully");
      setIssuedId(newId);
    } catch (error: any) {
      toast.error(error.message || "Failed to issue materials");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (issuedId) {
    const empName = methods.getValues().employeeName;
    const selectedEmp = employees.find(e => `${e.firstName} ${e.lastName}`.toLowerCase() === empName.toLowerCase().trim());
    return (
      <PageContainer>
        <div className="max-w-3xl mx-auto bg-card rounded-xl shadow-lg border border-border print:shadow-none print:border-none print:w-full overflow-hidden">
          {/* Header */}
          <div className="bg-primary/10 p-8 border-b-4 border-primary flex justify-between items-center print:bg-primary/10 print:border-primary print:break-inside-avoid">
            <div>
              <h2 className="text-3xl font-black text-primary tracking-tight uppercase">Material Issue</h2>
              <p className="text-sm font-medium text-muted-foreground mt-1 tracking-widest">OFFICIAL RECEIPT</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Transaction ID</p>
              <p className="font-mono text-sm font-semibold">{issuedId}</p>
            </div>
          </div>
          
          <div className="p-8 print:p-4">
            <div className="grid grid-cols-2 gap-6 mb-10 text-sm bg-muted/20 p-6 rounded-lg border border-border print:bg-transparent">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Issued To</p>
                <p className="font-bold text-lg text-foreground">{selectedEmp?.firstName} {selectedEmp?.lastName}</p>
                <p className="text-muted-foreground font-medium">{selectedEmp?.role} {selectedEmp?.department ? `• ${selectedEmp.department}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Issue Date</p>
                <p className="font-bold text-lg text-foreground">{new Date(methods.getValues().issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            <table className="w-full text-sm text-left border-collapse mb-10">
              <thead className="bg-primary text-primary-foreground print:bg-primary print:text-white">
                <tr>
                  <th className="px-5 py-4 font-bold rounded-tl-lg">Product Description</th>
                  <th className="px-5 py-4 font-bold">SKU</th>
                  <th className="px-5 py-4 font-bold text-right rounded-tr-lg">Qty Issued</th>
                </tr>
              </thead>
              <tbody>
                {watchedItems.map((item, idx) => {
                  const prod = products.find(p => p.id === item.productId);
                  return (
                    <tr key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 font-medium text-foreground">{prod?.name}</td>
                      <td className="px-5 py-4 text-muted-foreground font-mono text-xs">{prod?.sku}</td>
                      <td className="px-5 py-4 text-right font-black text-primary text-lg">{item.issuedQty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {methods.getValues().notes && (
              <div className="mb-10 p-5 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-lg">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-black uppercase mb-2 tracking-wider">Additional Notes</p>
                <p className="text-sm font-medium">{methods.getValues().notes}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-16 mt-16 text-center text-sm">
              <div className="flex flex-col items-center">
                <div className="border-b-2 border-dashed border-border w-56 mb-3"></div>
                <p className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Issued By</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="border-b-2 border-dashed border-border w-56 mb-3"></div>
                <p className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Received By (Signature)</p>
              </div>
            </div>

            <div className="mt-16 flex justify-center gap-4 print:hidden">
               <AppButton onClick={() => setIssuedId(null)} variant="outline" size="lg">Issue More Materials</AppButton>
               <AppButton onClick={handlePrint} size="lg"><Printer className="h-5 w-5 mr-2"/> Print Receipt</AppButton>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-[var(--spacing-md)]">
        <AppButton variant="ghost" size="sm" onClick={() => navigate('/inventory')} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </AppButton>
      </div>

      <PageHeader 
        title="Issue Materials" 
        description="Assign tools and products from inventory to a technician." 
      />

      <FormProvider {...methods}>
        <AppForm onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Items */}
            <div className="lg:col-span-2 space-y-6">
              <FormSection title="Items to Issue" description="Select products and quantities. Stock will be immediately deducted.">
                <div className="flex justify-end mb-4">
                  <AppButton type="button" variant="outline" size="sm" onClick={() => append({ productId: '', issuedQty: 1 })}>
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                  </AppButton>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
                      <tr>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium w-32">Current Stock</th>
                        <th className="px-4 py-3 font-medium w-32">Qty to Issue</th>
                        <th className="px-4 py-3 font-medium w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const wItem = watchedItems[index];
                        const prod = products.find(p => p.id === wItem?.productId);
                        return (
                          <tr key={field.id} className="border-b border-border">
                            <td className="px-2 py-2">
                              <select {...methods.register(`items.${index}.productId` as const)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm">
                                <option value="">Select Product...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2 font-medium">
                              {prod ? (
                                <span className={prod.currentStock > 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]"}>
                                  {prod.currentStock}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-2 py-2">
                              <AppInput type="number" step="0.01" {...methods.register(`items.${index}.issuedQty` as const)} />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <AppButton type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))]">
                                <Trash2 className="h-4 w-4" />
                              </AppButton>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-xs text-[hsl(var(--destructive))]">
                   {methods.formState.errors.items?.message}
                </div>
              </FormSection>

              <FormSection title="Additional Notes" description="Any special instructions or job reference numbers.">
                <FormField label="Notes" error={methods.formState.errors.notes?.message}>
                  <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...methods.register('notes')} placeholder="e.g. For AC Installation at Building 4..."></textarea>
                </FormField>
              </FormSection>
            </div>

            {/* Right Column: Transaction Details & Submit */}
            <div className="space-y-6">
              <FormSection title="Transaction Details" description="Select the employee receiving the items.">
                <div className="space-y-4">
                  <FormField label="Technician / Employee" required error={methods.formState.errors.employeeName?.message}>
                    <AppInput 
                      list="employees-list" 
                      placeholder="Type name to select or create..." 
                      {...methods.register('employeeName')} 
                    />
                    <datalist id="employees-list">
                      {employees.map(e => (
                        <option key={e.id} value={`${e.firstName} ${e.lastName}`} />
                      ))}
                    </datalist>
                  </FormField>
                  <FormField label="Date" required error={methods.formState.errors.issueDate?.message}>
                    <AppInput type="date" {...methods.register('issueDate')} />
                  </FormField>
                </div>
              </FormSection>

              <div className="bg-card rounded-xl shadow-sm border border-border p-6 sticky top-[90px]">
                <h3 className="font-semibold mb-4 text-lg border-b border-border pb-2">Summary</h3>
                <div className="flex justify-between items-center mb-6 text-sm">
                   <span className="text-muted-foreground">Total Unique Items</span>
                   <span className="font-bold text-lg text-foreground">{watchedItems.filter(i => i.productId).length}</span>
                </div>
                <AppButton type="submit" disabled={isSaving} className="w-full h-12 text-base font-semibold shadow-premium mb-3">
                  {isSaving ? 'Processing...' : 'Issue & Generate Receipt'}
                </AppButton>
                <AppButton type="button" variant="ghost" onClick={() => navigate('/inventory')} disabled={isSaving} className="w-full text-muted-foreground">
                  Cancel Transaction
                </AppButton>
              </div>
            </div>
          </div>
        </AppForm>
      </FormProvider>
    </PageContainer>
  );
}
