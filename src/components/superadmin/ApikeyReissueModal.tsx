import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, FormField, PrimaryButton, SecondaryButton } from '@/components/shared';
import { Copy, Check, Key, Loader2 } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { moduleService } from '@/services/module-service';
import type { Module } from '@/types/module';

const reissueSchema = z.object({
  webhookurl: z
    .string()
    .min(1, 'Webhook URL is required')
    .url('Invalid URL format')
    .max(500, 'Webhook URL must be at most 500 characters'),
});

type ReissueFormData = z.infer<typeof reissueSchema>;

interface ApikeyReissueModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string | null;
  onLoadModule: (id: string) => Promise<Module>;
}

export const ApikeyReissueModal = ({
  isOpen,
  onClose,
  moduleId,
  onLoadModule,
}: ApikeyReissueModalProps): ReactElement | null => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReissueFormData>({
    resolver: zodResolver(reissueSchema),
  });

  useEffect(() => {
    if (isOpen && moduleId) {
      const load = async () => {
        try {
          setIsLoading(true);
          const data = await onLoadModule(moduleId);
          reset({ webhookurl: data.webhookurl || '' });
        } catch (err: any) {
          showToast.error(err?.message || 'Failed to load module details');
        } finally {
          setIsLoading(false);
        }
      };
      load();
    } else {
      setApiKey(null);
      setCopied(false);
    }
  }, [isOpen, moduleId, onLoadModule, reset]);

  const handleFormSubmit = async (data: ReissueFormData): Promise<void> => {
    if (!moduleId) return;
    try {
      setIsSubmitting(true);
      const response = await moduleService.reissueApiKey(moduleId, data.webhookurl);
      if (response.success && response.data?.api_key?.key) {
        setApiKey(response.data.api_key.key);
        showToast.success(
          'API Key Reissued',
          'A new API key has been generated and sent to the webhook URL.'
        );
      }
    } catch (err: any) {
      showToast.error(err?.response?.data?.error?.message || err?.message || 'Failed to reissue API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyApiKey = async (): Promise<void> => {
    if (apiKey) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(apiKey);
        } else {
          // Fallback for non-secure contexts (e.g., HTTP IP/Domain testing)
          const textArea = document.createElement('textarea');
          textArea.value = apiKey;
          textArea.style.top = '0';
          textArea.style.left = '0';
          textArea.style.position = 'fixed';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (!successful) {
            throw new Error('Fallback copy failed');
          }
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast.success('API key copied to clipboard');
      } catch (err) {
        showToast.error('Failed to copy API key');
      }
    }
  };

  const handleClose = (): void => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reissue X-API-Key"
      description="Regenerate the module's API key and send it to the configured webhook."
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <SecondaryButton
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm"
          >
            {apiKey ? 'Close' : 'Cancel'}
          </SecondaryButton>
          {!apiKey && (
            <PrimaryButton
              type="button"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isSubmitting || isLoading}
              size="default"
              className="px-4 py-2.5 text-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reissuing...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Reissue & Send Key</span>
                </>
              )}
            </PrimaryButton>
          )}
        </div>
      }
    >
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#112868] animate-spin" />
          </div>
        ) : (
          <>
            {apiKey ? (
              <div className="p-4 bg-[rgba(34,197,94,0.1)] border border-[#22c55e] rounded-md">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-[#0f1724] mb-2">
                    ⚠️ New API Key Generated
                  </h3>
                  <p className="text-sm text-[#6b7280] mb-3">
                    The new API key has been generated and sent to the module. Store it securely - this is the only time you will see this key here.
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
            ) : (
              <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-4 flex gap-3">
                  <Key className="w-5 h-5 text-[#112868] shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-[#0f1724]">Security Notice</h4>
                    <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                      Reissuing the API key will immediately invalidate the previous key. The new key will be sent via POST request to the webhook URL below.
                    </p>
                  </div>
                </div>

                <FormField
                  label="X-API-Key Webhook URL"
                  type="url"
                  required
                  placeholder="https://module-app.com/api/v1/webhooks/api-key"
                  error={errors.webhookurl?.message}
                  {...register('webhookurl')}
                />

                <div className="text-xs text-[#94a3b8] italic">
                  Note: This URL will be updated in the module configuration if it differs from the current one.
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
