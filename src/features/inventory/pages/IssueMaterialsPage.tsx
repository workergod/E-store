import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Plus, Trash2, Printer, CheckCircle2, PackageMinus } from 'lucide-react';
import { toast } from 'sonner';
import { printMaterialReceipt } from '../utils/printMaterialReceipt';

import { useAuthStore } from "../../../store/authStore";
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { productRepository } from '../../../repositories/ProductRepository';
import { issueRepository } from '../../../repositories/IssueRepository';
import { offlineSyncService } from '../../offline/services/offlineSyncService';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { AppCard } from '../../../shared/app/AppCard';
import { AppInput } from '../../../shared/forms/AppInput';
import { AppButton } from '../../../shared/app/AppButton';
import { ProductSearchSelect } from '../../../shared/forms/ProductSearchSelect';

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
    const data = methods.getValues();
    const enrichedItems = data.items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      const unit = prod?.unitId || (prod as any)?.unit || 'pcs';
      return {
        name: prod?.name || 'Unknown Product',
        sku: prod?.sku || '-',
        qty: Number(item.issuedQty),
        unit: unit
      };
    });

    printMaterialReceipt({
      type: 'ISSUE',
      issueNumber: issuedCode || issuedId || 'TEMP',
      date: new Date(data.issueDate),
      staffName: user?.fullName || 'Store Keeper',
      customerOrTech: data.employeeName,
      siteName: data.siteName,
      additionalTechnicians: data.additionalTechnicians?.map(t => t.name),
      notes: data.notes,
      items: enrichedItems
    }, company?.name || 'CRYODEAL STORE & INVENTORY');
  };

  // Receipt Preview Mode
  if (issuedId) {
    const data = methods.getValues();
    const empName = data.employeeName;
    return (
      <PageContainer>
        <div className="flex justify-between items-center mb-6 print:hidden">
          <AppButton variant="ghost" onClick={() => setIssuedId(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Form
          </AppButton>
          <div className="flex gap-2">
            <AppButton onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" /> Print Receipt
            </AppButton>
            <AppButton variant="outline" onClick={() => navigate('/products')}>
              Done
            </AppButton>
          </div>
        </div>

        <div className="max-w-3xl mx-auto bg-card p-10 rounded-2xl shadow-xl border border-border print:m-0 print:p-0 print:shadow-none print:border-none print:w-full">
          <div className="text-center pb-6 border-b-2 border-border mb-6">
            <h1 className="text-3xl font-black tracking-wider uppercase text-foreground">{company?.name || 'CRYODEAL'}</h1>
            <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mt-1">STORE & INVENTORY SOLUTIONS</p>
            <div className="mt-4 inline-block bg-primary/10 text-primary border border-primary/20 px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase">
              MATERIAL ISSUE SLIP
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-8 p-4 bg-muted/40 rounded-xl border border-border">
            <div>
              <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Recipient (Technician)</p>
              <p className="font-bold text-sm text-foreground mt-0.5">{empName}</p>
              {data.additionalTechnicians && data.additionalTechnicians.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  <span className="font-medium">With:</span> {data.additionalTechnicians.map(t => t.name).join(', ')}
                </p>
              )}
              {data.siteName && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  <span className="font-semibold text-foreground">Site:</span> {data.siteName}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Reference / Date</p>
              <p className="font-mono font-bold text-sm text-primary mt-0.5">{issuedCode || `CRYO-ISSUE-${issuedId.slice(0, 6)}`}</p>
              <p className="font-medium text-foreground mt-1">{new Date(data.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <table className="w-full text-sm text-left border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-border text-xs text-muted-foreground uppercase tracking-wider bg-muted/20">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3 text-right">Qty Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((item, index) => {
                const prod = products.find(p => p.id === item.productId);
                const unit = prod?.unitId || (prod as any)?.unit || 'pcs';
                return (
                  <tr key={index}>
                    <td className="py-3 px-3 text-muted-foreground font-mono text-xs">{index + 1}</td>
                    <td className="py-3 px-3 font-semibold text-foreground">{prod?.name || 'Unknown Item'}</td>
                    <td className="py-3 px-3 text-muted-foreground font-mono text-xs">{prod?.sku || '-'}</td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">
                      {item.issuedQty} <span className="text-xs text-muted-foreground font-normal">{unit}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data.notes && (
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground mb-8">
              <span className="font-semibold text-foreground">Notes:</span> {data.notes}
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 text-center text-xs mt-12 pt-6 border-t border-border">
            <div>
              <div className="border-b border-foreground/30 w-36 mx-auto mb-2"></div>
              <p className="font-bold text-foreground">Issued By (Store)</p>
              <p className="text-[11px] text-muted-foreground">{user?.fullName || 'Store Keeper'}</p>
            </div>
            <div>
              <div className="border-b border-foreground/30 w-36 mx-auto mb-2"></div>
              <p className="font-bold text-foreground">Received By</p>
              <p className="text-[11px] text-muted-foreground">{empName}</p>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  const totalUnits = watchedItems.reduce((acc, curr) => acc + (Number(curr.issuedQty) || 0), 0);
  const selectedCount = watchedItems.filter(i => i.productId).length;

  return (
    <PageContainer>
      {/* Top Header & Fast Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <AppButton 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/products')} 
            className="-ml-3 text-muted-foreground mb-1 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Products
          </AppButton>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <PackageMinus className="h-7 w-7 text-primary" />
            Issue Materials
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Assign store inventory, products, and tools to technicians or project sites.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <AppButton
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
            disabled={isSaving}
            className="text-muted-foreground"
          >
            Cancel
          </AppButton>
          <AppButton
            type="button"
            onClick={methods.handleSubmit(onSubmit)}
            disabled={isSaving}
            className="bg-primary text-primary-foreground font-semibold shadow-xs"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isSaving ? 'Processing...' : 'Issue & Generate Receipt'}
          </AppButton>
        </div>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6 w-full">
          
          {/* SECTION 1: Transaction & Dispatch Details (Full Width Card) */}
          <AppCard className="p-5 md:p-6 border border-border shadow-xs bg-card">
            <div className="border-b border-border pb-3 mb-4">
              <h3 className="text-base font-semibold text-foreground">Transaction & Dispatch Details</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Select the recipient technician, issue date, and destination site</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Technician / Employee */}
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Technician / Employee <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <AppInput 
                    list="employees-list" 
                    placeholder="Type name to select or create..." 
                    {...methods.register('employeeName')} 
                    className="h-10 text-sm font-medium"
                  />
                  <datalist id="employees-list">
                    {employees.map(e => (
                      <option key={e.id} value={`${e.firstName} ${e.lastName}`} />
                    ))}
                  </datalist>
                </div>
                {methods.formState.errors.employeeName && (
                  <p className="text-xs text-destructive mt-1 font-medium">{methods.formState.errors.employeeName.message}</p>
                )}
              </div>

              {/* Issue Date */}
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Issue Date <span className="text-destructive">*</span>
                </label>
                <AppInput 
                  type="date" 
                  {...methods.register('issueDate')} 
                  className="h-10 text-sm font-medium"
                />
                {methods.formState.errors.issueDate && (
                  <p className="text-xs text-destructive mt-1 font-medium">{methods.formState.errors.issueDate.message}</p>
                )}
              </div>

              {/* Site / Project Location */}
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Site / Project Location <span className="text-muted-foreground text-[10px] font-normal lowercase">(optional)</span>
                </label>
                <AppInput 
                  placeholder="e.g. Building A, Floor 2 / Unit 104" 
                  {...methods.register('siteName')} 
                  className="h-10 text-sm font-medium"
                />
              </div>
            </div>

            {/* Additional Technicians row */}
            {techFields.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/60">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Additional Helping Technicians:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {techFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <AppInput 
                          list="employees-list" 
                          placeholder={`Helper #${index + 1} name...`} 
                          {...methods.register(`additionalTechnicians.${index}.name` as const)} 
                          className="h-9 text-xs"
                        />
                      </div>
                      <AppButton 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeTech(index)} 
                        className="text-muted-foreground hover:text-destructive h-9 w-9 shrink-0"
                        title="Remove helper"
                      >
                        <Trash2 className="h-4 w-4" />
                      </AppButton>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3">
              <AppButton 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => appendTech({ name: '' })} 
                className="text-xs border-dashed text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Additional Technician
              </AppButton>
            </div>
          </AppCard>

          {/* SECTION 2: Items to Issue (Full Width Table Card) */}
          <AppCard className="p-5 md:p-6 border border-border shadow-xs bg-card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-semibold text-foreground">Items to Issue</h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {fields.length} {fields.length === 1 ? 'Line Item' : 'Line Items'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select products and quantities. Live stock balances and units update automatically.
                </p>
              </div>

              <AppButton 
                type="button" 
                variant="secondary" 
                size="sm" 
                onClick={() => append({ productId: '', issuedQty: 1 })} 
                className="shadow-xs font-semibold"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Add Item
              </AppButton>
            </div>

            {/* FULL WIDTH TABLE WITHOUT SQUEEZING */}
            <div className="w-full border border-border rounded-xl overflow-hidden bg-card">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/60 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-left">Product / Material</th>
                    <th className="px-4 py-3 font-semibold text-center w-32 sm:w-36 whitespace-nowrap">Current Stock</th>
                    <th className="px-4 py-3 font-semibold text-center w-36 sm:w-44 whitespace-nowrap">Qty to Issue</th>
                    <th className="px-4 py-3 font-semibold text-center w-32 sm:w-36 whitespace-nowrap">Remaining</th>
                    <th className="px-3 py-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fields.map((field, index) => {
                    const wItem = watchedItems[index];
                    const prod = products.find(p => p.id === wItem?.productId);
                    const unit = prod ? (prod.unitId || (prod as any).unit || 'pcs') : '';
                    const currentStock = prod ? Number(prod.currentStock) || 0 : 0;
                    const qtyVal = Number(wItem?.issuedQty) || 0;
                    const remaining = prod ? Math.round((currentStock - qtyVal) * 10000) / 10000 : null;
                    const error = methods.formState.errors.items?.[index]?.productId;
                    return (
                      <tr key={field.id} className="hover:bg-muted/15 transition-colors relative focus-within:z-40">
                        {/* PRODUCT SELECTOR COLUMN - WIDE & UNCONSTRAINED */}
                        <td className="p-3 relative">
                          <ProductSearchSelect
                            value={wItem?.productId || ''}
                            onChange={(prodId) => methods.setValue(`items.${index}.productId`, prodId, { shouldValidate: true })}
                            products={products}
                            error={!!error}
                            placeholder="Type product name, SKU, or brand..."
                          />
                          {prod && (
                            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2 flex-wrap px-1">
                              <span className="font-bold text-foreground">{prod.name}</span>
                              {prod.sku && (
                                <span className="font-mono bg-muted px-2 py-0.5 rounded text-[11px] font-semibold text-foreground border border-border/60">
                                  SKU: {prod.sku}
                                </span>
                              )}
                              {prod.brandId && prod.brandId !== 'general' && (
                                <span className="text-[11px] text-muted-foreground">
                                  Brand: <span className="font-medium text-foreground capitalize">{prod.brandId}</span>
                                </span>
                              )}
                              {prod.rackLocationId && (
                                <span className="text-[11px] text-muted-foreground">
                                  Rack: <span className="font-medium text-foreground">{prod.rackLocationId}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* CURRENT STOCK */}
                        <td className="px-4 py-3 text-center">
                          {prod ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${currentStock > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                              {currentStock} <span className="text-[10px] font-medium ml-1 text-muted-foreground">{unit}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 font-medium">-</span>
                          )}
                        </td>

                        {/* QTY TO ISSUE */}
                        <td className="px-4 py-3 text-center">
                          <div className="relative flex items-center w-full max-w-[150px] mx-auto">
                            <input 
                              type="number" 
                              step="any" 
                              min="0.01" 
                              {...methods.register(`items.${index}.issuedQty` as const)} 
                              className="w-full h-10 rounded-lg border border-input bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-bold text-foreground pl-3 pr-14 text-center shadow-xs transition-all outline-none" 
                              placeholder="1" 
                            />
                            {unit && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-medium text-muted-foreground bg-muted/80 px-2 py-0.5 rounded border border-border/50 select-none">
                                {unit}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* REMAINING STOCK */}
                        <td className="px-4 py-3 text-center">
                          {prod ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${remaining !== null && remaining < 0 ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-muted text-foreground border border-border'}`}>
                              {remaining} <span className="text-[10px] font-medium ml-1 text-muted-foreground">{unit}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 font-medium">-</span>
                          )}
                        </td>

                        {/* DELETE ROW */}
                        <td className="px-3 py-3 text-center">
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

            {methods.formState.errors.items?.message && (
              <div className="mt-2 text-xs text-destructive font-medium">
                {methods.formState.errors.items.message}
              </div>
            )}

            {/* Table Footer */}
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
              <AppButton 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => append({ productId: '', issuedQty: 1 })}
                className="text-xs border-dashed"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Another Item
              </AppButton>
              <div className="text-xs text-muted-foreground font-medium">
                Total Units to Issue: <strong className="text-foreground font-bold">{totalUnits}</strong>
              </div>
            </div>
          </AppCard>

          {/* SECTION 3: Notes & Summary Bottom Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Notes Section (2 Cols on lg) */}
            <AppCard className="lg:col-span-2 p-5 md:p-6 border border-border shadow-xs bg-card">
              <h3 className="text-base font-semibold text-foreground mb-1">Additional Notes / Remarks</h3>
              <p className="text-xs text-muted-foreground mb-3">Optional instructions or project details for the material slip</p>
              <textarea 
                className="flex min-h-[90px] w-full rounded-lg border border-input bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 p-3 text-sm shadow-xs transition-colors outline-none leading-relaxed" 
                {...methods.register('notes')} 
                placeholder="e.g. For AHU fan replacement, Site Contact: John Doe (+91 98765 43210)..."
              />
            </AppCard>

            {/* Submit & Summary Card (1 Col on lg) */}
            <AppCard className="p-5 md:p-6 border border-border shadow-xs bg-card">
              <h3 className="font-semibold text-base mb-4 border-b border-border pb-2">Issue Summary</h3>
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Unique Items</span>
                  <span className="font-bold font-mono text-foreground">{selectedCount}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Total Units</span>
                  <span className="font-bold font-mono text-primary text-base">
                    {totalUnits}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Recipient</span>
                  <span className="font-semibold text-foreground truncate max-w-[150px]">
                    {methods.watch('employeeName') || 'None selected'}
                  </span>
                </div>
              </div>

              <AppButton 
                type="submit" 
                disabled={isSaving} 
                className="w-full h-11 text-base font-bold shadow-sm mb-3 bg-primary text-primary-foreground hover:bg-primary-dark"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isSaving ? 'Processing Issue...' : 'Issue & Generate Receipt'}
              </AppButton>
              
              <AppButton 
                type="button" 
                variant="ghost" 
                onClick={() => navigate('/products')} 
                disabled={isSaving} 
                className="w-full text-muted-foreground text-xs"
              >
                Cancel Transaction
              </AppButton>
            </AppCard>
          </div>

        </form>
      </FormProvider>
    </PageContainer>
  );
}
