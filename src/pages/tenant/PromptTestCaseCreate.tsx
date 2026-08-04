import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  FormField,
  FormTextArea,
  FormTagInput,
  PrimaryButton,
  SecondaryButton,
} from "@/components/shared";
import { ArrowLeft } from "lucide-react";
import { aiService } from "@/services/ai-service";
import { showToast } from "@/utils/toast";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const variableSchema = z.object({
  name: z.string().min(1, "Variable name is required").max(255),
  value: z.string().optional(),
  required: z.boolean().optional(),
});

const testCaseSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  expected_output: z.string().optional(),
  tags: z.array(z.string()),
  variables: z.array(variableSchema),
}).superRefine((data, ctx) => {
  (data.variables || []).forEach((v, index) => {
    if (v.required && (!v.value || !v.value.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${v.name} is a required variable`,
        path: ["variables", index, "value"],
      });
    }
  });
});

type TestCaseFormData = z.infer<typeof testCaseSchema>;

export const PromptTestCaseCreate = (): ReactElement => {
  const { id: promptId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TestCaseFormData>({
    resolver: zodResolver(testCaseSchema),
    defaultValues: {
      name: "",
      description: "",
      expected_output: "",
      tags: [],
      variables: [],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "variables",
  });

  // Fetch prompt metadata to autofill initial variable keys
  useEffect(() => {
    const loadPromptDetails = async () => {
      if (!promptId) return;
      try {
        setIsLoading(true);
        const prompt = await aiService.getPrompt(promptId);
        let initialVariables: Array<{ name: string; value: string; required?: boolean }> = [];

        if (prompt && Array.isArray(prompt.variables)) {
          initialVariables = prompt.variables.map((v: any) => ({
            name: v.name || "",
            value: v.default || "",
            required: !!v.required,
          }));
        }

        reset({
          name: "",
          description: "",
          expected_output: "",
          tags: prompt.tags || [],
          variables: initialVariables,
        });
      } catch (err: any) {
        console.warn("Failed to prefetch prompt variables", err);
        reset({
          name: "",
          description: "",
          expected_output: "",
          tags: [],
          variables: [],
        });
      } finally {
        setIsLoading(false);
      }
    };
    void loadPromptDetails();
  }, [promptId, reset]);

  const onFormSubmit = async (data: TestCaseFormData) => {
    if (!promptId) return;

    // Convert array to Record
    const variablesObject: Record<string, any> = {};
    (data.variables || []).forEach((v) => {
      if (v.name.trim()) {
        variablesObject[v.name.trim()] = v.value || "";
      }
    });

    setIsSubmitting(true);
    try {
      await aiService.createPromptTestCase(promptId, {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        variables: variablesObject,
        expected_output: data.expected_output?.trim() || undefined,
        tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
      });

      showToast.success("Test case created successfully!");
      navigate(`/tenant/ai/prompts/${promptId}/test-cases`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || "Failed to create test case.";
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout currentPage="Prompt Management">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#112868] rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 font-medium">
              Loading prompt template details...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="Prompt Management"
      pageHeader={{
        title: "Create Test Cases",
        description: "Define inputs and expected results to validate how your prompt performs.",
        action: (
          <div className="flex items-center gap-2">
            <SecondaryButton
              onClick={() => navigate(`/tenant/ai/prompts/${promptId}/test-cases`)}
              className="h-10 px-5 min-w-[120px]"
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={handleSubmit(onFormSubmit)}
              disabled={isSubmitting}
              className="h-10 px-5 min-w-[120px]"
            >
              {isSubmitting ? "Creating..." : "Save Test Case"}
            </PrimaryButton>
          </div>
        ),
      }}
    >
      <div className="mb-4">
        <button
          onClick={() => navigate(`/tenant/ai/prompts/${promptId}/test-cases`)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium select-none cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Test Cases
        </button>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="flex items-start gap-6 select-none">
        {/* Left column containing Test Case Information */}
        <div className="flex flex-col gap-6 flex-[2]">
          {/* General Information Card */}
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 select-none">
              General Information
            </h2>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="Name"
                  required
                  placeholder="e.g., Code Review - Security Flaws"
                  error={errors.name?.message}
                  helperText="A memorable name for identifying this test case in evaluations."
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
                  placeholder="Testing the prompt's ability to catch SQL injection..."
                  error={errors.description?.message}
                  helperText="Optional details regarding the scenario being tested."
                />
              )}
            />
          </div>

          {/* Input Variables Section */}
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-sm p-5 overflow-hidden select-none">
            <div className="p-4 bg-white flex items-center justify-between border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800 select-none">
                Input Variables
              </h2>
            </div>

            {/* Column Header Row matching the image */}
            <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-100/80 flex items-center select-none text-slate-400 text-xs font-medium">
              <div className="flex-1 max-w-[32%]">Variable Name</div>
              <div className="flex-1 max-w-[55%] ml-4">Value</div>
              <div className="w-20 ml-auto text-right pr-1">Required</div>
            </div>

            <div className="p-5">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-start gap-4 pb-1 last:pb-0 border-b"
                  >
                    <div className="flex-1 max-w-[32%] h-11 flex items-center">
                      <span className="text-sm font-semibold text-slate-700">
                        {field.name}
                      </span>
                    </div>
                    <div className="flex-1 max-w-[55%]">
                      <Controller
                        name={`variables.${index}.value`}
                        control={control}
                        render={({ field }) => (
                          <FormTextArea
                            {...field}
                            label=""
                            placeholder={`Enter value for ${field.name}...`}
                            error={errors.variables?.[index]?.value?.message}
                            className="pb-0 min-h-[44px]"
                          />
                        )}
                      />
                    </div>
                    <div className="w-20 ml-auto flex items-center justify-end h-11">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          field.required
                            ? "bg-red-50 text-red-600 border border-red-100"
                            : "bg-slate-100 text-slate-500 border border-slate-100"
                        }`}
                      >
                        {field.required ? "Required" : "Optional"}
                      </span>
                    </div>
                  </div>
                ))}
                {fields.length === 0 && (
                  <div className="text-center py-4 select-none">
                    <p className="text-xs text-slate-400 font-medium">
                      No input variables configured.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expected Output Section */}
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 select-none">
              Expected Output
            </h2>
            <Controller
              name="expected_output"
              control={control}
              render={({ field }) => (
                <FormTextArea
                  {...field}
                  label="Expected Full Output (Optional)"
                  placeholder="What response do you expect from the LLM?"
                  error={errors.expected_output?.message}
                  helperText="Optional response string to compare against the model's actual output for evaluation."
                />
              )}
            />
          </div>
        </div>

        {/* Right column containing Organization & Advanced */}
        <div className="flex flex-col gap-6 flex-1 max-w-[320px] w-full select-none">
          {/* Organization / Tags Card */}
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">Organization</h2>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <FormTagInput
                  label="Tags"
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

export default PromptTestCaseCreate;
