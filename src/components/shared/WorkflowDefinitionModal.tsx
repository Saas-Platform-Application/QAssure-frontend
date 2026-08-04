import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Modal,
  PrimaryButton,
  SecondaryButton,
  FormField,
  FormSelect,
  MultiselectPaginatedSelect,
} from "@/components/shared";
import { Plus, Trash2, GitPullRequest } from "lucide-react";
import { workflowService } from "@/services/workflow-service";
import { moduleService } from "@/services/module-service";
import { roleService } from "@/services/role-service";
import { userService } from "@/services/user-service";
import { showToast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import type {
  WorkflowDefinition,
  CreateWorkflowDefinitionData,
  UpdateWorkflowDefinitionData,
} from "@/types/workflow";

const stepSchema = z
  .object({
    step_code: z.string().min(1, "Step code is required"),
    name: z.string().min(1, "Name is required"),
    sequence: z.number().int().min(1),
    step_type: z.enum(["initial", "task", "approval", "terminal"]),
    assignee_type: z.enum(["role", "user", "originator"]).optional(),
    assignee_role_ids: z.array(z.string().uuid()).optional(),
    assignee_user_ids: z.array(z.string().uuid()).optional(),
    available_actions: z.array(z.string()).optional(),
    requires_signature: z.boolean().default(false),
    requires_comment: z.boolean().default(false),
    requires_attachment: z.boolean().default(false),
    sla_hours: z.preprocess(
      (v) => (v === "" || v === null || Number.isNaN(v) ? undefined : v),
      z.number().int().nonnegative().optional().nullable(),
    ),
    sla_warning_hours: z.preprocess(
      (v) => (v === "" || v === null || Number.isNaN(v) ? undefined : v),
      z.number().int().nonnegative().optional().nullable(),
    ),
    sla_escalation_hours: z.preprocess(
      (v) => (v === "" || v === null || Number.isNaN(v) ? undefined : v),
      z.number().int().nonnegative().optional().nullable(),
    ),
  })
  .superRefine((data, ctx) => {
    // Skip all assignee/action validation for terminal steps
    if (data.step_type === "terminal") {
      return;
    }

    // Basic validation for non-terminal steps
    if (!data.assignee_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assignee type is required",
        path: ["assignee_type"],
      });
    }

    if (!data.available_actions || data.available_actions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one action is required",
        path: ["available_actions"],
      });
    }

    // Conditional validation based on assignee type
    if (data.assignee_type === "role") {
      if (!data.assignee_role_ids || data.assignee_role_ids.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one role is required",
          path: ["assignee_role_ids"],
        });
      }
    } else if (data.assignee_type === "user") {
      if (!data.assignee_user_ids || data.assignee_user_ids.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one user is required",
          path: ["assignee_user_ids"],
        });
      }
    }
    // No validation needed for 'originator' type
  });

const transitionSchema = z.object({
  from_step_code: z.string().min(1, "Source step is required"),
  to_step_code: z.string().min(1, "Target step is required"),
  action: z.string().min(1, "Action is required"),
  name: z.string().min(1, "Transition name is required"),
  requires_signature: z.boolean().default(false),
  requires_comment: z.boolean().default(false),
});

const workflowSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    code: z.string().min(1, "Code is required"),
    description: z.string().optional(),
    entity_type: z
      .string()
      .min(1, "entity_type is required")
      .max(100, "entity_type must be at most 100 characters"),
    status: z.enum(["draft", "active", "deprecated", "archived"]),
    source_module: z.array(z.string()).optional(),
    source_module_id: z
      .array(z.string())
      .min(1, "At least one module must be selected"),
    steps: z.array(stepSchema),
    transitions: z.array(transitionSchema),
    tenant_id: z.string().optional(),
    is_edit: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.is_edit) {
      if (!data.steps || data.steps.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one step is required",
          path: ["steps"],
        });
      } else {
        const hasTerminalStep = data.steps.some(
          (step: any) => step.step_type === "terminal",
        );
        const hasInitialStep = data.steps.some(
          (step: any) => step.step_type === "initial",
        );

        if (!hasInitialStep) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Workflow must have exactly one initial step",
            path: ["steps"],
          });
        }

        if (!hasTerminalStep) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Workflow must have at least one terminal step",
            path: ["steps"],
          });
        }

        // Connectivity Validation
        if (hasInitialStep && hasTerminalStep && data.transitions) {
          const transitionFromCodes = new Set(data.transitions.map(t => t.from_step_code));
          const transitionToCodes = new Set(data.transitions.map(t => t.to_step_code));

          data.steps.forEach((step: any, index: number) => {
            const isInitial = step.step_type === 'initial';
            const isTerminal = step.step_type === 'terminal';

            // 1. Every non-terminal step must have an outgoing transition
            if (!isTerminal && !transitionFromCodes.has(step.step_code)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Step '${step.name}' must have at least one outgoing transition`,
                path: ["steps", index, "step_code"],
              });
            }

            // 2. Every non-initial step must have an incoming transition (be reachable)
            if (!isInitial && !transitionToCodes.has(step.step_code)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Step '${step.name}' is unreachable (no transitions lead to it)`,
                path: ["steps", index, "step_code"],
              });
            }
          });
        }
      }
    }
  });

type WorkflowSchemaType = z.infer<typeof workflowSchema>;

interface WorkflowDefinitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  definition?: WorkflowDefinition | null;
  tenantId?: string | null;
  onSuccess: () => void;
  initialEntityType?: string;
}
const StepAssigneeFields = ({
  index,
  control,
  errors,
  isEdit,
  loadRoles,
  loadUsers,
}: any) => {
  const assigneeType = useWatch({
    control,
    name: `steps.${index}.assignee_type`,
  });

  if (assigneeType === "role") {
    return (
      <Controller
        name={`steps.${index}.assignee_role_ids` as const}
        control={control}
        render={({ field }) => (
          <MultiselectPaginatedSelect
            key={`role-select-${index}`}
            label="Select Role(s)"
            required
            isSearchable
            value={field.value || []}
            onValueChange={field.onChange}
            onLoadOptions={loadRoles}
            error={(errors.steps as any)?.[index]?.assignee_role_ids?.message}
            disabled={isEdit}
          />
        )}
      />
    );
  }

  if (assigneeType === "user") {
    return (
      <Controller
        name={`steps.${index}.assignee_user_ids` as const}
        control={control}
        render={({ field }) => (
          <MultiselectPaginatedSelect
            key={`user-select-${index}`}
            label="Select User(s)"
            required
            isSearchable
            value={field.value || []}
            onValueChange={field.onChange}
            onLoadOptions={loadUsers}
            error={(errors.steps as any)?.[index]?.assignee_user_ids?.message}
            disabled={isEdit}
          />
        )}
      />
    );
  }

  return null;
};

export const WorkflowDefinitionModal = ({
  isOpen,
  onClose,
  definition,
  tenantId,
  onSuccess,
  initialEntityType,
}: WorkflowDefinitionModalProps) => {
  const [activeTab, setActiveTab] = useState<
    "general" | "steps" | "transitions"
  >("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!definition;
  const [availableModules, setAvailableModules] = useState<any[]>([]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
    reset,
  } = useForm<any>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      entity_type: "",
      status: "draft",
      source_module: [],
      source_module_id: [],
      steps: [
        {
          step_code: "start",
          name: "Start",
          sequence: 1,
          step_type: "initial",
          assignee_type: "originator",
          available_actions: ["submit"],
          requires_signature: false,
          requires_comment: false,
          requires_attachment: false,
        },
      ],
      transitions: [],
      is_edit: false,
    },
  });

  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
  } = useFieldArray({
    control,
    name: "steps",
  });

  const {
    fields: transitionFields,
    append: appendTransition,
    remove: removeTransition,
  } = useFieldArray({
    control,
    name: "transitions",
  });

  const watchedTransitions = useWatch({ control, name: "transitions" }) || [];
  const watchedSteps = useWatch({ control, name: "steps" }) || [];

  useEffect(() => {
    if (isOpen) {
      const fetchModules = async () => {
        try {
          const response = await moduleService.getMyModules(tenantId);
          if (response.success) {
            setAvailableModules(response.data);
          }
        } catch (err) {
          console.error("Failed to fetch modules:", err);
        }
      };

      fetchModules();

      if (definition) {
        reset({
          name: definition.name,
          code: definition.code,
          description: definition.description,
          entity_type: definition.entity_type as any,
          status: definition.status,
          source_module: definition.source_module || [],
          source_module_id: definition.source_module_id || [],
          steps: (definition.steps || []).map((s) => ({
            step_code: s.step_code,
            name: s.name,
            sequence: s.sequence,
            step_type: s.step_type,
            assignee_type: s.assignee.type,
            assignee_role_ids: s.assignee.role_ids ?? undefined,
            assignee_user_ids: s.assignee.user_ids ?? undefined,
            available_actions: s.available_actions || [],
            requires_signature: s.requires_signature || false,
            requires_comment: s.requires_comment || false,
            requires_attachment: s.requires_attachment || false,
            sla_hours: s.sla?.hours,
            sla_warning_hours: s.sla?.warning_hours,
            sla_escalation_hours: s.sla?.escalation_hours,
          })),
          transitions: (definition.transitions || []).map((t) => ({
            from_step_code: t.from_step_code,
            to_step_code: t.to_step_code,
            action: t.action,
            name: t.name,
            requires_signature: t.requires_signature || false,
            requires_comment: t.requires_comment || false,
          })),
          is_edit: true,
        });
      } else {
        reset({
          name: "",
          code: "",
          description: "",
          entity_type: initialEntityType || "",
          status: "draft",
          source_module: [],
          source_module_id: [],
          steps: [
            {
              step_code: "start",
              name: "Start",
              sequence: 1,
              step_type: "initial",
              assignee_type: "originator",
              available_actions: ["submit"],
              requires_signature: false,
              requires_comment: false,
              requires_attachment: false,
            },
          ],
          transitions: [],
          is_edit: false,
        });
      }
      setActiveTab("general");
    }
  }, [isOpen, definition, reset, initialEntityType]);

  const onFormSubmit = async (data: WorkflowSchemaType) => {
    try {
      setIsSubmitting(true);

      const selectedModuleNames = data.source_module_id.map((id) => {
        const module = availableModules.find((m) => m.id === id);
        return module ? module.module_id || module.code || module.name : id;
      });

      const payload: any = {
        ...data,
        source_module: selectedModuleNames,
        tenantId: tenantId || undefined,
        // Strip fields based on step type and assignee type to prevent backend validation errors
        steps: data.steps?.map((step: any) => {
          if (step.step_type === "terminal") {
            const {
              assignee_type,
              available_actions,
              ...rest
            } = step;
            return rest;
          }

          const cleanedStep = { ...step };

          // Clean up assignee fields based on assignee_type
          if (step.assignee_type === "originator") {
            delete cleanedStep.assignee_role_ids;
            delete cleanedStep.assignee_user_ids;
          } else if (step.assignee_type === "role") {
            delete cleanedStep.assignee_user_ids;
          } else if (step.assignee_type === "user") {
            delete cleanedStep.assignee_role_ids;
            // Ensure IDs are not empty
            if (!cleanedStep.assignee_user_ids || cleanedStep.assignee_user_ids.length === 0) {
              delete cleanedStep.assignee_user_ids;
            }
          }

          // Clean up SLA fields
          ['sla_hours', 'sla_warning_hours', 'sla_escalation_hours'].forEach(field => {
            if (cleanedStep[field] === 0 || cleanedStep[field] === null || cleanedStep[field] === "" || Number.isNaN(cleanedStep[field])) {
              delete cleanedStep[field];
            }
          });

          return cleanedStep;
        }),
      };

      // In edit mode, if steps or transitions are not edited (hidden in UI)
      // and they come as empty from the definition (e.g. list view),
      // we don't want to send them as empty arrays which might clear them on backend.
      if (isEdit) {
        if (!data.steps || data.steps.length === 0) delete payload.steps;
        if (!data.transitions || data.transitions.length === 0)
          delete payload.transitions;
        delete payload.is_edit;
      }

      if (isEdit && definition) {
        const response = await workflowService.updateDefinition(
          definition.id,
          payload as UpdateWorkflowDefinitionData,
          tenantId || undefined,
        );
        if (response.success) {
          showToast.success("Workflow definition updated successfully");
          onSuccess();
          onClose();
        }
      } else {
        const response = await workflowService.createDefinition(
          payload as CreateWorkflowDefinitionData,
          tenantId || undefined,
        );
        if (response.success) {
          showToast.success("Workflow definition created successfully");
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      const backendErrors = err?.response?.data?.details;
      if (Array.isArray(backendErrors)) {
        backendErrors.forEach((detail: any) => {
          const path = detail.path;
          // Map backend path (e.g., "steps.2") to frontend field (e.g., "steps.2.assignee_user_ids")
          // if it's a generic step error, or just use the path if it's already specific.
          
          if (path.startsWith('steps.') && !path.includes('.', 6)) {
             // It's a generic step error like "steps.2"
             // We'll attach it to the assignee fields so it's visible
             const index = path.split('.')[1];
             const assigneeType = watchedSteps[parseInt(index)]?.assignee_type;
             const fieldName = assigneeType === 'role' ? 'assignee_role_ids' : 'assignee_user_ids';
             setError(`${path}.${fieldName}`, {
               type: 'manual',
               message: detail.message
             });
             setActiveTab('steps');
          } else {
            setError(path, {
              type: 'manual',
              message: detail.message
            });
            
            // Switch to relevant tab
            if (path.startsWith('steps')) setActiveTab('steps');
            if (path.startsWith('transitions')) setActiveTab('transitions');
          }
        });
        showToast.error("Please fix the validation errors");
      } else {
        showToast.error(
          err?.response?.data?.error?.message ||
            `Failed to ${isEdit ? "update" : "create"} workflow`,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadModules = async (_page: number, _limit: number) => {
    const response = await moduleService.getMyModules(tenantId);
    if (response.success) {
      return {
        options: response.data.map((m: any) => ({
          value: m.id,
          label: m.name,
        })),
        pagination: {
          page: 1,
          limit: 100,
          total: response.data.length,
          totalPages: 1,
          hasMore: false,
        },
      };
    }
    return {
      options: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
  };

  const loadRoles = async (page: number, limit: number, search?: string) => {
    const response = tenantId
      ? await roleService.getByTenant(tenantId, page, limit, null, search)
      : await roleService.getAll(page, limit, null, search);

    if (response.success) {
      return {
        options: response.data.map((r: any) => ({
          value: r.id,
          label: `${r.name} (${r.code})`,
        })),
        pagination: response.pagination,
      };
    }
    return {
      options: [],
      pagination: { page: 1, limit, total: 0, totalPages: 0, hasMore: false },
    };
  };

  const loadUsers = async (_page: number, _limit: number, search?: string) => {
    try {
      const response = await userService.getDropdown({
        search
      });

      if (response.success) {
        const options = response.data.map((u: any) => ({
          value: u.id,
          label: `${u.name} (${u.email})`
        }));

        return {
          options,
          pagination: {
            page: 1,
            limit: options.length,
            total: options.length,
            totalPages: 1,
            hasMore: false
          }
        };
      }
    } catch (err) {
      console.error("Failed to fetch users for dropdown:", err);
    }
    return {
      options: [],
      pagination: { page: 1, limit: _limit, total: 0, totalPages: 0, hasMore: false }
    };
  };

  const tabClasses = (tab: typeof activeTab) =>
    cn(
      "px-6 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none",
      activeTab === tab
        ? "border-[#112868] text-[#112868]"
        : "border-transparent text-[#64748b] hover:text-[#1e293b]",
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Workflow Definition" : "New Workflow Definition"}
      maxWidth="xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <SecondaryButton onClick={onClose} disabled={isSubmitting}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            onClick={handleSubmit(onFormSubmit, (errors) => {
              console.error("Form Validation Errors:", errors);

              // Helper to find the first message in the errors object
              const getFirstErrorMessage = (errs: any): string => {
                if (!errs) return "";
                if (errs.message) return errs.message;
                if (Array.isArray(errs)) {
                  for (const e of errs) {
                    const m = getFirstErrorMessage(e);
                    if (m) return m;
                  }
                }
                if (typeof errs === "object") {
                  for (const key in errs) {
                    const m = getFirstErrorMessage(errs[key]);
                    if (m) return m;
                  }
                }
                return "";
              };

              const firstMessage = getFirstErrorMessage(errors);
              showToast.error(
                firstMessage ||
                  "Please check all required fields and try again.",
              );
            })}
            disabled={isSubmitting}
          >
            {isEdit ? "Update Workflow" : "Create Workflow"}
          </PrimaryButton>
        </div>
      }
    >
      <div className="flex flex-col">
        {/* Tabs - Only show when creating new workflow */}
        {!isEdit && (
          <div className="flex border-b border-[rgba(0,0,0,0.08)] bg-white sticky top-0 z-10 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={tabClasses("general")}
            >
              General Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("steps")}
              className={tabClasses("steps")}
            >
              Workflow Steps
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("transitions")}
              className={tabClasses("transitions")}
            >
              Transitions
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {(activeTab === "general" || isEdit) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <FormField
                label="Workflow Name"
                placeholder="e.g. CAPA Approval Workflow"
                required
                {...register("name")}
                error={errors.name?.message as any}
              />
              <FormField
                label="Workflow Code"
                placeholder="e.g. CAPA_WF"
                required
                {...register("code")}
                error={errors.code?.message as any}
                disabled={isEdit}
              />
              <div className="md:col-span-2">
                <FormField
                  label="Description"
                  placeholder="Describe the purpose of this workflow..."
                  {...register("description")}
                  error={errors.description?.message as any}
                />
              </div>
              <FormField
                label="Entity Type"
                placeholder="e.g. document, capa, supplier, training"
                required
                {...register("entity_type")}
                error={errors.entity_type?.message as any}
              />
              {/* <Controller
                name="entity_type"
                control={control}
                render={({ field }) => (
                  <FormSelect
                    label="Entity Type"
                    required
                    options={[
                      { value: "document", label: "Document" },
                      { value: "capa", label: "CAPA" },
                      { value: "supplier", label: "Supplier" },
                      { value: "training", label: "Training" },
                    ]}
                    value={field.value}
                    onValueChange={field.onChange}
                    error={errors.entity_type?.message as any}
                    disabled={isEdit}
                  />
                )}
              /> */}
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormSelect
                    label="Initial Status"
                    required
                    options={[
                      { value: "draft", label: "Draft" },
                      { value: "active", label: "Active" },
                      { value: "deprecated", label: "Deprecated" },
                    ]}
                    value={field.value}
                    onValueChange={field.onChange}
                    error={errors.status?.message as any}
                  />
                )}
              />

              <div className="md:col-span-2">
                <Controller
                  name="source_module_id"
                  control={control}
                  render={({ field }) => (
                    <MultiselectPaginatedSelect
                      label="Associated Modules"
                      placeholder="Select modules..."
                      required
                      value={field.value || []}
                      onValueChange={field.onChange}
                      onLoadOptions={loadModules}
                      initialOptions={availableModules.map((m) => ({
                        value: m.id,
                        label: m.name,
                      }))}
                      error={errors.source_module_id?.message as any}
                    />
                  )}
                />
              </div>
            </div>
          )}

          {!isEdit && activeTab === "steps" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[#1e293b]">
                  Define steps in execution order
                </h3>
                {!isEdit && (
                  <SecondaryButton
                    type="button"
                    className="flex items-center gap-1.5"
                    onClick={() =>
                      appendStep({
                        step_code: `step_${stepFields.length + 1}`,
                        name: `Step ${stepFields.length + 1}`,
                        sequence: stepFields.length + 1,
                        step_type: "task",
                        assignee_type: "role",
                        available_actions: ["approve", "reject"],
                        requires_signature: false,
                        requires_comment: false,
                        requires_attachment: false,
                      } as any)
                    }
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Step</span>
                  </SecondaryButton>
                )}
              </div>

              <div className="space-y-4">
                {stepFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 border border-[rgba(0,0,0,0.08)] rounded-lg bg-[#f8fafc] relative group"
                  >
                    {!isEdit && (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="absolute top-4 right-4 p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove step"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                      <FormField
                        label="Step Code"
                        required
                        {...register(`steps.${index}.step_code` as const)}
                        error={
                          (errors.steps as any)?.[index]?.step_code?.message
                        }
                        disabled={isEdit}
                      />
                      <FormField
                        label="Step Name"
                        required
                        {...register(`steps.${index}.name` as const)}
                        error={(errors.steps as any)?.[index]?.name?.message}
                        disabled={isEdit}
                      />
                      <FormField
                        label="Sequence"
                        type="number"
                        required
                        {...register(`steps.${index}.sequence` as const, {
                          valueAsNumber: true,
                        })}
                        error={
                          (errors.steps as any)?.[index]?.sequence?.message
                        }
                        disabled={isEdit}
                      />
                      <Controller
                        name={`steps.${index}.step_type` as const}
                        control={control}
                        render={({ field }) => (
                          <FormSelect
                            label="Step Type"
                            required
                            options={[
                              { value: "initial", label: "Initial" },
                              { value: "task", label: "Task" },
                              { value: "approval", label: "Approval" },
                              { value: "terminal", label: "Terminal" },
                            ]}
                            value={field.value}
                            onValueChange={(val) => {
                              field.onChange(val);
                              // When switching TO terminal, clear all hidden fields
                              if (val === "terminal") {
                                setValue(`steps.${index}.assignee_type`, undefined);
                                setValue(`steps.${index}.assignee_role_ids`, []);
                                setValue(`steps.${index}.assignee_user_ids`, []);
                                setValue(`steps.${index}.available_actions`, []);
                              }
                            }}
                            error={
                              (errors.steps as any)?.[index]?.step_type?.message
                            }
                            disabled={isEdit}
                          />
                        )}
                      />
                      {watchedSteps[index]?.step_type !== "terminal" && (
                        <Controller
                          name={`steps.${index}.assignee_type` as const}
                          control={control}
                          render={({ field }) => (
                            <FormSelect
                              label="Assignee Type"
                              required
                              options={[
                                { value: "role", label: "Role(s)" },
                                { value: "user", label: "Specific User(s)" },
                                { value: "originator", label: "Originator" },
                              ]}
                              value={field.value}
                              onValueChange={(val) => {
                                field.onChange(val);
                                setValue(`steps.${index}.assignee_role_ids`, []);
                                setValue(`steps.${index}.assignee_user_ids`, []);
                              }}
                              error={
                                (errors.steps as any)?.[index]?.assignee_type
                                  ?.message
                              }
                              disabled={isEdit}
                            />
                          )}
                        />
                      )}

                      {watchedSteps[index]?.step_type !== "terminal" && (
                        <StepAssigneeFields
                          index={index}
                          control={control}
                          errors={errors}
                          isEdit={isEdit}
                          loadRoles={loadRoles}
                          loadUsers={loadUsers}
                        />
                      )}

                      {watchedSteps[index]?.step_type !== "terminal" && (
                        <div className="md:col-span-3">
                          <label className="block text-[13px] font-medium text-[#0e1b2a] mb-2">
                            Available Actions (Press enter to add)
                          </label>
                          <Controller
                            name={`steps.${index}.available_actions` as const}
                            control={control}
                            render={({ field }) => (
                              <div className="flex flex-wrap gap-2 p-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-md min-h-[40px]">
                                {(field.value || []).map(
                                  (action: string, actionIdx: number) => (
                                    <span
                                      key={actionIdx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#112868]/10 text-[#112868] rounded text-xs font-medium"
                                    >
                                      {action}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!isEdit) {
                                            field.onChange(
                                              (field.value || []).filter(
                                                (_: any, i: number) =>
                                                  i !== actionIdx,
                                              ),
                                            );
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ),
                                )}
                                <input
                                  type="text"
                                  className="flex-1 outline-none text-sm min-w-[120px]"
                                  placeholder="Type and press enter..."
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !isEdit) {
                                      e.preventDefault();
                                      const val = e.currentTarget.value.trim();
                                      if (
                                        val &&
                                        !(field.value || []).includes(val)
                                      ) {
                                        field.onChange([
                                          ...(field.value || []),
                                          val,
                                        ]);
                                        e.currentTarget.value = "";
                                      }
                                    }
                                  }}
                                />
                              </div>
                            )}
                          />
                          {(errors.steps as any)?.[index]
                            ?.available_actions && (
                            <p className="mt-1 text-xs text-red-500">
                              {
                                (errors.steps as any)[index].available_actions
                                  .message
                              }
                            </p>
                          )}
                        </div>
                      )}

                      <div className="md:col-span-3 flex flex-wrap gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register(
                              `steps.${index}.requires_signature` as const,
                            )}
                            className="w-4 h-4 rounded text-[#112868]"
                            disabled={isEdit}
                          />
                          <span className="text-sm text-[#475569]">
                            Requires Signature
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register(
                              `steps.${index}.requires_comment` as const,
                            )}
                            className="w-4 h-4 rounded text-[#112868]"
                            disabled={isEdit}
                          />
                          <span className="text-sm text-[#475569]">
                            Requires Comment
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register(
                              `steps.${index}.requires_attachment` as const,
                            )}
                            className="w-4 h-4 rounded text-[#112868]"
                            disabled={isEdit}
                          />
                          <span className="text-sm text-[#475569]">
                            Requires Attachment
                          </span>
                        </label>
                      </div>

                      {watchedSteps[index]?.step_type !== "terminal" && (
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 mt-2 pt-4 border-t border-[rgba(0,0,0,0.05)]">
                          <FormField
                            label="SLA Hours"
                            type="number"
                            placeholder="e.g. 24"
                            {...register(`steps.${index}.sla_hours` as const, {
                              valueAsNumber: true,
                            })}
                            error={(errors.steps as any)?.[index]?.sla_hours?.message}
                            disabled={isEdit}
                          />
                          <FormField
                            label="Warning Hours"
                            type="number"
                            placeholder="e.g. 4"
                            {...register(`steps.${index}.sla_warning_hours` as const, {
                              valueAsNumber: true,
                            })}
                            error={(errors.steps as any)?.[index]?.sla_warning_hours?.message}
                            disabled={isEdit}
                          />
                          <FormField
                            label="Escalation Hours"
                            type="number"
                            placeholder="e.g. 48"
                            {...register(`steps.${index}.sla_escalation_hours` as const, {
                              valueAsNumber: true,
                            })}
                            error={(errors.steps as any)?.[index]?.sla_escalation_hours?.message}
                            disabled={isEdit}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isEdit && activeTab === "transitions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[#1e293b]">
                  Define movements between steps
                </h3>
                {!isEdit && (
                  <SecondaryButton
                    type="button"
                    className="flex items-center gap-1.5"
                    onClick={() =>
                      appendTransition({
                        from_step_code: "",
                        to_step_code: "",
                        action: "",
                        name: "",
                        requires_signature: false,
                        requires_comment: false,
                      } as any)
                    }
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Transition</span>
                  </SecondaryButton>
                )}
              </div>

              <div className="space-y-4">
                {transitionFields.map((field, index) => {
                  const fromStepCode =
                    watchedTransitions[index]?.from_step_code;
                  const fromStep = watchedSteps.find(
                    (s: any) => s.step_code === fromStepCode,
                  );
                  const availableActions = fromStep?.available_actions || [];

                  return (
                    <div
                      key={field.id}
                      className="p-4 border border-[rgba(0,0,0,0.08)] rounded-lg bg-[#f8fafc] relative"
                    >
                      {!isEdit && (
                        <button
                          type="button"
                          onClick={() => removeTransition(index)}
                          className="absolute top-4 right-4 p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Controller
                          name={`transitions.${index}.from_step_code` as const}
                          control={control}
                          render={({ field }) => (
                            <FormSelect
                              label="From Step"
                              required
                              options={watchedSteps.map((s: any) => ({
                                value: s.step_code,
                                label: s.name,
                              }))}
                              value={field.value}
                              onValueChange={field.onChange}
                              error={
                                (errors.transitions as any)?.[index]
                                  ?.from_step_code?.message
                              }
                              disabled={isEdit}
                            />
                          )}
                        />
                        <Controller
                          name={`transitions.${index}.action` as const}
                          control={control}
                          render={({ field }) => (
                            <FormSelect
                              label="Action"
                              required
                              options={availableActions.map((a: string) => ({
                                value: a,
                                label: a,
                              }))}
                              value={field.value}
                              onValueChange={field.onChange}
                              error={
                                (errors.transitions as any)?.[index]?.action
                                  ?.message
                              }
                              disabled={isEdit}
                            />
                          )}
                        />
                        <Controller
                          name={`transitions.${index}.to_step_code` as const}
                          control={control}
                          render={({ field }) => (
                            <FormSelect
                              label="To Step"
                              required
                              options={watchedSteps.map((s: any) => ({
                                value: s.step_code,
                                label: s.name,
                              }))}
                              value={field.value}
                              onValueChange={field.onChange}
                              error={
                                (errors.transitions as any)?.[index]
                                  ?.to_step_code?.message
                              }
                              disabled={isEdit}
                            />
                          )}
                        />
                        <FormField
                          label="Transition Name"
                          placeholder="e.g. Reject & Return"
                          required
                          {...register(`transitions.${index}.name` as const)}
                          error={
                            (errors.transitions as any)?.[index]?.name?.message
                          }
                          disabled={isEdit}
                        />

                        <div className="md:col-span-4 flex gap-4 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              {...register(
                                `transitions.${index}.requires_signature` as const,
                              )}
                              className="w-4 h-4 rounded text-[#112868]"
                              disabled={isEdit}
                            />
                            <span className="text-sm text-[#475569]">
                              Sign Transition
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              {...register(
                                `transitions.${index}.requires_comment` as const,
                              )}
                              className="w-4 h-4 rounded text-[#112868]"
                              disabled={isEdit}
                            />
                            <span className="text-sm text-[#475569]">
                              Force Comment
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {transitionFields.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <GitPullRequest className="w-12 h-12 text-[#9aa6b2] mx-auto mb-3" />
                  <p className="text-sm text-[#64748b]">
                    No transitions defined yet. Connect your steps to define
                    workflow flow.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
