import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  PrimaryButton,
  DataTable,
  Modal,
  FormField,
  FormTextArea,
  FormSelect,
  RichTextEditor,
  StatusBadge,
  Pagination,
  type Column,
} from "@/components/shared";
import {
  Edit,
  RotateCcw,
  Building,
  Filter,
  Copy,
  CheckCheck,
} from "lucide-react";
import { notificationService } from "@/services/notification-service";
import { moduleService } from "@/services/module-service";
import { showToast } from "@/utils/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const overrideSchema = z.object({
  title_template: z.string().min(1, "Title template is required"),
  message_template: z.string().min(1, "Message template is required"),
  email_subject_template: z.string().optional(),
  email_body_template: z.string().optional(),
  is_active: z.boolean(),
});

type OverrideFormValues = z.infer<typeof overrideSchema>;

// ── Variable Chips ────────────────────────────────────────────────────────────
const VariableChips = ({ variables }: { variables: string[] }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (v: string) => {
    navigator.clipboard.writeText(`{{${v}}}`).then(() => {
      setCopied(v);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  if (!variables || variables.length === 0) return null;

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
        Available Variables — click to copy
      </p>
      <div className="flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => handleCopy(v)}
            className="flex items-center gap-1 text-[11px] font-mono font-semibold bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-all shadow-sm"
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
        Use these in title, message, subject and email body fields above.
      </p>
    </div>
  );
};

const NotificationTemplates = (): ReactElement => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Override Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // HTML body state for rich editor
  const [emailBodyHtml, setEmailBodyHtml] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      title_template: "",
      message_template: "",
      email_subject_template: "",
      email_body_template: "",
      is_active: true,
    },
  });

  const fetchModules = async () => {
    try {
      const res = await moduleService.getMyModules();
      if (res.success) setModules(res.data);
    } catch (err) {
      console.error("Failed to fetch modules:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await notificationService.getTemplates({
        limit,
        offset: (currentPage - 1) * limit,
        module_id: selectedModule === "all" ? undefined : selectedModule,
      });
      if (res.success) {
        setTemplates(res.data);
        setTotalItems(res.pagination?.total || res.data.length);
        setTotalPages(res.pagination?.pages || 1);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to load templates",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);
  useEffect(() => {
    fetchTemplates();
  }, [currentPage, limit, selectedModule]);

  const openEditModal = (t: any) => {
    setSelectedTemplate(t);
    setEmailBodyHtml(t.email_body_template || "");
    reset({
      title_template: t.title_template,
      message_template: t.message_template,
      email_subject_template: t.email_subject_template || "",
      email_body_template: t.email_body_template || "",
      is_active: t.is_active,
    });
    setModalOpen(true);
  };

  const onOverride = async (data: OverrideFormValues) => {
    try {
      await notificationService.overrideTemplate(selectedTemplate.code, {
        ...data,
        email_body_template: emailBodyHtml,
      });
      showToast.success("Template override saved");
      setModalOpen(false);
      reset();
      setEmailBodyHtml("");
      fetchTemplates();
    } catch (err: any) {
      showToast.error(
        err.response?.data?.error?.message || err.message || "Action failed",
      );
    }
  };

  const handleReset = async (code: string) => {
    if (
      !confirm(
        "Are you sure you want to reset this template to the global default? Your custom changes will be lost.",
      )
    )
      return;
    try {
      await notificationService.resetTemplate(code);
      showToast.success("Template reset to default");
      fetchTemplates();
    } catch (err: any) {
      showToast.error(err.message || "Reset failed");
    }
  };

  const columns: Column<any>[] = [
    {
      key: "category",
      label: "Category",
      render: (t) => (
        <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {t.category_name}
        </span>
      ),
    },
    {
      key: "code",
      label: "Event",
      render: (t) => <span className="">{t.code}</span>,
    },
    {
      key: "source",
      label: "Source",
      render: (t) => (
        <StatusBadge variant={t.tenant_id ? "success" : "process"}>
          {t.tenant_id ? "Custom Override" : "System Default"}
        </StatusBadge>
      ),
    },
    {
      key: "preview",
      label: "Title Preview",
      render: (t) => (
        <span className="">
          {t.title_template}
        </span>
      ),
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
      key: "actions",
      label: "Actions",
      align: "right",
      render: (t) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => openEditModal(t)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1"
          >
            <Edit className="w-4 h-4" />{" "}
            <span className="text-xs font-semibold uppercase">Edit</span>
          </button>
          {t.tenant_id && (
            <button
              onClick={() => handleReset(t.code)}
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-md transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />{" "}
              <span className="text-xs font-semibold uppercase">Reset</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout
      currentPage="Notification Templates"
      pageHeader={{
        title: "Custom Notifications",
        description:
          "Customize the content and delivery of platform notifications for your organization.",
      }}
    >
      <div className="overflow-hidden">
        <div className="pb-2 flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              Notification Templates
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter by Module
            </div>
            <div className="w-full">
              <FormSelect
                label=""
                value={selectedModule}
                onValueChange={(val) => {
                  setSelectedModule(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "all", label: "All Modules" },
                  ...modules.map((m) => ({ value: m.id, label: m.name })),
                ]}
                placeholder="Select Module"
              />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <DataTable
            columns={columns}
            data={templates}
            isLoading={isLoading}
            keyExtractor={(t) => t.code}
            error={error}
            emptyMessage="No templates found"
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
        title={`Customize: ${selectedTemplate?.code}`}
        maxWidth="2xl"
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleSubmit(onOverride)} className="px-8">
              Save Override
            </PrimaryButton>
          </>
        }
      >
        <div className="p-6 space-y-6">
          {/* Variable chips */}
          {selectedTemplate && (
            <VariableChips
              variables={
                Array.isArray(selectedTemplate?.variables)
                  ? selectedTemplate.variables
                  : []
              }
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                In-App Notification
              </h3>
              <FormField
                label="Title Template"
                required
                error={errors.title_template?.message}
                {...register("title_template")}
              />
              <FormTextArea
                label="Message Template"
                required
                error={errors.message_template?.message}
                rows={4}
                {...register("message_template")}
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Email Notification
              </h3>
              <FormField
                label="Email Subject"
                error={errors.email_subject_template?.message}
                placeholder="Inherits from title if blank"
                {...register("email_subject_template")}
              />
            </div>
          </div>

          {/* Full-width HTML body editor */}
          <div className="space-y-2 pt-2 border-t">
            <RichTextEditor
              label="Email Body (HTML)"
              value={emailBodyHtml}
              onChange={(html) => setEmailBodyHtml(html)}
              placeholder="Design your email body here... Use {{variable}} placeholders."
              minHeightClassName="min-h-[220px]"
            />
          </div>

          {/* <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={handleSubmit(onOverride)}
                className="px-8"
              >
                Save Override
              </PrimaryButton>
            </div>
          </div> */}
        </div>
      </Modal>
    </Layout>
  );
};

export default NotificationTemplates;
