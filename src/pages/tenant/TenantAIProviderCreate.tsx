import { type ReactElement, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  FormField,
  PrimaryButton,
  SecondaryButton,
  FormTagInput,
  FormSelect,
} from "@/components/shared";
// import { ArrowLeft } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { aiService } from "@/services/ai-service";
import { showToast } from "@/utils/toast";
import type { AIProviderInfo } from "@/types/ai";

const createConfigSchema = z.object({
  provider: z.string().min(1, "Provider vendor is required"),
  display_name: z.string().optional(),
  config_type: z.enum(["direct", "azure"]),
  is_active: z.boolean().default(true),
  api_key: z.string().min(1, "API Key is required"),
  endpoint: z.string().url().max(500).optional(),
  deployment: z.string().optional(),
  api_version: z.string().optional(),
  default_model: z.string().min(1, "Default model is required"),
  custom_models: z.array(z.string()).default([]),
  default_embedding_model: z.string().optional(),
  custom_embedding_models: z.array(z.string()).default([]),
  fallback_provider: z.string().optional().nullable(),
});

interface TenantAIProviderCreateProps {
  customTenantId?: string;
  hideLayout?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const TenantAIProviderCreate = ({
  customTenantId,
  hideLayout = false,
  onCancel,
  onSuccess,
}: TenantAIProviderCreateProps = {}): ReactElement => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [availableProviders, setAvailableProviders] = useState<AIProviderInfo[]>([]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const data = await aiService.getProviders();
        setAvailableProviders(data || []);
      } catch (err) {
        console.error("Failed to load providers:", err);
      }
    };
    void fetchProviders();
  }, []);

  const {
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(createConfigSchema),
    defaultValues: {
      provider: "",
      display_name: "",
      config_type: "direct",
      is_active: true,
      api_key: "",
      endpoint: "",
      deployment: "",
      api_version: "",
      default_model: "",
      custom_models: [],
      default_embedding_model: "",
      custom_embedding_models: [],
      fallback_provider: "openai",
    },
  });

  const selectedConfigType = watch("config_type");

  const onFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await aiService.upsertConfig({
        provider: data.provider,
        display_name: data.display_name || undefined,
        config_type: data.config_type,
        is_active: data.is_active,
        api_key: data.api_key,
        endpoint: data.endpoint || undefined,
        deployment: data.deployment || undefined,
        api_version: data.api_version || undefined,
        default_model: data.default_model,
        custom_models: data.custom_models || [],
        default_embedding_model: data.default_embedding_model || undefined,
        custom_embedding_models: data.custom_embedding_models || [],
        fallback_provider: data.fallback_provider || undefined,
      } as any, customTenantId);

      showToast.success("AI Provider configuration created successfully!");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/tenant/ai/providers");
      }
    } catch (err: any) {
      if (err?.response?.data?.details && Array.isArray(err.response.data.details)) {
        err.response.data.details.forEach((detail: any) => {
          if (detail.path) {
            setError(detail.path, { type: "server", message: detail.message });
          }
        });
      }
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to save AI Provider configuration.";
      showToast.error(typeof msg === "string" ? msg : "Validation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <>
      {/* <div className="mb-4">
        <button
          type="button"
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              navigate("/tenant/ai/providers");
            }
          }}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium select-none cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to AI Providers List
        </button>
      </div> */}

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 ">
        {/* General Settings Section */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800 select-none border-b border-slate-100 pb-2">
            General Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="provider"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="Provider"
                  required
                  placeholder="e.g., Mistral7b"
                  error={errors.provider?.message as any}
                />
              )}
            />

            <Controller
              name="display_name"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="Display Name"
                  placeholder="e.g., Mistral small 7b"
                  error={errors.display_name?.message as any}
                />
              )}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-slate-800 block">
                Config Type <span className="text-red-500">*</span>
              </span>
              <span className="text-xs text-slate-500 block">
                Select between Direct and Azure API configurations.
              </span>
            </div>

            <Controller
              name="config_type"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      checked={field.value === "azure"}
                      onChange={() => field.onChange("azure")}
                      className="w-4 h-4 text-[#112868] focus:ring-[#112868] border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Azure
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      checked={field.value === "direct"}
                      onChange={() => field.onChange("direct")}
                      className="w-4 h-4 text-[#112868] focus:ring-[#112868] border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Direct
                    </span>
                  </label>
                </div>
              )}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <span className="text-sm font-semibold text-slate-800 block">
                Enable Configuration
              </span>
              <span className="text-xs text-slate-500 block">
                Activate this configuration to allow processing completions via this provider.
              </span>
            </div>

            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div
                  onClick={() => field.onChange(!field.value)}
                  className={`relative w-11 h-6 flex items-center rounded-full transition-colors cursor-pointer select-none ${
                    field.value ? "bg-[#112868]" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      field.value ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              )}
            />
          </div>
        </div>

        {/* Connection Credentials Section */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2">
            Connection Credentials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="api_key"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="API Key"
                  type="password"
                  required
                  placeholder="Enter secret API key..."
                  error={errors.api_key?.message as any}
                />
              )}
            />

            <Controller
              name="endpoint"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="Endpoint URL"
                  placeholder="e.g. https://my-tenant.openai.azure.com/"
                  error={errors.endpoint?.message as any}
                />
              )}
            />

            {selectedConfigType === "azure" && (
              <>
                <Controller
                  name="deployment"
                  control={control}
                  render={({ field }) => (
                    <FormField
                      {...field}
                      label="Deployment Name"
                      placeholder="e.g., gpt-4-deployment"
                      error={errors.deployment?.message as any}
                    />
                  )}
                />

                <Controller
                  name="api_version"
                  control={control}
                  render={({ field }) => (
                    <FormField
                      {...field}
                      label="API Version"
                      placeholder="e.g., 2023-05-15"
                      error={errors.api_version?.message as any}
                    />
                  )}
                />
              </>
            )}
          </div>
        </div>

        {/* Models */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2">
            Models
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <Controller
              name="default_model"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="Default Model"
                  required
                  placeholder="e.g. gpt-4"
                  error={errors.default_model?.message as any}
                  helperText="Default model for this provider."
                />
              )}
            />

            <Controller
              name="fallback_provider"
              control={control}
              render={({ field }) => {
                const options = availableProviders.map(p => ({
                  value: p.name,
                  label: p.displayName || p.name
                }));
                // Fallback option in case API fails or is loading
                if (options.length === 0) {
                  options.push({ value: "openai", label: "OpenAI" });
                }
                return (
                  <FormSelect
                    {...field}
                    label="Fallback Provider"
                    options={options}
                    error={errors.fallback_provider?.message as any}
                    helperText="The fallback provider to use if this provider encounters errors (default: openai)."
                  />
                );
              }}
            />

            <Controller
              name="custom_models"
              control={control}
              render={({ field }) => (
                <FormTagInput
                  {...field}
                  label="Custom Models (Optional)"
                  placeholder="Type a model ID and press enter..."
                  error={errors.custom_models?.message as any}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="default_embedding_model"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="Default Embedding Model (Optional)"
                  placeholder="e.g. text-embedding-ada-002"
                  error={errors.default_embedding_model?.message as any}
                />
              )}
            />

            <Controller
              name="custom_embedding_models"
              control={control}
              render={({ field }) => (
                <FormTagInput
                  {...field}
                  label="Custom Embedding Models (Optional)"
                  placeholder="Type a model ID and press enter..."
                  error={errors.custom_embedding_models?.message as any}
                />
              )}
            />
          </div>
        </div>
      </form>
    </>
  );

  if (hideLayout) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">AI Provider Configuration</h2>
            <p className="text-xs text-slate-500">Add or update API credentials and models for a tenant.</p>
          </div>
          <div className="flex items-center gap-2">
            <SecondaryButton
              onClick={() => {
                if (onCancel) {
                  onCancel();
                } else {
                  navigate("/tenant/ai/providers");
                }
              }}
              className="h-10 px-5 min-w-[120px]"
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={handleSubmit(onFormSubmit)}
              disabled={isSubmitting}
              className="h-10 px-5 min-w-[120px]"
            >
              {isSubmitting ? "Saving..." : "Save Configuration"}
            </PrimaryButton>
          </div>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <Layout
      currentPage="AI Gateway Services"
       breadcrumbs={[
        { label: "AI Gateway Services", path: "/tenant/ai/providers" },
        { label: "Configuration" },
      ]}
      pageHeader={{
        title: "AI Provider Configuration",
        description: "Manage and reuse prompts for different use cases.",
        action: (
          <div className="flex items-center gap-2">
            <SecondaryButton
              onClick={() => navigate("/tenant/ai/providers")}
              className="h-10 px-5 min-w-[120px]"
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={handleSubmit(onFormSubmit)}
              disabled={isSubmitting}
              className="h-10 px-5 min-w-[120px]"
            >
              {isSubmitting ? "Saving..." : "Save Configuration"}
            </PrimaryButton>
          </div>
        ),
      }}
    >
      {formContent}
    </Layout>
  );
};

export default TenantAIProviderCreate;
