import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Plus, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { printMaterialReceipt } from '../utils/printMaterialReceipt';

import { useAuthStore } from "../../../store/authStore";
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { productRepository } from '../../../repositories/ProductRepository';
import { issueRepository } from '../../../repositories/IssueRepository';
import { offlineSyncService } from '../../offline/services/offlineSyncService';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppForm } from '../../../shared/forms/FormLayout';
import { FormSection } from '../../../shared/forms/FormSection';
import { FormField } from '../../../shared/forms/FormField';
import { AppInput } from '../../../shared/forms/AppInput';
import { AppButton } from '../../../shared/app/AppButton';
import { ProductSearchSelect } from '../../../shared/forms/ProductSearchSelect';
import { EmployeeSearchSelect } from '../../../shared/forms/EmployeeSearchSelect';

const itemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  issuedQty: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
});

const issueSchema = z.object({
  employeeName: z.string().min(1, 'Employee is required'),
  additionalTechnicians: z.array(z.object({ name: z.string().min(1, "Name is required") })).optional(),
  siteName: z.string().optional(),
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
  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  const methods = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema) as any,
    defaultValues: {
      employeeName: '',
      additionalTechnicians: [],
      siteName: '',
      issueDate: new Date().toISOString().split('T')[0],
      items: [{ productId: '', issuedQty: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "items"
  });

  const { fields: techFields, append: appendTech, remove: removeTech } = useFieldArray({
    control: methods.control,
    name: "additionalTechnicians"
  });

  const watchedItems = methods.watch("items");

  useEffect(() => {
    if (!companyId) return;
    const loadData = async () => {
      try {
        const [empData, prodData] = await Promise.all([
          employeeRepository.getAll(companyId),
          productRepository.getAll(companyId)
        ]);
        const activeEmps = empData.filter(e => e.status === 'ACTIVE');
        const activeProds = prodData.filter(p => !p.status || p.status.toLowerCase() === 'active');
        setEmployees(activeEmps);
        setProducts(activeProds);
        offlineSyncService.cacheCatalog(companyId, { employees: activeEmps, products: activeProds });
      } catch (err) {
        console.warn('Network error loading live catalog, checking offline cache...', err);
        const cached = offlineSyncService.getCachedCatalog(companyId);
        if (cached.products.length > 0 || cached.employees.length > 0) {
          setEmployees(cached.employees);
          setProducts(cached.products);
          toast.info('⚡ Offline Mode: Loaded cached products and technicians');
        }
      }
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
        const unit = prod?.unitId || (prod as any)?.unit || 'pcs';
        return {
          productId: item.productId,
          productName: prod?.name || 'Unknown',
          sku: prod?.sku || '',
          unit: unit,
          issuedQty: Number(item.issuedQty),
          returnedQty: 0,
          usedQty: Number(item.issuedQty)
        };
      });

      const payload = {
        companyId,
        employeeId: finalEmployeeId,
        additionalTechnicians: data.additionalTechnicians?.map(t => t.name) || [],
        siteName: data.siteName || '',
        issueDate: new Date(data.issueDate),
        notes: data.notes,
        items: enrichedItems,
      };

      const receiptData = {
        id: 'OFFLINE_TEMP',
        type: 'ISSUE' as const,
        issueNumber: 'OFFLINE',
        date: new Date(data.issueDate),
        staffName: user?.fullName || 'Store Keeper',
        customerOrTech: data.employeeName,
        siteName: data.siteName,
        additionalTechnicians: data.additionalTechnicians?.map(t => t.name),
        notes: data.notes,
        items: enrichedItems.map(item => ({
          name: item.productName,
          sku: item.sku || '-',
          qty: item.issuedQty,
          unit: item.unit
        }))
      };

      // 1. Proactive Offline check
      if (!navigator.onLine) {
        const pendingSlip = offlineSyncService.savePendingSlip({
          type: 'MATERIAL_ISSUE',
          title: `Material Issue to ${data.employeeName}`,
          companyId,
          userId: user.uid,
          staffName: user?.fullName || 'Store Keeper',
          customerOrTech: data.employeeName,
          siteName: data.siteName,
          itemsSummary: enrichedItems.map(i => `${i.productName} (x${i.issuedQty} ${i.unit})`).join(', '),
          itemCount: enrichedItems.length,
          payload,
          receiptData
        });

        setIssuedId(pendingSlip.id);
        setIssuedCode(pendingSlip.slipCode);
        toast.success(`⚡ Emergency Offline Mode: Slip ${pendingSlip.slipCode} saved! It will sync when internet returns.`, {
          duration: 6000
        });
        return;
      }

      const newId = await issueRepository.issueItems(payload, user.uid);
      const generatedCode = (payload as any).issueNumber || null;
      setIssuedId(newId);
      setIssuedCode(generatedCode);
      toast.success(generatedCode ? `Materials issued successfully (${generatedCode})` : "Materials issued successfully");
    } catch (error: any) {
      // 2. Fallback to offline if submission fails due to network drop
      if (!navigator.onLine || error.message?.includes('offline') || error.message?.includes('network') || error.code === 'unavailable') {
        const enrichedItems = data.items.map(item => {
          const prod = products.find(p => p.id === item.productId);
          const unit = prod?.unitId || (prod as any)?.unit || 'pcs';
          return {
            productId: item.productId,
            productName: prod?.name || 'Unknown',
            sku: prod?.sku || '',
            unit: unit,
            issuedQty: Number(item.issuedQty),
            returnedQty: 0,
            usedQty: Number(item.issuedQty)
          };
        });

        const pendingSlip = offlineSyncService.savePendingSlip({
          type: 'MATERIAL_ISSUE',
          title: `Material Issue to ${data.employeeName}`,
          companyId: companyId!,
          userId: user.uid,
          staffName: user?.fullName || 'Store Keeper',
          customerOrTech: data.employeeName,
          siteName: data.siteName,
          itemsSummary: enrichedItems.map(i => `${i.productName} (x${i.issuedQty} ${i.unit})`).join(', '),
          itemCount: enrichedItems.length,
          payload: {
            companyId,
            employeeId: 'OFFLINE_EMP',
            additionalTechnicians: data.additionalTechnicians?.map(t => t.name) || [],
            siteName: data.siteName || '',
            issueDate: new Date(data.issueDate),
            notes: data.notes,
            items: enrichedItems,
          },
          receiptData: {
            id: 'OFFLINE_TEMP',
            type: 'ISSUE' as const,
            issueNumber: 'OFFLINE',
            date: new Date(data.issueDate),
            staffName: user?.fullName || 'Store Keeper',
            customerOrTech: data.employeeName,
            siteName: data.siteName,
            notes: data.notes,
            items: enrichedItems.map(i => ({ name: i.productName, sku: i.sku || '-', qty: i.issuedQty, unit: i.unit }))
          }
        });

        setIssuedId(pendingSlip.id);
        setIssuedCode(pendingSlip.slipCode);
        toast.success(`⚡ Offline Mode Activated: Slip ${pendingSlip.slipCode} saved safely. 1-Click Sync available when back online.`, {
          duration: 6000
        });
        return;
      }

      console.error(error);
      toast.error(error.message || "Failed to issue materials");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const empName = methods.getValues().employeeName;
    const selectedEmp = employees.find(e => `${e.firstName} ${e.lastName}`.toLowerCase() === empName.toLowerCase().trim());
    printMaterialReceipt(
      {
        id: issuedId || '',
        type: 'ISSUE',
        issueNumber: issuedCode || issuedId || undefined,
        date: methods.getValues().issueDate || new Date(),
        staffName: user?.fullName || 'Store Keeper',
        customerOrTech: `${selectedEmp?.firstName || ''} ${selectedEmp?.lastName || ''}`.trim() || empName,
        employeeRole: selectedEmp?.role,
        siteName: methods.getValues().siteName,
        additionalTechnicians: methods.getValues().additionalTechnicians?.map(t => t.name),
        notes: methods.getValues().notes,
        items: watchedItems.map(item => {
          const prod = products.find(p => p.id === item.productId);
          return {
            name: prod?.name || 'Item',
            sku: prod?.sku || '-',
            qty: Number(item.issuedQty) || 0,
            unit: prod?.unitId || (prod as any)?.unit || 'pcs'
          };
        })
      },
      company?.companyName || 'CRYODEAL'
    );
  };

  if (issuedId) {
    const empName = methods.getValues().employeeName;
    const selectedEmp = employees.find(e => `${e.firstName} ${e.lastName}`.toLowerCase() === empName.toLowerCase().trim());
    return (
      <PageContainer>
        <div className="max-w-2xl mx-auto my-8 p-8 border border-border rounded-xl shadow-lg bg-card text-card-foreground">
          <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
             <div>
                <h2 className="text-2xl font-bold">Material Issue Receipt</h2>
                <p className="text-sm text-muted-foreground">CRYO DEAL Store & Inventory Management</p>
             </div>
             <div className="text-right">
                <p className="text-sm font-semibold text-primary">{issuedCode || `CRYO-ISSUE-${issuedId.slice(0, 6)}`}</p>
                <p className="text-xs text-muted-foreground">{new Date(methods.getValues().issueDate).toLocaleDateString()}</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
             <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Issued To</p>
                <p className="font-bold text-base">{empName}</p>
                <p className="text-muted-foreground">{selectedEmp?.role || 'Technician'}</p>
             </div>
             <div className="text-right">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Issued By</p>
                <p className="font-bold text-base">{user?.fullName || 'Store Keeper'}</p>
                <p className="text-muted-foreground">Store Operations</p>
             </div>
          </div>

          {methods.getValues().siteName && (
             <div className="mb-6 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Destination Site</p>
                <p className="font-medium">{methods.getValues().siteName}</p>
             </div>
          )}

          {methods.getValues().additionalTechnicians && methods.getValues().additionalTechnicians!.length > 0 && (
             <div className="mb-6 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Additional Technicians Assigned</p>
                <p className="font-medium text-sm">
                  {methods.getValues().additionalTechnicians?.map(t => t.name).join(', ')}
                </p>
             </div>
          )}

          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 text-muted-foreground font-semibold">Item</th>
                <th className="py-2 text-right text-muted-foreground font-semibold">Qty</th>
              </tr>
            </thead>
            <tbody>
              {watchedItems.map((item, index) => {
                const prod = products.find(p => p.id === item.productId);
                return (
                  <tr key={index} className="border-b border-border/50">
                    <td className="py-2">{prod?.name || 'Item'}</td>
                    <td className="py-2 text-right font-medium">
                      {item.issuedQty} {prod?.unitId || (prod as any)?.unit || 'pcs'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {methods.getValues().notes && (
             <div className="mb-8 p-3 bg-muted/30 rounded-lg text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Notes</p>
                <p className="italic text-muted-foreground">{methods.getValues().notes}</p>
             </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-12 pt-4 border-t border-border text-center text-xs">
             <div>
                <p className="border-b border-dashed border-foreground/40 w-32 mx-auto mb-2"></p>
                <p className="font-medium">Store Keeper Signature</p>
             </div>
             <div>
                <p className="border-b border-dashed border-foreground/40 w-32 mx-auto mb-2"></p>
                <p className="font-medium">Technician Signature</p>
             </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 print:hidden">
             <AppButton onClick={() => setIssuedId(null)} variant="outline">Issue More Materials</AppButton>
             <AppButton onClick={handlePrint}><Printer className="h-4 w-4 mr-2"/> Print Receipt</AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-[var(--spacing-md)]">
        <AppButton variant="ghost" size="sm" onClick={() => navigate('/products')} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </AppButton>
      </div>

      <PageHeader 
        title="Issue Materials" 
        description="Assign tools and products from inventory to a technician." 
      />

      <FormProvider {...methods}>
        <AppForm onSubmit={methods.handleSubmit(onSubmit)} className="max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Items (Span 2) */}
            <div className="lg:col-span-2 space-y-6">
              <FormSection title="Items to Issue" description="Select products and quantities.">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Line Items</p>
                  <AppButton type="button" variant="secondary" size="sm" onClick={() => append({ productId: '', issuedQty: 1 })} className="shadow-sm">
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                  </AppButton>
                </div>

                <div className="overflow-visible">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
                      <tr>
                        <th className="px-3 py-3 font-medium text-left w-[50%]">Product</th>
                        <th className="px-3 py-3 font-medium text-center w-[15%] whitespace-nowrap">Current Stock</th>
                        <th className="px-3 py-3 font-medium text-center w-[18%] whitespace-nowrap">Qty to Issue</th>
                        <th className="px-3 py-3 font-medium text-center w-[12%] whitespace-nowrap">Remaining</th>
                        <th className="px-2 py-3 font-medium text-center w-[5%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const wItem = watchedItems[index];
                        const prod = products.find(p => p.id === wItem?.productId);
                        const unit = prod ? (prod.unitId || (prod as any).unit || 'pcs') : '';
                        const currentStock = prod ? Number(prod.currentStock) || 0 : 0;
                        const qtyVal = Number(wItem?.issuedQty) || 0;
                        const remaining = prod ? Math.round((currentStock - qtyVal) * 10000) / 10000 : null;
                        const error = methods.formState.errors.items?.[index]?.productId;
                        return (
                          <tr key={field.id} className="border-b border-border hover:bg-muted/10 transition-colors relative focus-within:z-40">
                            <td className="p-2 relative">
                              <ProductSearchSelect
                                value={wItem?.productId || ''}
                                onChange={(prodId) => methods.setValue(`items.${index}.productId`, prodId, { shouldValidate: true })}
                                products={products}
                                error={!!error}
                                placeholder="Type to search product or SKU..."
                              />
                              {prod && (
                                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap px-1">
                                  <span className="font-semibold text-foreground">{prod.name}</span>
                                  {prod.sku && (
                                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border/50 text-[10px]">
                                      SKU: {prod.sku}
                                    </span>
                                  )}
                                  {prod.brandId && prod.brandId !== 'general' && (
                                    <span className="text-[11px] text-muted-foreground">
                                      Brand: <span className="font-medium text-foreground capitalize">{prod.brandId}</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 font-medium text-center">
                              {prod ? (
                                <span className={currentStock > 0 ? "text-[hsl(var(--success))] font-bold" : "text-[hsl(var(--destructive))] font-bold"}>
                                  {currentStock} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60">-</span>
                              )}
                            </td>
                            <td className="p-2">
                              <div className="relative flex items-center w-full min-w-[100px] max-w-[140px] mx-auto">
                                <input 
                                  type="number" 
                                  step="any" 
                                  min="0.01" 
                                  {...methods.register(`items.${index}.issuedQty` as const)} 
                                  className="w-full h-10 rounded-lg border border-input bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-semibold text-foreground pl-3 pr-12 shadow-xs transition-all outline-none text-center" 
                                  placeholder="1" 
                                />
                                {unit && (
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-medium text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded border border-border/50 select-none">
                                    {unit}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {prod ? (
                                <span className={`text-xs font-semibold px-2 py-1 rounded inline-block ${remaining !== null && remaining < 0 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                  {remaining} {unit}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60">-</span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              {fields.length > 1 && (
                                <AppButton 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => remove(index)} 
                                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </AppButton>
                              )}
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

              <FormSection title="Additional Notes" description="Any special instructions for the technician.">
                <FormField label="Site Name (Optional)" error={methods.formState.errors.siteName?.message}>
                  <AppInput placeholder="e.g. Building A, Floor 2" {...methods.register('siteName')} />
                </FormField>
                <FormField label="Notes / Remarks" error={methods.formState.errors.notes?.message}>
                  <textarea className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent hover:bg-muted/10 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors" {...methods.register('notes')} placeholder="e.g. For AC Installation..."></textarea>
                </FormField>
              </FormSection>
            </div>

            {/* Right Column: Transaction Details & Submit */}
            <div className="space-y-6">
              <FormSection title="Transaction Details" description="Select the employee receiving the items.">
                <div className="space-y-4">
                  <FormField label="Technician / Employee" required error={methods.formState.errors.employeeName?.message}>
                    <EmployeeSearchSelect
                      value={methods.watch('employeeName')}
                      onChange={(empName) => methods.setValue('employeeName', empName, { shouldValidate: true })}
                      employees={employees}
                      error={!!methods.formState.errors.employeeName}
                      placeholder="Type name to select or create..."
                    />
                  </FormField>
                  
                  {techFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <div className="flex-1">
                        <FormField label={`Additional Technician ${index + 1}`}>
                          <EmployeeSearchSelect
                            value={methods.watch(`additionalTechnicians.${index}.name`)}
                            onChange={(empName) => methods.setValue(`additionalTechnicians.${index}.name`, empName, { shouldValidate: true })}
                            employees={employees}
                            placeholder="Type name..."
                          />
                        </FormField>
                      </div>
                      <AppButton type="button" variant="ghost" size="icon" onClick={() => removeTech(index)} className="text-[hsl(var(--destructive))] mb-2">
                        <Trash2 className="h-4 w-4" />
                      </AppButton>
                    </div>
                  ))}

                  <AppButton type="button" variant="outline" size="sm" onClick={() => appendTech({ name: '' })} className="w-full text-xs border-dashed">
                    <Plus className="h-4 w-4 mr-2" /> Add Additional Technician
                  </AppButton>

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
                <AppButton type="button" variant="ghost" onClick={() => navigate('/products')} disabled={isSaving} className="w-full text-muted-foreground">
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
