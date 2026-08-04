import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Modal,
  FormField,
  PrimaryButton,
  SecondaryButton,
  FormTextArea,
} from "@/components/shared";
import { Copy, Check } from "lucide-react";
import { showToast } from "@/utils/toast";

// Validation schema - matches backend validation
const newModuleSchema = z.object({
  module_id: z
    .string()
    .min(1, "module_id is required")
    .min(3, "module_id must be at least 3 characters")
    .max(100, "module_id must be at most 100 characters"),
  name: z
    .string()
    .min(1, "name is required")
    .min(3, "name must be at least 3 characters")
    .max(100, "name must be at most 100 characters"),
  description: z
    .string()
    .max(1000, "description must be at most 1000 characters")
    .optional()
    .nullable(),
  version: z
    .string()
    .min(1, "version is required")
    .max(20, "version must be at most 20 characters")
    .regex(
      /^[0-9]+\.[0-9]+\.[0-9]+$/,
      "version format is invalid (must be X.Y.Z)",
    ),
  runtime_language: z
    .string()
    .min(1, "runtime_language is required")
    .max(50, "runtime_language must be at most 50 characters"),
  framework: z
    .string()
    .max(50, "framework must be at most 50 characters")
    .optional()
    .nullable(),
  webhookurl: z
    .union([
      z
        .string()
        .url("Invalid URL format")
        .max(500, "webhookurl must be at most 500 characters"),
      z.literal("").transform(() => null),
      z.null(),
    ])
    .optional(),
  sync_webhook_url: z
    .union([
      z
        .string()
        .url("Invalid URL format")
        .max(500, "sync_webhook_url must be at most 500 characters"),
      z.literal("").transform(() => null),
      z.null(),
    ])
    .optional(),
  frontend_base_url: z
    .string()
    .min(1, "frontend_base_url is required")
    .max(255, "frontend_base_url must be at most 255 characters")
    .url("Invalid URL format"),
  backend_base_url: z
    .string()
    .min(1, "backend_base_url is required")
    .max(255, "backend_base_url must be at most 255 characters")
    .url("Invalid URL format"),
  health_endpoint: z
    .string()
    .min(1, "health_endpoint is required")
    .max(255, "health_endpoint must be at most 255 characters"),
  endpoints: z.any().optional().nullable(),
  kafka_topics: z.any().optional().nullable(),
  cpu_request: z
    .string()
    .max(20, "cpu_request must be at most 20 characters")
    .optional()
    .nullable(),
  cpu_limit: z
    .string()
    .max(20, "cpu_limit must be at most 20 characters")
    .optional()
    .nullable(),
  memory_request: z
    .string()
    .max(20, "memory_request must be at most 20 characters")
    .optional()
    .nullable(),
  memory_limit: z
    .string()
    .max(20, "memory_limit must be at most 20 characters")
    .optional()
    .nullable(),
  min_replicas: z
    .number()
    .int()
    .min(1, "min_replicas must be at least 1")
    .max(50, "min_replicas must be at most 50")
    .optional()
    .nullable(),
  max_replicas: z
    .number()
    .int()
    .min(1, "max_replicas must be at least 1")
    .max(50, "max_replicas must be at most 50")
    .optional()
    .nullable(),
  last_health_check: z.string().optional().nullable(),
  consecutive_failures: z.number().int().optional().nullable(),
  registered_by: z.uuid().optional().nullable(),
  tenant_id: z.uuid().optional().nullable(),
  metadata: z.any().optional().nullable(),
});

type NewModuleFormData = z.infer<typeof newModuleSchema>;

interface NewModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewModuleFormData) => Promise<{ api_key: { key: string } }>;
  isLoading?: boolean;
}

export const NewModuleModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: NewModuleModalProps): ReactElement | null => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<NewModuleFormData>({
    resolver: zodResolver(newModuleSchema),
    defaultValues: {
      description: null,
      framework: null,
      webhookurl: null,
      endpoints: null,
      kafka_topics: null,
      cpu_request: null,
      cpu_limit: null,
      memory_request: null,
      memory_limit: null,
      min_replicas: null,
      max_replicas: null,
      last_health_check: null,
      consecutive_failures: null,
      registered_by: null,
      tenant_id: null,
      metadata: null,
      sync_webhook_url: null,
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset({
        module_id: "",
        name: "",
        description: null,
        version: "",
        runtime_language: "",
        framework: null,
        webhookurl: null,
        frontend_base_url: "",
        backend_base_url: "",
        health_endpoint: "",
        endpoints: null,
        kafka_topics: null,
        cpu_request: null,
        cpu_limit: null,
        memory_request: null,
        memory_limit: null,
        min_replicas: null,
        max_replicas: null,
        last_health_check: null,
        consecutive_failures: null,
        registered_by: null,
        tenant_id: null,
        metadata: null,
        sync_webhook_url: null,
      });
      clearErrors();
      setApiKey(null);
      setCopied(false);
    }
  }, [isOpen, reset, clearErrors]);

  const handleFormSubmit = async (data: NewModuleFormData): Promise<void> => {
    clearErrors();
    try {
      const response = await onSubmit(data);
      // Store API key from response
      if (response?.api_key?.key) {
        setApiKey(response.api_key.key);
        showToast.success(
          "Module registered successfully",
          "Your API key has been generated. Please copy and store it securely - this is the only time you will see it.",
        );
      } else {
        showToast.success("Module registered successfully");
        onClose();
      }
    } catch (error: any) {
      // Handle validation errors from API
      if (
        error?.response?.data?.details &&
        Array.isArray(error.response.data.details)
      ) {
        const validationErrors = error.response.data.details;
        validationErrors.forEach(
          (detail: { path: string; message: string }) => {
            if (
              detail.path === "name" ||
              detail.path === "module_id" ||
              detail.path === "description" ||
              detail.path === "version" ||
              detail.path === "runtime_language" ||
              detail.path === "framework" ||
              detail.path === "webhookurl" ||
              detail.path === "sync_webhook_url" ||
              detail.path === "frontend_base_url" ||
              detail.path === "backend_base_url" ||
              detail.path === "health_endpoint" ||
              detail.path === "endpoints" ||
              detail.path === "kafka_topics" ||
              detail.path === "cpu_request" ||
              detail.path === "cpu_limit" ||
              detail.path === "memory_request" ||
              detail.path === "memory_limit" ||
              detail.path === "min_replicas" ||
              detail.path === "max_replicas" ||
              detail.path === "last_health_check" ||
              detail.path === "consecutive_failures" ||
              detail.path === "registered_by" ||
              detail.path === "tenant_id" ||
              detail.path === "metadata"
            ) {
              setError(detail.path as keyof NewModuleFormData, {
                type: "server",
                message: detail.message,
              });
            }
          },
        );
      } else {
        // Handle general errors
        // Check for nested error object with message property
        const errorObj = error?.response?.data?.error;
        const errorMessage =
          (typeof errorObj === "object" &&
          errorObj !== null &&
          "message" in errorObj
            ? errorObj.message
            : null) ||
          (typeof errorObj === "string" ? errorObj : null) ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create module. Please try again.";
        setError("root", {
          type: "server",
          message:
            typeof errorMessage === "string"
              ? errorMessage
              : "Failed to create module. Please try again.",
        });
      }
    }
  };

  const handleCopyApiKey = async (): Promise<void> => {
    if (apiKey) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(apiKey);
        } else {
          // Fallback for non-secure contexts (e.g., HTTP IP/Domain testing)
          const textArea = document.createElement("textarea");
          textArea.value = apiKey;
          textArea.style.top = "0";
          textArea.style.left = "0";
          textArea.style.position = "fixed";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand("copy");
          document.body.removeChild(textArea);
          if (!successful) {
            throw new Error("Fallback copy failed");
          }
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast.success("API key copied to clipboard");
      } catch (err) {
        showToast.error("Failed to copy API key");
      }
    }
  };

  const handleClose = (): void => {
    setApiKey(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Register New Module"
      description="Register a new module to integrate with the QAssure platform"
      maxWidth="lg"
      footer={
        <>
          <SecondaryButton
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm"
          >
            {apiKey ? "Close" : "Cancel"}
          </SecondaryButton>
          {!apiKey && (
            <PrimaryButton
              type="button"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isLoading}
              size="default"
              className="px-4 py-2.5 text-sm"
            >
              {isLoading ? "Registering..." : "Register Module"}
            </PrimaryButton>
          )}
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        {/* API Key Display Section */}
        {apiKey && (
          <div className="mb-6 p-4 bg-[rgba(34,197,94,0.1)] border border-[#22c55e] rounded-md">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[#0f1724] mb-2">
                ⚠️ Important: Save Your API Key
              </h3>
              <p className="text-sm text-[#6b7280] mb-3">
                Your API key has been generated. This is the{" "}
                <strong>only time</strong> you will see this key. Store it
                securely in your module project to authenticate with QAssure
                services. If you lose this key, you cannot retrieve it.
              </p>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white border border-[rgba(0,0,0,0.08)] rounded-md">
              <code className="flex-1 text-sm font-mono text-[#0f1724] break-all">
                {apiKey}
              </code>
              <button
                type="button"
                onClick={handleCopyApiKey}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#112868] text-white rounded-md text-xs font-medium hover:bg-[#0d1f4e] transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* General Error Display */}
        {errors.root && (
          <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
            <p className="text-sm text-[#ef4444]">{errors.root.message}</p>
          </div>
        )}
        {!apiKey && (
          <div className="flex flex-col gap-0">
            {/* Basic Information Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#0f1724] mb-3">
                Basic Information
              </h3>
              <div className="flex flex-col gap-0">
                <div className="flex gap-5">
                  <div className="flex-1">
                    <FormField
                      label="Module ID"
                      required
                      placeholder="Enter module ID (e.g., my-module)"
                      error={errors.module_id?.message}
                      {...register("module_id")}
                    />
                  </div>
                  <div className="flex-1">
                    <FormField
                      label="Module Name"
                      required
                      placeholder="Enter module name"
                      error={errors.name?.message}
                      {...register("name")}
                    />
                  </div>
                </div>
                <FormTextArea
                  label="Description"
                  placeholder="Enter module description"
                  error={errors.description?.message}
                  {...register("description")}
                  rows={4}
                />

                {/* <div className="flex gap-5">
                <div className="flex-1"> */}
                <FormField
                  label="Version"
                  required
                  placeholder="e.g., 1.0.0"
                  error={errors.version?.message}
                  {...register("version")}
                />
                {/* </div> */}
                {/* <div className="flex-1">
                  <FormSelect
                    label="Status"
                    placeholder="Select Status"
                    options={statusOptions}
                    value={statusValue}
                    onValueChange={(value) => setValue('status', value as NewModuleFormData['status'])}
                    error={errors.status?.message}
                  />
                </div>
              </div> */}
              </div>
            </div>

            {/* Runtime Information Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#0f1724] mb-3">
                Runtime Information
              </h3>
              <div className="flex gap-5">
                <div className="flex-1">
                  <FormField
                    label="Runtime Language"
                    required
                    placeholder="e.g., Node.js, Python, Java"
                    error={errors.runtime_language?.message}
                    {...register("runtime_language")}
                  />
                </div>
                <div className="flex-1">
                  <FormField
                    label="Framework"
                    placeholder="e.g., Express, Django, Spring (optional)"
                    error={errors.framework?.message}
                    {...register("framework")}
                  />
                </div>
              </div>
              <div className="flex gap-5">
                <div className="flex-1">
                  <FormField
                    label="X-API-Key Webhook URL"
                    placeholder="e.g., https://example.com/webhook/api-key"
                    error={errors.webhookurl?.message}
                    helperText="URL to receive the system API key"
                    {...register("webhookurl")}
                  />
                </div>
                <div className="flex-1">
                  <FormField
                    label="Identity Sync Webhook URL"
                    placeholder="e.g., https://example.com/webhook/sync"
                    error={errors.sync_webhook_url?.message}
                    helperText="URL to receive identity data (tenants, users, etc.)"
                    {...register("sync_webhook_url")}
                  />
                </div>
              </div>
            </div>

            {/* URL Configuration Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#0f1724] mb-3">
                URL Configuration
              </h3>
              <div className="flex flex-col gap-0">
                <div className="flex gap-5">
                  <div className="flex-1">
                    <FormField
                      label="Frontend Base URL"
                      required
                      type="url"
                      placeholder="https://frontend.example.com"
                      error={errors.frontend_base_url?.message}
                      {...register("frontend_base_url")}
                    />
                  </div>
                  <div className="flex-1">
                    <FormField
                      label="Backend Base URL"
                      required
                      type="url"
                      placeholder="https://backend.example.com"
                      error={errors.backend_base_url?.message}
                      {...register("backend_base_url")}
                    />
                  </div>
                </div>

                <FormField
                  label="Health Endpoint"
                  required
                  placeholder="/health"
                  error={errors.health_endpoint?.message}
                  {...register("health_endpoint")}
                />
              </div>
            </div>

            {/* Resource Configuration Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#0f1724] mb-3">
                Resource Configuration (Optional)
              </h3>
              <div className="flex flex-col gap-0">
                <div className="flex gap-5">
                  <div className="flex-1">
                    <FormField
                      label="CPU Request"
                      placeholder="e.g., 100m, 0.5"
                      error={errors.cpu_request?.message}
                      {...register("cpu_request")}
                    />
                  </div>
                  <div className="flex-1">
                    <FormField
                      label="CPU Limit"
                      placeholder="e.g., 500m, 1"
                      error={errors.cpu_limit?.message}
                      {...register("cpu_limit")}
                    />
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="flex-1">
                    <FormField
                      label="Memory Request"
                      placeholder="e.g., 128Mi, 512Mi"
                      error={errors.memory_request?.message}
                      {...register("memory_request")}
                    />
                  </div>
                  <div className="flex-1">
                    <FormField
                      label="Memory Limit"
                      placeholder="e.g., 256Mi, 1Gi"
                      error={errors.memory_limit?.message}
                      {...register("memory_limit")}
                    />
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="flex-1">
                    <FormField
                      label="Min Replicas"
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      placeholder="1"
                      error={errors.min_replicas?.message}
                      {...register("min_replicas", {
                        setValueAs: (value) => {
                          if (
                            value === "" ||
                            value === null ||
                            value === undefined
                          )
                            return null;
                          const num = Number(value);
                          return isNaN(num) ? null : num;
                        },
                      })}
                    />
                  </div>
                  <div className="flex-1">
                    <FormField
                      label="Max Replicas"
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      placeholder="5"
                      error={errors.max_replicas?.message}
                      {...register("max_replicas", {
                        setValueAs: (value) => {
                          if (
                            value === "" ||
                            value === null ||
                            value === undefined
                          )
                            return null;
                          const num = Number(value);
                          return isNaN(num) ? null : num;
                        },
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
