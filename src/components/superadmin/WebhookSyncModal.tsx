import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send } from 'lucide-react';
import { Modal, SecondaryButton, PrimaryButton, FormField } from '@/components/shared';
import { moduleService } from '@/services/module-service';
import type { Module } from '@/types/module';

const webhookSyncSchema = z.object({
  sync_webhook_url: z.string().min(1, 'Webhook URL is required').url('Please enter a valid URL'),
});

type WebhookSyncFormData = z.infer<typeof webhookSyncSchema>;

interface WebhookSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string | null;
  onLoadModule: (id: string) => Promise<Module>;
}

export const WebhookSyncModal = ({
  isOpen,
  onClose,
  moduleId,
  onLoadModule,
}: WebhookSyncModalProps): ReactElement | null => {
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<WebhookSyncFormData>({
    resolver: zodResolver(webhookSyncSchema),
    mode: 'onChange',
  });

  // Load module data when modal opens
  useEffect(() => {
    if (isOpen && moduleId) {
      const loadModule = async (): Promise<void> => {
        try {
          setIsLoading(true);
          setError(null);
          setSuccess(null);
          const data = await onLoadModule(moduleId);
          setModule(data);
          setValue('sync_webhook_url', data.sync_webhook_url || data.webhookurl || '', { shouldValidate: true });
        } catch (err: any) {
          setError(err?.response?.data?.error?.message || 'Failed to load module details');
        } finally {
          setIsLoading(false);
        }
      };
      loadModule();
    } else {
      setModule(null);
      reset({ sync_webhook_url: '' });
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, moduleId, onLoadModule, setValue, reset]);

  const handleSync = async (data: WebhookSyncFormData): Promise<void> => {
    if (!moduleId) return;

    try {
      setIsSyncing(true);
      setError(null);
      setSuccess(null);
      
      const response = await moduleService.syncWebhookData(moduleId, data.sync_webhook_url);
      
      if (response.success) {
        setSuccess('Identity data sync triggered successfully. The module application will receive the data shortly.');
      } else {
        setError('Failed to trigger sync');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to trigger identity sync');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Identity Data Webhook Sync"
      description="Sync identity data (tenants, roles, departments, designations, suppliers, users) to the module's webhook URL."
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <SecondaryButton type="button" onClick={onClose} className="px-4 py-2.5 text-sm">
            Close
          </SecondaryButton>
          <PrimaryButton 
            type="button" 
            onClick={handleSubmit(handleSync)} 
            disabled={isSyncing || isLoading || !isValid}
            className="px-4 py-2.5 text-sm flex items-center gap-2"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Sync Data
          </PrimaryButton>
        </div>
      }
    >
      <div>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#112868] animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 mb-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md">
            <p className="text-sm text-[#ef4444]">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 mb-4 bg-[rgba(34,197,94,0.1)] border border-[#22c55e] rounded-md">
            <p className="text-sm text-[#22c55e]">{success}</p>
          </div>
        )}

        {!isLoading && module && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-sm font-medium text-[#0e1b2a]">Module</label>
              <div className="p-3 bg-[#f8fafc] border border-[rgba(0,0,0,0.08)] rounded-md">
                <p className="text-sm font-semibold text-[#0e1b2a]">{module.name}</p>
                <p className="text-xs text-[#64748b] font-mono">{module.module_id}</p>
              </div>
            </div>

            <FormField
              label="Identity Sync Webhook URL"
              type="url"
              required
              placeholder="https://module-app.com/api/v1/webhooks/identity"
              error={errors.sync_webhook_url?.message}
              helperText="The super admin can trigger this to send the current state of all identity tables. Any changes to this URL will be saved back to the module registration."
              {...register('sync_webhook_url')}
            />
            
            <div className="p-4 bg-[rgba(17,40,104,0.04)] border border-[rgba(17,40,104,0.1)] rounded-md mt-2">
              <h4 className="text-xs font-semibold text-[#112868] uppercase tracking-wider mb-2">Data Synchronized:</h4>
              <ul className="grid grid-cols-2 gap-y-2 gap-x-4">
                <li className="text-xs text-[#475569] flex items-center gap-2">
                  <div className="w-1 h-1 bg-[#112868] rounded-full" /> Tenants
                </li>
                <li className="text-xs text-[#475569] flex items-center gap-2">
                  <div className="w-1 h-1 bg-[#112868] rounded-full" /> Roles
                </li>
                <li className="text-xs text-[#475569] flex items-center gap-2">
                  <div className="w-1 h-1 bg-[#112868] rounded-full" /> Departments
                </li>
                <li className="text-xs text-[#475569] flex items-center gap-2">
                  <div className="w-1 h-1 bg-[#112868] rounded-full" /> Designations
                </li>
                <li className="text-xs text-[#475569] flex items-center gap-2">
                  <div className="w-1 h-1 bg-[#112868] rounded-full" /> Suppliers
                </li>
                <li className="text-xs text-[#475569] flex items-center gap-2">
                  <div className="w-1 h-1 bg-[#112868] rounded-full" /> Users
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
