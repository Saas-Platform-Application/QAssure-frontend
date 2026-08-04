import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal, PrimaryButton, SecondaryButton, FormField, FormSelect } from '@/components/shared';
import { smtpConfigService, type SmtpConfig } from '@/services/smtp-config-service';
import { tenantService } from '@/services/tenant-service';
import { showToast } from '@/utils/toast';
import { Loader2, Shield, CheckCircle, XCircle } from 'lucide-react';

const smtpObjectSchema = z.object({
  id: z.string().optional(),
  scope: z.enum(['super_admin', 'tenant']),
  tenant_id: z.string().nullable().optional(),
  provider: z.string().min(1, 'Provider is required'),
  host: z.string().min(1, 'Host is required'),
  port: z.number().min(1, 'Port is required'),
  secure: z.boolean(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(),
  from_name: z.string().nullable().optional(),
  from_email: z.string().email('Invalid email').nullable().optional().or(z.literal('')),
  is_active: z.boolean()
});

const smtpSchema = smtpObjectSchema.refine((data) => {
  if (data.scope === 'tenant' && !data.tenant_id) {
    return false;
  }
  return true;
}, {
  message: "Tenant is required for tenant specific configuration",
  path: ["tenant_id"]
});

type SmtpFormValues = z.infer<typeof smtpObjectSchema>;

interface SmtpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  config?: SmtpConfig | null;
}

export const SmtpConfigModal = ({ isOpen, onClose, onSubmit, config }: SmtpConfigModalProps) => {
  const [tenants, setTenants] = useState<{ value: string; label: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      scope: 'tenant',
      provider: 'smtp',
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      from_name: '',
      from_email: '',
      is_active: true,
      tenant_id: ''
    }
  });

  const scope = watch('scope');

  useEffect(() => {
    if (isOpen) {
      if (config) {
        reset({
          ...config,
          password: '',
          tenant_id: config.tenant_id || ''
        });
      } else {
        reset({
          scope: 'tenant',
          provider: 'smtp',
          host: '',
          port: 587,
          secure: false,
          username: '',
          password: '',
          from_name: '',
          from_email: '',
          is_active: true,
          tenant_id: ''
        });
      }
      setTestResult(null);
    }
  }, [config, isOpen, reset]);

  useEffect(() => {
    if (isOpen && scope === 'tenant') {
      loadTenants();
    }
  }, [isOpen, scope]);

  const loadTenants = async () => {
    try {
      const res = await tenantService.getAll(1, 100);
      if (res.success) {
        setTenants(res.data.map((t: any) => ({ value: t.id, label: t.name })));
      }
    } catch (err) {
      showToast.error('Failed to load tenants');
    }
  };

  const handleTestConnection = async () => {
    const data = watch();
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await smtpConfigService.adminTestConnection(data);
      setTestResult({
        success: res.success,
        message: res.message
      });
      if (res.success) {
        showToast.success('SMTP connection verified');
      } else {
        showToast.error('SMTP connection failed');
      }
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMsg = typeof errorData === 'string' ? errorData : errorData?.message;
      setTestResult({
        success: false,
        message: errorMsg || err.response?.data?.message || 'Connection test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const onFormSubmit = async (values: SmtpFormValues) => {
    setIsSubmitting(true);
    try {
      // If it's a new config, ensure password is not empty
      if (!config && (!values.password || values.password.trim() === '')) {
        showToast.error('Password is required for new configurations');
        setIsSubmitting(false);
        return;
      }

      await smtpConfigService.adminUpsertConfig(values);
      showToast.success('SMTP configuration saved');
      await onSubmit();
      onClose();
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMsg = typeof errorData === 'string' ? errorData : errorData?.message;
      showToast.error(errorMsg || err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config ? 'Edit SMTP Configuration' : 'New SMTP Configuration'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="p-5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="scope"
            control={control}
            render={({ field }) => (
              <FormSelect
                label="Scope"
                value={field.value}
                onValueChange={(val) => {
                  field.onChange(val);
                  if (val === 'super_admin') setValue('tenant_id', '');
                }}
                options={[
                  { value: 'super_admin', label: 'Global (Super Admin)' },
                  { value: 'tenant', label: 'Tenant Specific' }
                ]}
                error={errors.scope?.message}
                required
              />
            )}
          />

          {scope === 'tenant' && (
            <Controller
              name="tenant_id"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Tenant"
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  options={tenants}
                  error={errors.tenant_id?.message}
                  required
                />
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Controller
              name="host"
              control={control}
              render={({ field }) => (
                <FormField
                  label="SMTP Host"
                  {...field}
                  placeholder="smtp.example.com"
                  error={errors.host?.message}
                  required
                />
              )}
            />
          </div>
          <Controller
            name="port"
            control={control}
            render={({ field }) => (
              <FormField
                label="Port"
                type="number"
                {...field}
                value={field.value?.toString()}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="587"
                error={errors.port?.message}
                required
              />
            )}
          />
        </div>

        <div className="flex items-center space-x-4">
          <Controller
            name="secure"
            control={control}
            render={({ field }) => (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Use SSL/TLS</span>
              </label>
            )}
          />
          <div className="flex-1"></div>
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <Controller
            name="username"
            control={control}
            render={({ field }) => (
              <FormField
                label="Username"
                {...field}
                placeholder="user@example.com"
                error={errors.username?.message}
                required
              />
            )}
          />
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <FormField
                label="Password"
                type="password"
                {...field}
                placeholder={config ? 'Leave blank to keep current' : '••••••••'}
                error={errors.password?.message}
                required={!config}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="from_name"
            control={control}
            render={({ field }) => (
              <FormField
                label="Sender Name"
                {...field}
                value={field.value ?? ''}
                placeholder="QAssure Notifications"
                error={errors.from_name?.message}
              />
            )}
          />
          <Controller
            name="from_email"
            control={control}
            render={({ field }) => (
              <FormField
                label="Sender Email"
                type="email"
                {...field}
                value={field.value ?? ''}
                placeholder="noreply@qassure.ai"
                error={errors.from_email?.message}
              />
            )}
          />
        </div>

        {testResult && (
          <div className={`p-3 rounded-lg flex items-start gap-3 ${testResult.success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {testResult.success ? <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 mt-0.5 shrink-0" />}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <SecondaryButton
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !watch('host') || !watch('username')}
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </SecondaryButton>

          <div className="flex gap-3">
            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (config ? 'Update Configuration' : 'Create Configuration')}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
};
