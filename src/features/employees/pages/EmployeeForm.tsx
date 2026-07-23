import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import type { EmployeeRole, EmployeeStatus } from '../../../shared/types/Employee';
import { Timestamp } from 'firebase/firestore';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppForm, FormActions, FormRow } from '../../../shared/forms/FormLayout';
import { FormSection } from '../../../shared/forms/FormSection';
import { FormField } from '../../../shared/forms/FormField';
import { AppInput } from '../../../shared/forms/AppInput';
import { AppButton } from '../../../shared/app/AppButton';

const ROLES: EmployeeRole[] = ['Technician', 'Manager', 'Store Keeper', 'Accountant', 'Supervisor', 'Engineer', 'GEM', 'Reception', 'CRM'];
const STATUSES: EmployeeStatus[] = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED'];

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['Technician', 'Manager', 'Store Keeper', 'Accountant', 'Supervisor', 'Engineer', 'GEM', 'Reception', 'CRM']),
  department: z.string().optional(),
  designation: z.string().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED']),
  mobile: z.string().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  notes: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

export default function EmployeeForm() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: 'Technician',
      status: 'ACTIVE',
      joiningDate: new Date().toISOString().split('T')[0]
    }
  });

  useEffect(() => {
    if (!isEditMode || !companyId) return;
    const loadEmp = async () => {
      try {
        const emp = await employeeRepository.getById(id, companyId);
        if (emp) {
          methods.reset({
            firstName: emp.firstName,
            lastName: emp.lastName,
            role: emp.role,
            department: emp.department || '',
            designation: emp.designation || '',
            status: emp.status,
            mobile: emp.mobile || '',
            whatsapp: emp.whatsapp || '',
            email: emp.email || '',
            address: emp.address || '',
            emergencyContact: emp.emergencyContact || '',
            joiningDate: emp.joiningDate && typeof (emp.joiningDate as any).toDate === 'function' 
              ? (emp.joiningDate as any).toDate().toISOString().split('T')[0] 
              : new Date().toISOString().split('T')[0],
            notes: emp.notes || ''
          });
        }
      } catch (error) {
        toast.error("Failed to load employee");
      } finally {
        setIsLoading(false);
      }
    };
    loadEmp();
  }, [id, companyId, isEditMode, methods]);

  const onSubmit = async (data: FormData) => {
    if (!companyId || !user) return;
    try {
      setIsSaving(true);
      const payload = {
        companyId,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        department: data.department,
        designation: data.designation,
        status: data.status,
        mobile: data.mobile,
        whatsapp: data.whatsapp,
        email: data.email,
        address: data.address,
        emergencyContact: data.emergencyContact,
        joiningDate: Timestamp.fromDate(new Date(data.joiningDate)),
        notes: data.notes,
        createdBy: user.uid
      };

      if (isEditMode) {
        await employeeRepository.update(id, payload, companyId, user.uid);
        toast.success("Employee updated successfully");
        navigate('/employees');
      } else {
        const newId = await employeeRepository.create(payload as any, user.uid);
        toast.success("Employee created successfully");
        navigate(`/employees/${newId}`); // Redirect to profile to upload docs
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save employee");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <PageContainer>
      <div className="mb-[var(--spacing-md)]">
        <AppButton variant="ghost" size="sm" onClick={() => navigate('/employees')} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Employees
        </AppButton>
      </div>

      <PageHeader 
        title={isEditMode ? 'Edit Employee' : 'New Employee'}
        description={isEditMode ? 'Update employee details and status.' : 'Register a new employee. You can upload documents after saving.'}
      />

      <FormProvider {...methods}>
        <AppForm onSubmit={methods.handleSubmit(onSubmit)}>
          
          <FormSection title="Basic Info" description="Personal details and contact information.">
            <FormRow>
              <FormField label="First Name" required error={methods.formState.errors.firstName?.message}>
                <AppInput {...methods.register('firstName')} placeholder="John" />
              </FormField>
              <FormField label="Last Name" required error={methods.formState.errors.lastName?.message}>
                <AppInput {...methods.register('lastName')} placeholder="Doe" />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Mobile" error={methods.formState.errors.mobile?.message}>
                <AppInput {...methods.register('mobile')} placeholder="+1 234 567 8900" />
              </FormField>
              <FormField label="WhatsApp" error={methods.formState.errors.whatsapp?.message}>
                <AppInput {...methods.register('whatsapp')} placeholder="+1 234 567 8900" />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Email Address" error={methods.formState.errors.email?.message}>
                <AppInput type="email" {...methods.register('email')} placeholder="john@example.com" />
              </FormField>
              <FormField label="Emergency Contact" error={methods.formState.errors.emergencyContact?.message}>
                <AppInput {...methods.register('emergencyContact')} placeholder="Name & Phone" />
              </FormField>
            </FormRow>

            <FormField label="Residential Address" error={methods.formState.errors.address?.message}>
              <AppInput {...methods.register('address')} placeholder="Full address" />
            </FormField>
          </FormSection>

          <FormSection title="Employment Details" description="Job role, department, and current status.">
            <FormRow>
              <FormField label="Role" required error={methods.formState.errors.role?.message}>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" {...methods.register('role')}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </FormField>
              <FormField label="Status" required error={methods.formState.errors.status?.message}>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" {...methods.register('status')}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Department" error={methods.formState.errors.department?.message}>
                <AppInput {...methods.register('department')} placeholder="e.g. Mobile Repair" />
              </FormField>
              <FormField label="Designation" error={methods.formState.errors.designation?.message}>
                <AppInput {...methods.register('designation')} placeholder="e.g. Senior Technician" />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Joining Date" required error={methods.formState.errors.joiningDate?.message}>
                <AppInput type="date" {...methods.register('joiningDate')} />
              </FormField>
            </FormRow>

            <FormField label="Additional Notes" error={methods.formState.errors.notes?.message}>
              <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" {...methods.register('notes')} placeholder="Any internal notes..."></textarea>
            </FormField>
          </FormSection>

          <FormActions>
            <AppButton type="button" variant="outline" onClick={() => navigate('/employees')} disabled={isSaving}>
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={isSaving} variant="default">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : (isEditMode ? 'Update Employee' : 'Save & Continue')}
            </AppButton>
          </FormActions>

        </AppForm>
      </FormProvider>
    </PageContainer>
  );
}
