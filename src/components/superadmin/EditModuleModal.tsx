import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, FormField, FormTextArea, PrimaryButton, SecondaryButton } from '@/components/shared';
import { Copy, Check, Loader2 } from 'lucide-react';
import { showToast } from '@/utils/toast';
import type { Module, UpdateModuleRequest } from '@/types/module';

// Validation schema for update - matches backend validation
const updateModuleSchema = z.object({
  name: z
    .string()
    .min(1, 'name is required')
    .min(3, 'name must be at least 3 characters')
    .max(100, 'name must be at most 100 characters'),
  description: z.string().max(1000, 'description must be at most 1000 characters').optional().nullable(),
  frontend_base_url: z
    .string()
    .min(1, 'frontend_base_url is required')
    .max(255, 'frontend_base_url must be at most 255 characters')
    .url('Invalid URL format'),
  backend_base_url: z
    .string()
    .min(1, 'backend_base_url is required')
    .max(255, 'backend_base_url must be at most 255 characters')
    .url('Invalid URL format'),
  health_endpoint: z
    .string()
    .min(1, 'health_endpoint is required')
    .max(255, 'health_endpoint must be at most 255 characters'),
  cpu_request: z.string().max(20, 'cpu_request must be at most 20 characters').optional().nullable(),
  cpu_limit: z.string().max(20, 'cpu_limit must be at most 20 characters').optional().nullable(),
  memory_request: z.string().max(20, 'memory_request must be at most 20 characters').optional().nullable(),
  memory_limit: z.string().max(20, 'memory_limit must be at most 20 characters').optional().nullable(),
  min_replicas: z.number().int().min(1, 'min_replicas must be at least 1').max(50, 'min_replicas must be at most 50').optional().nullable(),
  max_replicas: z.number().int().min(1, 'max_replicas must be at least 1').max(50, 'max_replicas must be at most 50').optional().nullable(),
  metadata: z.any().optional().nullable(),
});

type EditModuleFormData = z.infer<typeof updateModuleSchema>;

interface EditModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: Module | null;
  onSubmit: (data: UpdateModuleRequest) => Promise<any>;
  isLoading?: boolean;
}

export const EditModuleModal = ({
  isOpen,
  onClose,
  module,
  onSubmit,
  isLoading = false,
}: EditModuleModalProps): ReactElement | null => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<EditModuleFormData>({
    resolver: zodResolver(updateModuleSchema),
  });

  // Reset form when modal opens or module changes
  useEffect(() => {
    if (isOpen && module) {
      reset({
        name: module.name,
        description: module.description,
        frontend_base_url: module.frontend_base_url,
        backend_base_url: module.backend_base_url,
        health_endpoint: module.health_endpoint,
        cpu_request: module.cpu_request,
        cpu_limit: module.cpu_limit,
        memory_request: module.memory_request,
        memory_limit: module.memory_limit,
        min_replicas: module.min_replicas,
        max_replicas: module.max_replicas,
        metadata: module.metadata,
      });
      clearErrors();
      setApiKey(null);
      setCopied(false);
    }
  }, [isOpen, module, reset, clearErrors]);

  const handleFormSubmit = async (data: EditModuleFormData): Promise<void> => {
    if (!module) return;
    clearErrors();
    try {
      const response = await onSubmit(data);
      // Backend might return a new API key if webhookurl changed
      if (response?.data?.api_key?.key) {
        setApiKey(response.data.api_key.key);
        showToast.success(
          'Module updated successfully',
          'Webhook URL changed. Your new API key has been generated and sent to the module. Please copy and store it securely.'
        );
      } else {
        showToast.success('Module updated successfully');
        onClose();
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Failed to update module';
      setError('root', { type: 'server', message: errorMessage });
    }
  };

  const handleCopyApiKey = async (): Promise<void> => {
    if (apiKey) {
      try {
        await navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast.success('API key copied to clipboard');
      } catch (err) {
        showToast.error('Failed to copy API key');
      }
    }
  };

  const handleClose = (): void => {
    setApiKey(null);
    setCopied(false);
    onClose();
  };

  if (!module) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Module Configuration"
      description={`Update configuration for ${module.name} (${module.module_id})`}
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <SecondaryButton
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm"
          >
            {apiKey ? 'Close' : 'Cancel'}
          </SecondaryButton>
          {!apiKey && (
            <PrimaryButton
              type="button"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isLoading}
              size="default"
              className="px-4 py-2.5 text-sm flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Updating...' : 'Save Changes'}
            </PrimaryButton>
          )}
        </div>
      }
    >
      <div>
        {/* API Key Display Section (Only if webhookurl changed) */}
        {apiKey && (
          <div className="mb-6 p-4 bg-[rgba(34,197,94,0.1)] border border-[#22c55e] rounded-md">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[#0f1724] mb-2">
                ⚠️ New API Key Generated
              </h3>
              <p className="text-sm text-[#6b7280] mb-3">
                Since the Webhook URL was changed, a new API key has been generated and sent to the module. Store it securely - this is the only time you will see this key here.
              </p>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white border border-[rgba(0,0,0,0.08)] rounded-md">
              <code className="flex-1 text-sm font-mono text-[#0f1724] break-all">{apiKey}</code>
              <button
                type="button"
                onClick={handleCopyApiKey}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#112868] text-white rounded-md text-xs font-medium hover:bg-[#0d1f4e] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {errors.root && (
          <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
            <p className="text-sm text-[#ef4444]">{errors.root.message}</p>
          </div>
        )}

        {!apiKey && (
          <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-6">
            <section>
              <h3 className="text-sm font-semibold text-[#0f1724] mb-4">Basic Information</h3>
              {/* <div className="grid grid-cols-2 gap-5"> */}
                <FormField
                  label="Module Name"
                  required
                  placeholder="Enter module name"
                  error={errors.name?.message}
                  {...register('name')}
                  // helperText="Display name (3-100 chars)."
                />
                {/* <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#0e1b2a]">Module ID (Read Only)</label>
                  <div className="h-10 px-3.5 py-2 bg-gray-50 border border-[rgba(0,0,0,0.08)] rounded-md text-sm text-gray-500 font-mono">
                    {module.module_id}
                  </div>
                </div> */}
              {/* </div> */}
              <FormTextArea
                label="Description"
                placeholder="Enter module description"
                error={errors.description?.message}
                {...register('description')}
                rows={4}
              />
            </section>

            <section>
              <h3 className="text-sm font-semibold text-[#0f1724] mb-4">Endpoint Configuration</h3>
              <div className="grid grid-cols-2 gap-5">
                <FormField
                  label="Frontend Base URL"
                  required
                  type="url"
                  placeholder="https://frontend.example.com"
                  error={errors.frontend_base_url?.message}
                  {...register('frontend_base_url')}
                />
                <FormField
                  label="Backend Base URL"
                  required
                  type="url"
                  placeholder="https://backend.example.com"
                  error={errors.backend_base_url?.message}
                  {...register('backend_base_url')}
                />
              </div>
                <FormField
                  label="Health Endpoint"
                  required
                  placeholder="/health"
                  error={errors.health_endpoint?.message}
                  {...register('health_endpoint')}
                />
            </section>

            <section>
              <h3 className="text-sm font-semibold text-[#0f1724] mb-4">Resource Limits (Optional)</h3>
              <div className="grid grid-cols-2 gap-5">
                <FormField
                  label="CPU Request"
                  placeholder="e.g., 100m"
                  error={errors.cpu_request?.message}
                  {...register('cpu_request')}
                />
                <FormField
                  label="CPU Limit"
                  placeholder="e.g., 500m"
                  error={errors.cpu_limit?.message}
                  {...register('cpu_limit')}
                />
              </div>
              <div className="grid grid-cols-2 gap-5 mt-4">
                <FormField
                  label="Memory Request"
                  placeholder="e.g., 128Mi"
                  error={errors.memory_request?.message}
                  {...register('memory_request')}
                />
                <FormField
                  label="Memory Limit"
                  placeholder="e.g., 512Mi"
                  error={errors.memory_limit?.message}
                  {...register('memory_limit')}
                />
              </div>
            </section>
          </form>
        )}
      </div>
    </Modal>
  );
};
