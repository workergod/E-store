import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppForm, FormRow, FormActions } from '../../../shared/forms/FormLayout';
import { FormSection } from '../../../shared/forms/FormSection';
import { FormField } from '../../../shared/forms/FormField';
import { AppInput } from '../../../shared/forms/AppInput';
import { AppButton } from '../../../shared/app/AppButton';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { companyRepository } from '../../../repositories/CompanyRepository';

const settingsSchema = z.object({
  companyName: z.string().min(1, 'Company Name is required'),
  taxId: z.string().optional(),
  businessAddress: z.string().optional(),
  supportEmail: z.string().email('Invalid email address').or(z.literal('')),
  supportPhone: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  defaultTaxRate: z.coerce.number().optional()
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { company, setCompany } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const methods = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: {
      companyName: '',
      taxId: '',
      businessAddress: '',
      supportEmail: '',
      supportPhone: '',
      currency: 'USD',
      timezone: 'UTC',
      defaultTaxRate: 5
    }
  });

  useEffect(() => {
    if (company) {
      methods.reset({
        companyName: company.companyName || '',
        taxId: company.taxId || '',
        businessAddress: company.businessAddress || '',
        supportEmail: company.supportEmail || '',
        supportPhone: company.supportPhone || '',
        currency: company.currency || 'USD',
        timezone: company.timezone || 'UTC',
        defaultTaxRate: company.defaultTaxRate ?? 5
      });
    }
  }, [company, methods]);

  const onSubmit = async (data: SettingsFormData) => {
    if (!company?.companyId) return;
    
    setIsSaving(true);
    try {
      await companyRepository.updateCompany(company.companyId, data);
      
      // Update local state so it reflects immediately
      setCompany({ ...company, ...data });
      
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Company Settings" 
        description="Manage your business profile, localization, and preferences." 
      />

      <FormProvider {...methods}>
        <AppForm onSubmit={methods.handleSubmit(onSubmit)}>
          <FormSection title="Business Profile" description="Basic information about your company.">
            <FormRow>
              <FormField label="Company Name" required error={methods.formState.errors.companyName?.message}>
                <AppInput {...methods.register('companyName')} />
              </FormField>
              <FormField label="Registration / Tax ID" error={methods.formState.errors.taxId?.message}>
                <AppInput placeholder="e.g. TRN-123456789" {...methods.register('taxId')} />
              </FormField>
            </FormRow>

            <FormField label="Business Address" error={methods.formState.errors.businessAddress?.message}>
              <AppInput placeholder="Full company address" {...methods.register('businessAddress')} />
            </FormField>
            
            <FormRow>
              <FormField label="Support Email" error={methods.formState.errors.supportEmail?.message}>
                <AppInput type="email" placeholder="support@estore.com" {...methods.register('supportEmail')} />
              </FormField>
              <FormField label="Support Phone" error={methods.formState.errors.supportPhone?.message}>
                <AppInput placeholder="+1 234 567 890" {...methods.register('supportPhone')} />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="Timezone" description="Set your local timezone for accurate transaction logging.">
            <FormRow>
              <FormField label="Timezone" required error={methods.formState.errors.timezone?.message}>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...methods.register('timezone')}>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="Asia/Dubai">Asia/Dubai</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                  <option value="Australia/Sydney">Australia/Sydney</option>
                </select>
              </FormField>
            </FormRow>
          </FormSection>

          <FormActions>
            <AppButton type="submit" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </AppButton>
          </FormActions>
        </AppForm>
      </FormProvider>
    </PageContainer>
  );
}
