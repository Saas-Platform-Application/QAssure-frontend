import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import type { ReactElement } from "react";
import { useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { usePermissions } from "@/hooks/usePermissions";
import {
  PrimaryButton,
  DataTable,
  ActionDropdown,
  DeleteConfirmationModal,
  Modal,
  FormField,
  FormTextArea,
  FormSelect,
  FilterDropdown,
  Pagination,
  type Column,
  SearchBox,
} from "@/components/shared";
import { Plus, Code, X, Tag } from "lucide-react";
import { notificationService } from "@/services/notification-service";
import { moduleService } from "@/services/module-service";
import { showToast } from "@/utils/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  code: z
    .string()
    .min(1, "Category slug is required")
    .regex(
      /^[a-z0-9_]+$/,
      "Slug must be lowercase alphanumeric with underscores",
    ),
  description: z.string().optional(),
  module_id: z.string().optional(),
});

const codeSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  name: z.string().min(1, "Display name is required").max(100),
  description: z.string().optional(),
  default_channels: z.array(z.string()),
  default_priority: z.string(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;
type CodeFormValues = z.infer<typeof codeSchema>;

// ── Variable Tag Input ──────────────────────────────────────────────────────
const VariableTagInput = ({
  variables,
  onChange,
}: {
  variables: string[];
  onChange: (vars: string[]) => void;
}) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (val: string) => {
    const tag = val.trim().replace(/\s+/g, "_").toLowerCase();
    if (tag && !variables.includes(tag)) {
      onChange([...variables, tag]);
    }
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && variables.length > 0) {
      onChange(variables.slice(0, -1));
    }
  };

  const removeTag = (tag: string) =>
    onChange(variables.filter((v) => v !== tag));

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        <span className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-indigo-500" />
          Supported Variables
          <span className="text-gray-400 font-normal">
            (used in template placeholders)
          </span>
        </span>
      </label>
      <div
        className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg bg-white min-h-[42px] cursor-text focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        {variables.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
          >
            {`{{${v}}}`}
            <button
              type="button"
              onClick={() => removeTag(v)}
              className="hover:text-red-600 transition-colors ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input && addTag(input)}
          placeholder={
            variables.length === 0
              ? "Type variable name, press Enter or comma..."
              : ""
          }
          className="flex-1 min-w-[120px] text-xs outline-none bg-transparent text-gray-700 placeholder-gray-300"
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">
        These are the <code>{"{{variable}}"}</code> placeholders admins can use
        in templates for this event code.
      </p>
    </div>
  );
};

const NotificationMaster = (): ReactElement => {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const location = useLocation();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Pagination & Search for Categories
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);

  // Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const {
    register: registerCategory,
    handleSubmit: handleCategorySubmit,
    reset: resetCategory,
    setValue: setCategoryValue,
    formState: { errors: categoryErrors },
    watch: watchCategory,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", code: "", description: "", module_id: "" },
  });

  // View Mode
  const [viewMode, setViewMode] = useState<"categories" | "codes">(
    "categories",
  );
  const [codeFormModalOpen, setCodeFormModalOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [isCodesLoading, setIsCodesLoading] = useState<boolean>(false);

  // Pagination for Codes
  const [codePage, setCodePage] = useState(1);
  const [codeTotal, setCodeTotal] = useState(0);
  const [codePages, setCodePages] = useState(0);
  const [codeLimit, setCodeLimit] = useState(5);

  const [editingCode, setEditingCode] = useState<any>(null);
  const [codeVariables, setCodeVariables] = useState<string[]>([]);

  const {
    register: registerCode,
    handleSubmit: handleCodeSubmit,
    reset: resetCode,
    formState: { errors: codeErrors },
  } = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      default_channels: ["in_app", "email"],
      default_priority: "normal",
    },
  });

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    type: "category" | "code";
  } | null>(null);

  const [modules, setModules] = useState<any[]>([]);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await notificationService.getCategories({
        limit,
        offset: (currentPage - 1) * limit,
        search,
        module_id: moduleFilter || undefined,
      });
      if (res.success) {
        setCategories(res.data);
        setTotalItems(res.pagination?.total || res.data.length);
        setTotalPages(res.pagination?.pages || 1);
      }
    } catch (err: any) {
      showToast.error(err.message || "Failed to fetch categories");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await moduleService.getDropdown();
      if (res.success) setModules(res.data);
    } catch (err) {
      console.error("Failed to fetch modules", err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchModules();
  }, [currentPage, limit, search, moduleFilter]);

  useEffect(() => {
    setViewMode("categories");
  }, [location]);

  const fetchCodes = async (
    category: any,
    page: number = 1,
    currentLimit: number = codeLimit,
  ) => {
    try {
      setIsCodesLoading(true);
      const res = await notificationService.getCodesByCategory(category.id, {
        limit: currentLimit,
        offset: (page - 1) * currentLimit,
      });
      if (res.success) {
        setCodes(res.data);
        setCodeTotal(res.pagination?.total || res.data.length);
        setCodePages(res.pagination?.pages || 1);
      }
    } catch (err: any) {
      showToast.error("Failed to fetch codes");
    } finally {
      setIsCodesLoading(false);
    }
  };

  const handleOpenCodes = async (category: any) => {
    setSelectedCategory(category);
    setCodePage(1);
    setEditingCode(null);
    setCodeVariables([]);
    resetCode({
      code: "",
      name: "",
      description: "",
      default_channels: ["in_app", "email"],
      default_priority: "normal",
    });
    await fetchCodes(category, 1, codeLimit);
    setViewMode("codes");
  };

  useEffect(() => {
    if (selectedCategory && viewMode === "codes") {
      fetchCodes(selectedCategory, codePage, codeLimit);
    }
  }, [codePage, codeLimit, selectedCategory, viewMode]);

  const onSaveCategory = async (data: CategoryFormValues) => {
    try {
      const payload = { ...data };
      if (!payload.module_id) delete payload.module_id;

      if (editingCategory) {
        await notificationService.updateCategory(editingCategory.id, payload);
        showToast.success("Category updated");
      } else {
        await notificationService.createCategory(payload);
        showToast.success("Category created");
      }
      setCategoryModalOpen(false);
      resetCategory();
      fetchCategories();
    } catch (err: any) {
      showToast.error(
        err.response?.data?.error?.message || err.message || "Action failed",
      );
    }
  };

  const onSaveCode = async (data: CodeFormValues) => {
    try {
      const payload = { ...data, variables: codeVariables };
      if (editingCode) {
        await notificationService.updateCode(editingCode.id, payload);
        showToast.success("Code updated");
      } else {
        await notificationService.createCode(selectedCategory.id, payload);
        showToast.success("Code created");
      }
      setEditingCode(null);
      setCodeVariables([]);
      resetCode({
        code: "",
        name: "",
        description: "",
        default_channels: ["in_app", "email"],
        default_priority: "normal",
      });
      setCodeFormModalOpen(false);
      fetchCodes(selectedCategory, codePage);
      fetchCategories();
    } catch (err: any) {
      showToast.error(
        err.response?.data?.error?.message || err.message || "Action failed",
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "category") {
        await notificationService.deleteCategory(deleteTarget.id);
        fetchCategories();
      } else {
        await notificationService.deleteCode(deleteTarget.id);
        fetchCodes(selectedCategory, codePage);
        fetchCategories();
      }
      setDeleteModalOpen(false);
      showToast.success(
        `${deleteTarget.type === "category" ? "Category" : "Code"} deleted`,
      );
    } catch (err: any) {
      showToast.error(err.message || "Delete failed");
    }
  };

  const columns: Column<any>[] = [
    {
      key: "name",
      label: "Category Name",
      render: (c) => (
        <span className="font-semibold text-[#0f1724]">{c.name}</span>
      ),
    },
    {
      key: "code",
      label: "Slug / Code",
      render: (c) => (
        <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-600">
          {c.code}
        </code>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (c) => (
        <span className="text-xs text-gray-500 line-clamp-1">
          {c.description || "-"}
        </span>
      ),
    },
    {
      key: "module_id",
      label: "Assoc. Module",
      render: (c) => (
        <span className="text-[10px] text-blue-500 font-bold uppercase">
          {c.module_code || "System"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-3 items-center">
          <button
            onClick={() => handleOpenCodes(c)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase"
          >
            <Code className="w-3.5 h-3.5" />
            Codes ({c.code_count || 0})
          </button>
          <ActionDropdown
            onEdit={
              canUpdate("notifications")
                ? () => {
                    setEditingCategory(c);
                    resetCategory({
                      name: c.name,
                      code: c.code,
                      description: c.description || "",
                      module_id: c.module_id || "",
                    });
                    setCategoryModalOpen(true);
                  }
                : undefined
            }
            onDelete={
              canDelete("notifications")
                ? () => {
                    setDeleteTarget({ id: c.id, name: c.name, type: "category" });
                    setDeleteModalOpen(true);
                  }
                : undefined
            }
          />
        </div>
      ),
    },
  ];

  const codeColumns: Column<any>[] = [
    {
      key: "code",
      label: "Trigger Code",
      render: (c) => (
        <code className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
          {c.code}
        </code>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (c) => (
        <span className="font-semibold text-[#0f1724]">{c.name}</span>
      ),
    },
    {
      key: "variables",
      label: "Variables",
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(c.variables) && c.variables.length > 0 ? (
            c.variables.map((v: string) => (
              <span
                key={v}
                className="text-[10px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full"
              >
                {`{{${v}}}`}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-gray-300 italic">none</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-3 whitespace-nowrap">
          {canUpdate("notifications") && (
            <button
              onClick={() => {
                setEditingCode(c);
                setCodeVariables(Array.isArray(c.variables) ? c.variables : []);
                resetCode({
                  code: c.code,
                  name: c.name,
                  description: c.description || "",
                  default_channels: c.default_channels,
                  default_priority: c.default_priority,
                });
                setCodeFormModalOpen(true);
              }}
              className="text-blue-600 hover:text-blue-800 font-bold text-[11px] uppercase"
            >
              Edit
            </button>
          )}
          {canDelete("notifications") && (
            <button
              onClick={() => {
                setDeleteTarget({
                  id: c.id,
                  name: c.code,
                  type: "code",
                });
                setDeleteModalOpen(true);
              }}
              className="text-red-500 hover:text-red-700 font-bold text-[11px] uppercase"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  const breadcrumbs =
    viewMode === "codes"
      ? [
          { label: "Notification Master", path: "/notification-master" },
          { label: `Event Codes (${selectedCategory?.name})` },
        ]
      : [{ label: "Notification Master" }];

  return (
    <Layout
      currentPage="Notification Master"
      breadcrumbs={breadcrumbs}
      pageHeader={{
        title:
          viewMode === "codes"
            ? `Event Codes: ${selectedCategory?.name}`
            : "Notification Master Management",
        description:
          viewMode === "codes"
            ? `Manage event trigger codes and variables for the ${selectedCategory?.name} category.`
            : "Manage notification categories and event codes across the platform.",
        action:
          viewMode === "codes" ? (
            <div className="flex gap-3">
              <button
                onClick={() => setViewMode("categories")}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-all shadow-sm"
              >
                ← Back to Categories
              </button>
              {canCreate("notifications") && (
                <PrimaryButton
                  onClick={() => {
                    setEditingCode(null);
                    setCodeVariables([]);
                    resetCode({
                      code: "",
                      name: "",
                      description: "",
                      default_channels: ["in_app", "email"],
                      default_priority: "normal",
                    });
                    setCodeFormModalOpen(true);
                  }}
                  className="flex gap-2"
                >
                  <Plus className="w-4 h-4" /> New Code
                </PrimaryButton>
              )}
            </div>
          ) : undefined,
      }}
    >
      {viewMode === "categories" ? (
        <div className="overflow-hidden flex flex-col min-h-[500px]">
          <div className="pb-2 flex flex-wrap justify-between items-center bg-gray-50/50 gap-4">
            <div className="flex items-center gap-4 flex-1">
              <SearchBox
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setCurrentPage(1);
                }}
                placeholder="Search categories..."
                containerClassName="relative flex-1 max-w-sm"
              />

              <FilterDropdown
                label="Module"
                value={moduleFilter}
                onChange={(val) => {
                  setModuleFilter(val as string | null);
                  setCurrentPage(1);
                }}
                options={modules.map((m) => ({ value: m.id, label: m.name }))}
                placeholder="All Modules"
                isSearchable
              />
            </div>
            {canCreate("notifications") && (
              <PrimaryButton
                onClick={() => {
                  setEditingCategory(null);
                  resetCategory({
                    name: "",
                    code: "",
                    description: "",
                    module_id: "",
                  });
                  setCategoryModalOpen(true);
                }}
                className="flex gap-2"
              >
                <Plus className="w-4 h-4" /> New Category
              </PrimaryButton>
            )}
          </div>

          {/* <div className="flex-1"> */}
            <DataTable
              columns={columns}
              data={categories}
              isLoading={isLoading}
              keyExtractor={(c) => c.id}
            />
          {/* </div> */}

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
      ) : (
        <>
          <DataTable
            columns={codeColumns}
            data={codes}
            isLoading={isCodesLoading}
            keyExtractor={(c) => c.id}
            emptyMessage="No codes registered for this category."
          />

          <Pagination
            currentPage={codePage}
            totalPages={codePages}
            totalItems={codeTotal}
            limit={codeLimit}
            onPageChange={setCodePage}
            onLimitChange={(l) => {
              setCodeLimit(l);
              setCodePage(1);
            }}
          />
        </>
      )}

      {/* Category Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? "Edit Category" : "New Category"}
        maxWidth="lg"
        footer={
          <>
            <button
              onClick={() => setCategoryModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleCategorySubmit(onSaveCategory)}>
              {editingCategory ? "Update" : "Create"}
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Category Name"
            required
            placeholder="e.g. Workflow"
            error={categoryErrors.name?.message}
            {...registerCategory("name")}
          />
          <FormField
            label="Slug (Code)"
            required
            placeholder="e.g. workflow"
            error={categoryErrors.code?.message}
            {...registerCategory("code")}
          />
        </div>
        <FormTextArea
          label="Description"
          rows={2}
          error={categoryErrors.description?.message}
          {...registerCategory("description")}
        />
        <FormSelect
          label="Associated Module"
          value={watchCategory("module_id")}
          options={[
            { value: "", label: "System (No Module)" },
            ...modules.map((m) => ({ value: m.id, label: m.name })),
          ]}
          onValueChange={(val) =>
            setCategoryValue("module_id", val, { shouldValidate: true })
          }
          placeholder="Select a module"
          error={categoryErrors.module_id?.message}
        />
      </Modal>

      {/* Code Form Modal */}
      <Modal
        isOpen={codeFormModalOpen}
        onClose={() => {
          setCodeFormModalOpen(false);
          setEditingCode(null);
          setCodeVariables([]);
          resetCode({
            code: "",
            name: "",
            description: "",
            default_channels: ["in_app", "email"],
            default_priority: "normal",
          });
        }}
        title={editingCode ? "Edit Event Code" : "Add New Event Trigger"}
        maxWidth="lg"
        footer={
          <>
            <button
              onClick={() => {
                setCodeFormModalOpen(false);
                setEditingCode(null);
                setCodeVariables([]);
                resetCode({
                  code: "",
                  name: "",
                  description: "",
                  default_channels: ["in_app", "email"],
                  default_priority: "normal",
                });
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleCodeSubmit(onSaveCode)}>
              {editingCode ? "Update Code" : "Add Code"}
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Code (e.g. task_assigned)"
            required
            error={codeErrors.code?.message}
            disabled={!!editingCode}
            {...registerCode("code")}
          />
          <FormField
            label="Display Name"
            required
            error={codeErrors.name?.message}
            {...registerCode("name")}
          />
        </div>
        <FormTextArea
          label="Description"
          rows={2}
          error={codeErrors.description?.message}
          {...registerCode("description")}
        />

        {/* Variables tag input */}
        <VariableTagInput
          variables={codeVariables}
          onChange={setCodeVariables}
        />

        <div className="text-[10px] text-gray-400 font-medium">
          Auto-populates default channels (In-App, Email)
        </div>
      </Modal>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.type}`}
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        itemName={deleteTarget?.name || ""}
      />
    </Layout>
  );
};

export default NotificationMaster;
