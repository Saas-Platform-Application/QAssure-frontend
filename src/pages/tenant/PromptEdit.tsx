import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  FormField,
  FormSelect,
  FormTextArea,
  PrimaryButton,
  SecondaryButton,
  FormSlider,
  FormTagInput,
  MultiselectPaginatedSelect
} from "@/components/shared";
import { Plus, Trash2 } from "lucide-react";
import { aiService } from "@/services/ai-service";
import { moduleService } from "@/services/module-service";
import { showToast } from "@/utils/toast";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { AIProviderInfo } from "@/types/ai";

const variableSchema = z.object({
  name: z.string().min(1, "Variable name is required").max(100),
  type: z.enum(["string", "number", "boolean", "array"]),
  required: z.boolean(),
  default: z.string().optional(),
});

const promptSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  use_case: z.string().min(1, "Use case is required").max(100),
  system_message: z.string().optional(),
  user_template: z.string().min(1, "User template is required").max(50000),
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().int().min(1).max(128000),
  tags: z.array(z.string()),
  is_default: z.boolean(),
  variables: z.array(variableSchema),
  change_notes: z.string().optional(),
  module_ids: z.array(z.string().uuid()).optional(),
});

type PromptFormData = z.infer<typeof promptSchema>;

const PromptEdit = (): ReactElement => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiProviders, setApiProviders] = useState<AIProviderInfo[]>([]);
  const [modules, setModules] = useState<Array<{ value: string; label: string }>>([]);
  const [currentVersion, setCurrentVersion] = useState<number>(1);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      name: "",
      description: "",
      use_case: "",
      system_message: "",
      user_template: "",
      provider: "",
      model: "",
      temperature: 0.7,
      max_tokens: 2048,
      tags: [],
      is_default: false,
      variables: [],
      change_notes: "",
      module_ids: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variables",
  });

  const selectedProvider = watch("provider");

  const providersOptions = apiProviders.map((p) => ({
    value: p.name,
    label: p.displayName || p.name,
  }));

  const providerDetail = apiProviders.find((p) => p.name === selectedProvider);
  const modelsOptions = (providerDetail?.models || []).map((m) => ({
    value: m,
    label: m,
  }));

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      if (!id) return;
      try {
        setIsLoading(true);
        const [providerData, promptData, modulesRes] = await Promise.all([
          aiService.getProviders(),
          aiService.getPrompt(id),
          moduleService.getMyModules(),
        ]);

        setApiProviders(providerData);
        setModules(
          (modulesRes.data || []).map((m: any) => ({
            value: m.id,
            label: m.name,
          }))
        );

        reset({
          name: promptData.name,
          description: promptData.description || "",
          use_case: promptData.useCase,
          system_message: promptData.systemMessage || "",
          user_template: promptData.template,
          provider: promptData.defaultParameters?.provider || "",
          model: promptData.defaultParameters?.model || "",
          temperature: promptData.defaultParameters?.temperature ?? 0.7,
          max_tokens: promptData.defaultParameters?.max_tokens ?? 2048,
          tags: promptData.tags || [],
          is_default: promptData.isDefault || false,
          variables: (promptData.variables || []).map((v) => ({
            name: v.name,
            type: v.type || "string",
            required: !!v.required,
            default: v.default ? String(v.default) : "",
          })),
          change_notes: "",
          module_ids: promptData.moduleIds || [],
        });
        setCurrentVersion(promptData.version || 1);
      } catch (err: unknown) {
        showToast.error(
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ||
            "Failed to load prompt data",
        );
        navigate("/tenant/ai/prompts");
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, [id, reset, navigate]);

  const handleLoadModules = async (
    page: number,
    limit: number,
    search?: string
  ) => {
    let filtered = modules;
    if (search) {
      filtered = modules.filter((m) =>
        m.label.toLowerCase().includes(search.toLowerCase())
      );
    }
    const startIndex = (page - 1) * limit;
    const paginatedOptions = filtered.slice(startIndex, startIndex + limit);
    return {
      options: paginatedOptions,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
        hasMore: startIndex + limit < filtered.length,
      },
    };
  };

  const onFormSubmit = async (data: PromptFormData): Promise<void> => {
    if (!id) return;
    const parsedTags = data.tags || [];

    const sanitizedVariables = data.variables
      ?.filter((v) => v.name.trim())
      .map((v) => ({
        name: v.name.trim(),
        type: v.type,
        required: v.required,
        ...(v.default?.trim() ? { default: v.default.trim() } : {}),
      }));

    setIsSubmitting(true);
    try {
      await aiService.updatePrompt(id, {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        use_case: data.use_case.trim(),
        system_message: data.system_message?.trim() || undefined,
        user_template: data.user_template,
        model: data.model || undefined,
        provider: data.provider || undefined,
        temperature: data.temperature,
        max_tokens: data.max_tokens,
        variables: sanitizedVariables,
        tags: parsedTags,
        is_default: data.is_default,
        change_notes: data.change_notes,
        module_ids: data.module_ids,
      });
      showToast.success("Prompt updated successfully");
      navigate("/tenant/ai/prompts");
    } catch (err: unknown) {
      showToast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || "Failed to update prompt",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout currentPage="Edit Prompt">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#112868] rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading prompt details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="Edit Prompt"
      breadcrumbs={[
        { label: "AI Prompts", path: "/tenant/ai/prompts" },
        { label: "Edit Prompt" },
      ]}
      pageHeader={{
        title: "Edit Prompt",
        description: "Modify prompt template and configuration settings.",
        action: (
          <div className="flex gap-2">
            <SecondaryButton onClick={() => navigate("/tenant/ai/prompts")}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleSubmit(onFormSubmit)} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Prompt"}
            </PrimaryButton>
          </div>
        ),
      }}
    >
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="flex items-start gap-6"
      >
        {/* LEFT SIDE */}
        <div className="flex flex-col gap-6 flex-[2]">
          {/* General Information */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">
              General Information
            </h2>

            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="Template Name"
                  required
                  placeholder="e.g., Code Review Assistant"
                  helperText="Max 255 characters. Must be unique per tenant and version"
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <FormTextArea
                  {...field}
                  label="Description"
                  placeholder="Describe what this prompt template is used for..."
                  helperText="Optional template summary to explain the purpose and expected usage."
                  error={errors.description?.message}
                />
              )}
            />
          </div>

          {/* Prompt Content */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">
              Prompt Content
            </h2>

            <Controller
              name="system_message"
              control={control}
              render={({ field }) => (
                <FormTextArea
                  {...field}
                  label="System Message"
                  placeholder="You are an expert software engineer..."
                  error={errors.system_message?.message}
                  helperText="Optional system prompt that is added before the template content to guide assistant behavior."
                />
              )}
            />

            <Controller
              name="user_template"
              control={control}
              render={({ field }) => (
                <FormTextArea
                  {...field}
                  label="User Template"
                  required
                  placeholder={
                    "Summarize the following document:\n{{document_text}}\nFocus on: {{focus_areas}}"
                  }
                  error={errors.user_template?.message}
                  helperText={
                    <>
                      Use <code className="text-[#112868] font-bold">{"{{variable_name}}"}</code> for dynamic inputs.
                      <p className="mt-1.5 text-amber-600 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Updating this template will create a new version (v{currentVersion + 1})
                      </p>
                    </>
                  }
                />
              )}
            />

            <Controller
              name="change_notes"
              control={control}
              render={({ field }) => (
                <FormTextArea
                  {...field}
                  label="Change Notes"
                  placeholder="e.g. Optimized the system message for better accuracy, added new variables..."
                  helperText="Describe what changed in this version. This will be visible in the version history."
                  error={errors.change_notes?.message}
                />
              )}
            />

            {/* Variables Section */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Variables Configuration
                </h3>
                <PrimaryButton
                  onClick={() =>
                    append({
                      name: "",
                      type: "string",
                      required: false,
                      default: "",
                    })
                  }
                  size="small"
                  className="h-8 py-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Variable
                </PrimaryButton>
              </div>

              <div className="p-4">
                {fields.length > 0 && (
                  <div className="grid grid-cols-[1fr_120px_1fr_80px_40px] gap-4 px-2 mb-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Variable Name
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
                      Type
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Default Value
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
                      Required
                    </span>
                    <span></span>
                  </div>
                )}

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr_120px_1fr_80px_40px] gap-4 items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0"
                    >
                      <Controller
                        name={`variables.${index}.name`}
                        control={control}
                        render={({ field }) => (
                          <div className="space-y-1">
                            <input
                              {...field}
                              placeholder="e.g context"
                              className={cn(
                                "h-10 w-full px-3.5 py-1 bg-white border border-[rgba(0,0,0,0.08)] rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#112868]/20 focus-visible:border-[#112868]",
                                errors.variables?.[index]?.name &&
                                  "border-red-500",
                              )}
                            />
                            {errors.variables?.[index]?.name && (
                              <p className="text-[10px] text-red-500">
                                {errors.variables?.[index]?.name?.message}
                              </p>
                            )}
                          </div>
                        )}
                      />
                      <Controller
                        name={`variables.${index}.type`}
                        control={control}
                        render={({ field }) => (
                          <div className="h-10 flex flex-col justify-center">
                            <FormSelect
                              label=""
                              className="pb-0"
                              value={field.value}
                              onValueChange={field.onChange}
                              options={[
                                { value: "string", label: "String" },
                                { value: "number", label: "Number" },
                                { value: "boolean", label: "Boolean" },
                                { value: "array", label: "Array" },
                              ]}
                              error={errors.variables?.[index]?.type?.message}
                            />
                          </div>
                        )}
                      />
                      <Controller
                        name={`variables.${index}.default`}
                        control={control}
                        render={({ field }) => (
                          <div className="space-y-1">
                            <input
                              {...field}
                              placeholder="Enter default value"
                              className={cn(
                                "h-10 w-full px-3.5 py-1 bg-white border border-[rgba(0,0,0,0.08)] rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#112868]/20 focus-visible:border-[#112868]",
                                errors.variables?.[index]?.default &&
                                  "border-red-500",
                              )}
                            />
                            {errors.variables?.[index]?.default && (
                              <p className="text-[10px] text-red-500">
                                {errors.variables?.[index]?.default?.message}
                              </p>
                            )}
                          </div>
                        )}
                      />
                      <div className="h-10 flex items-center justify-center">
                        <Controller
                          name={`variables.${index}.required`}
                          control={control}
                          render={({ field }) => (
                            <div
                              className={cn(
                                "w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer",
                                field.value ? "bg-[#084cc8]" : "bg-gray-200",
                              )}
                              onClick={() => field.onChange(!field.value)}
                            >
                              <div
                                className={cn(
                                  "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm",
                                  field.value && "translate-x-5",
                                )}
                              />
                            </div>
                          )}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="h-10 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (Sidebar) */}
        <div className="flex flex-col gap-6 flex-1 max-w-[320px] w-full">
          {/* Settings */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Settings</h2>

            <Controller
              name="use_case"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="Use Case"
                  required
                  placeholder="e.g. document_analysis"
                  error={errors.use_case?.message}
                />
              )}
            />

            <div className="space-y-2 pt-2">
              <label className="text-[13px] font-semibold text-[#0e1b2a]">Is Default</label>
              <div className="flex items-center gap-3">
                <Controller
                  name="is_default"
                  control={control}
                  render={({ field }) => (
                    <div
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer",
                        field.value ? "bg-[#112868]" : "bg-gray-200",
                      )}
                      onClick={() => field.onChange(!field.value)}
                    >
                      <div
                        className={cn(
                          "absolute top-1 left-1 w-3 h-3 rounded-full transition-transform duration-200 shadow-sm",
                          field.value ? "translate-x-5 bg-[#00cfd5]" : "bg-white",
                        )}
                      />
                    </div>
                  )}
                />
                <span className="text-[13px] text-gray-500 font-medium">Make default for this use case</span>
              </div>
            </div>
          </div>

          {/* Model Config */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 space-y-2">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">
              Model Configuration
            </h2>

            <Controller
              name="provider"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Provider"
                  value={field.value || ""}
                  onValueChange={(val) => {
                    field.onChange(val);
                    const pDetail = apiProviders.find((p) => p.name === val);
                    if (pDetail && pDetail.defaultModel) {
                      setValue("model", pDetail.defaultModel);
                    } else if (pDetail && pDetail.models && pDetail.models.length > 0) {
                      setValue("model", pDetail.models[0]);
                    } else {
                      setValue("model", "");
                    }
                  }}
                  options={providersOptions}
                  error={errors.provider?.message}
                />
              )}
            />

            <Controller
              name="model"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Model"
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  options={modelsOptions}
                  error={errors.model?.message}
                />
              )}
            />

            <Controller
              name="temperature"
              control={control}
              render={({ field }) => (
                <FormSlider
                  {...field}
                  label="Temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  helperText="Lower values make output more deterministic"
                  error={errors.temperature?.message}
                />
              )}
            />

            <Controller
              name="max_tokens"
              control={control}
              render={({ field }) => (
                <FormSlider
                  {...field}
                  label="Max Tokens"
                  min={1}
                  max={5000}
                  step={1}
                  helperText="Maximum response token budget."
                  error={errors.max_tokens?.message}
                />
              )}
            />
          </div>

          {/* Organization */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">
              Organization
            </h2>
            <Controller
              name="module_ids"
              control={control}
              render={({ field }) => (
                <MultiselectPaginatedSelect
                  label="Associated Modules"
                  placeholder="Select Modules"
                  value={field.value || []}
                  onValueChange={field.onChange}
                  onLoadOptions={handleLoadModules}
                  initialOptions={modules}
                  isSearchable
                  multiple
                  error={errors.module_ids?.message}
                />
              )}
            />
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <FormTagInput
                  label="Tags (Press enter to add)"
                  value={field.value || []}
                  onChange={field.onChange}
                  error={errors.tags?.message}
                />
              )}
            />
          </div>
        </div>
      </form>
    </Layout>
  );
};

export default PromptEdit;
