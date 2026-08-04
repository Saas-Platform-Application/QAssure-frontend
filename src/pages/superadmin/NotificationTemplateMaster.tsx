import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import { usePermissions } from "@/hooks/usePermissions";
import {
  PrimaryButton,
  DataTable,
  Modal,
  FormField,
  FormSelect,
  FormTextArea,
  RichTextEditor,
  Pagination,
  FilterDropdown,
  type Column,
  SearchBox,
} from "@/components/shared";
import { Plus, Copy, CheckCheck } from "lucide-react";
import { notificationService } from "@/services/notification-service";
import { moduleService } from "@/services/module-service";
import { showToast } from "@/utils/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const templateSchema = z.object({
  category: z.string().min(1, "Category is required"),
  code: z.string().min(1, "Event code is required"),
  name: z.string().min(1, "Friendly name is required"),
  description: z.string().optional(),
  title_template: z.string().min(1, "Title template is required"),
  message_template: z.string().min(1, "Message template is required"),
  email_subject_template: z.string().optional(),
  email_body_template: z.string().optional(),
  default_priority: z.enum(["low", "normal", "high", "urgent"]),
  channels: z.array(z.string()).min(1, "At least one channel is required"),
  is_active: z.boolean(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

// ── Variable Chips ────────────────────────────────────────────────────────────
const VariableChips = ({
  variables,
  onCopy,
}: {
  variables: string[];
  onCopy?: (v: string) => void;
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (v: string) => {
    const placeholder = `{{${v}}}`;
    navigator.clipboard.writeText(placeholder).then(() => {
      setCopied(v);
      onCopy?.(v);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  if (!variables || variables.length === 0) return null;

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
        Available Variables — click to copy placeholder
      </p>
      <div className="flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <button
            key={v}
            type="button"
            title={`Click to copy {{${v}}}`}
            onClick={() => handleCopy(v)}
            className="flex items-center gap-1 text-[11px] font-mono font-semibold bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full hover:bg-indigo-100 hover:border-indigo-400 transition-all shadow-sm"
          >
            {copied === v ? (
              <CheckCheck className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3 opacity-60" />
            )}
            {`{{${v}}}`}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-indigo-400">
        These variables will be replaced with real values when the notification
        is sent.
      </p>
    </div>
  );
};

const NotificationTemplateMaster = (): ReactElement => {
  const { canCreate, canUpdate } = usePermissions();
  const [templates, setTemplates] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Template variable chips (from selected code)
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);

  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");

  // Template Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // HTML body state (managed separately for RichTextEditor)
  const [emailBodyHtml, setEmailBodyHtml] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      category: "",
      title_template: "",
      message_template: "",
      email_subject_template: "",
      email_body_template: "",
      default_priority: "normal",
      channels: ["in_app", "email"],
      is_active: true,
    },
  });

  const channels = watch("channels");
  const categoryValue = watch("category");
  const codeValue = watch("code");
  const priorityValue = watch("default_priority");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tRes, cRes, mRes] = await Promise.all([
        notificationService.getSuperAdminTemplates({
          limit,
          offset: (currentPage - 1) * limit,
          search,
          module_id: selectedModule || undefined,
        }),
        notificationService.getCategories({ limit: 100 }),
        moduleService.getDropdown(),
      ]);

      if (tRes.success) {
        setTemplates(tRes.data);
        setTotalItems(tRes.pagination?.total || tRes.data.length);
        setTotalPages(tRes.pagination?.pages || 1);
      }
      if (cRes.success) setCategories(cRes.data);
      if (mRes.success) setModules(mRes.data);
    } catch (err: any) {
      showToast.error(err.message || "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, limit, search, selectedModule]);

  const fetchCodesForCategory = async (categoryCode: string) => {
    if (!categoryCode) return;
    try {
      const res = await notificationService.getCodesByCategory(categoryCode, {
        limit: 100,
      });
      if (res.success) setCodes(res.data);
    } catch (e) {
      console.error("Failed to load codes:", e);
    }
  };

  const handleCategorySelect = async (categoryCode: string) => {
    setValue("category", categoryCode, { shouldValidate: true });
    setValue("code", "", { shouldValidate: true });
    setTemplateVariables([]);
    await fetchCodesForCategory(categoryCode);
  };

  const handleCodeSelect = (val: string) => {
    const selectedCode = codes.find((c) => c.code === val);
    setValue("code", val, { shouldValidate: true });
    if (selectedCode?.name)
      setValue("name", selectedCode.name, { shouldValidate: true });
    // Load variables for this code
    const vars = Array.isArray(selectedCode?.variables)
      ? selectedCode.variables
      : [];
    setTemplateVariables(vars);
  };

  const onSave = async (data: TemplateFormValues) => {
    try {
      const payload = { ...data, email_body_template: emailBodyHtml };
      if (editingId) {
        await notificationService.updateTemplate(editingId, payload);
      } else {
        await notificationService.createTemplate(payload);
      }
      showToast.success(editingId ? "Template updated" : "Template created");
      setModalOpen(false);
      reset();
      setEmailBodyHtml("");
      setTemplateVariables([]);
      fetchData();
    } catch (err: any) {
      showToast.error(
        err.response?.data?.error?.message || err.message || "Action failed",
      );
    }
  };

  const openEditModal = (t: any) => {
    setEditingId(t.id);
    const vars = Array.isArray(t.variables) ? t.variables : [];
    setTemplateVariables(vars);
    setEmailBodyHtml(t.email_body_template || "");
    reset({
      code: t.code || "",
      name: t.name || "",
      description: t.description || "",
      category: t.category || "",
      title_template: t.title_template || "",
      message_template: t.message_template || "",
      email_subject_template: t.email_subject_template || "",
      email_body_template: t.email_body_template || "",
      default_priority: (t.default_priority || "normal") as any,
      channels: t.channels || ["in_app", "email"],
      is_active: t.is_active ?? true,
    });
    // Load codes for the category so user can change code
    if (t.category) fetchCodesForCategory(t.category);
    setModalOpen(true);
  };

  const columns: Column<any>[] = [
    {
      key: "category",
      label: "Category",
      render: (t) => (
        <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded">
          {t.category_name}
        </span>
      ),
    },
    {
      key: "code",
      label: "Code",
      render: (t) => (
        <code className="text-xs font-mono font-bold text-gray-700">
          {t.code}
        </code>
      ),
    },
    {
      key: "name",
      label: "Friendly Name",
      render: (t) => <span className="text-sm font-medium">{t.name}</span>,
    },
    {
      key: "variables",
      label: "Variables",
      render: (t) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(t.variables) && t.variables.length > 0 ? (
            t.variables
              .slice(0, 3)
              .map((v: string) => (
                <span
                  key={v}
                  className="text-[9px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full border border-indigo-100"
                >{`{{${v}}}`}</span>
              ))
          ) : (
            <span className="text-[10px] text-gray-300 italic">none</span>
          )}
          {Array.isArray(t.variables) && t.variables.length > 3 && (
            <span className="text-[9px] text-gray-400">
              +{t.variables.length - 3} more
            </span>
          )}
        </div>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      render: (t) => (
        <span className="capitalize text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
          {t.default_priority}
        </span>
      ),
    },
    {
      key: "channels",
      label: "Channels",
      render: (t) => (
        <div className="flex gap-1">
          {t.channels?.map((c: string) => (
            <span
              key={c}
              className="text-[9px] bg-green-50 text-green-700 px-1 rounded border border-green-200 uppercase"
            >
              {c}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (t) => (
        canUpdate("notifications") ? (
          <button
            onClick={() => openEditModal(t)}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            Edit
          </button>
        ) : null
      ),
    },
  ];

  return (
    <Layout
      currentPage="Global Templates"
      pageHeader={{
        title: "Global Notification Templates",
        description: "Define default notification templates for all tenants.",
      }}
    >
      <div className="overflow-hidden flex flex-col min-h-[600px]">
        <div className="pb-2 flex flex-wrap justify-between items-center bg-gray-50/50 gap-4">
          <div className="flex items-center gap-4 flex-1">
            <SearchBox
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search templates..."
              containerClassName="relative flex-1 max-w-sm"
            />

            <div className="flex items-center gap-2">
              <div className="w-full">
                <FilterDropdown
                  label="Module"
                  value={selectedModule}
                  onChange={(val) => {
                    setSelectedModule(val as string | null);
                    setCurrentPage(1);
                  }}
                  options={modules.map((m) => ({ value: m.id, label: m.name }))}
                  placeholder="All Modules"
                  isSearchable
                />
              </div>
            </div>
          </div>
          {canCreate("notifications") && (
            <PrimaryButton
              onClick={() => {
                setEditingId(null);
                setTemplateVariables([]);
                setEmailBodyHtml("");
                reset({
                  code: "",
                  name: "",
                  description: "",
                  category: "",
                  title_template: "",
                  message_template: "",
                  email_subject_template: "",
                  email_body_template: "",
                  default_priority: "normal",
                  channels: ["in_app", "email"],
                  is_active: true,
                });
                setModalOpen(true);
              }}
              className="flex gap-2"
            >
              <Plus className="w-4 h-4" /> New Template
            </PrimaryButton>
          )}
        </div>

        <div className="flex-1">
          <DataTable
            columns={columns}
            data={templates}
            isLoading={isLoading}
            keyExtractor={(t) => t.id}
          />
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPageChange={setCurrentPage}
          onLimitChange={(l) => {
            setLimit(l);
            setCurrentPage(1);
          }}
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Notification Template" : "Create New Template"}
        maxWidth="2xl"
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="px-5 py-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleSubmit(onSave)} className="px-10">
              {editingId ? "Update Template" : "Create Template"}
            </PrimaryButton>
          </>
        }
      >
        <div className="p-6 space-y-6">
          {/* ── Identification ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Identification
              </h3>
              <FormSelect
                label="Category"
                required
                value={categoryValue}
                onValueChange={handleCategorySelect}
                options={categories.map((c) => ({
                  value: c.code,
                  label: c.name,
                }))}
                error={errors.category?.message}
                placeholder="Select Category"
              />
              <FormSelect
                label="Event Code"
                required
                value={codeValue}
                onValueChange={handleCodeSelect}
                options={codes.map((c) => ({
                  value: c.code,
                  label: `${c.name} (${c.code})`,
                }))}
                disabled={!categoryValue}
                error={errors.code?.message}
                placeholder="Select Event Code"
              />
              <FormField
                label="Friendly Name"
                required
                error={errors.name?.message}
                placeholder="e.g. Project Assigned"
                {...register("name")}
              />
              <FormTextArea
                label="Description"
                error={errors.description?.message}
                rows={2}
                {...register("description")}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Priority"
                  value={priorityValue}
                  onValueChange={(val) =>
                    setValue("default_priority", val as any, {
                      shouldValidate: true,
                    })
                  }
                  options={[
                    { value: "low", label: "Low" },
                    { value: "normal", label: "Normal" },
                    { value: "high", label: "High" },
                    { value: "urgent", label: "Urgent" },
                  ]}
                  error={errors.default_priority?.message}
                />
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">
                    Channels
                  </label>
                  <div className="flex gap-4 items-center h-10 px-1">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={channels.includes("in_app")}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...channels, "in_app"]
                            : channels.filter((c) => c !== "in_app");
                          setValue("channels", next, { shouldValidate: true });
                        }}
                      />{" "}
                      In-App
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={channels.includes("email")}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...channels, "email"]
                            : channels.filter((c) => c !== "email");
                          setValue("channels", next, { shouldValidate: true });
                        }}
                      />{" "}
                      Email
                    </label>
                  </div>
                  {errors.channels && (
                    <p className="text-xs text-red-500">
                      {errors.channels.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Variable Chips */}
              <VariableChips variables={templateVariables} />
            </div>
          </div>

          {/* ── In-App Content ─────────────────────────────────────── */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
              In-App Content
            </h3>
            <FormField
              label="Title Template"
              required
              error={errors.title_template?.message}
              placeholder="e.g. Task Assigned: {{task_name}}"
              {...register("title_template")}
            />
            <FormTextArea
              label="Message Template"
              required
              error={errors.message_template?.message}
              placeholder="Use {{var}} for dynamic data"
              rows={3}
              {...register("message_template")}
            />
          </div>

          {/* ── Email Content (HTML Editor) ────────────────────────── */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
              Email Content
            </h3>
            <FormField
              label="Email Subject"
              error={errors.email_subject_template?.message}
              placeholder="Leave blank to use In-App title"
              {...register("email_subject_template")}
            />
            <RichTextEditor
              label="Email Body (HTML)"
              value={emailBodyHtml}
              onChange={(html) => setEmailBodyHtml(html)}
              placeholder="Design your email body here... Use {{variable}} placeholders."
              minHeightClassName="min-h-[200px]"
            />
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default NotificationTemplateMaster;
