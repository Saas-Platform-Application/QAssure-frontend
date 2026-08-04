import { useEffect, useMemo, useState, type ReactElement } from "react";
// import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  FormField,
  FormSelect,
  FormTextArea,
  PrimaryButton,
  Modal,
  ActionDropdown,
  DeleteConfirmationModal,
  type Column,
  SecondaryButton,
} from "@/components/shared";
import { documentService } from "@/services/document-service";
import type { DocumentCategory } from "@/types/document";
import { showToast } from "@/utils/toast";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import CodeBadge from "@/components/shared/CodeBadge";
import { usePermissions } from "@/hooks/usePermissions";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  reviewFrequency: z.string().min(1, "Review frequency is required"),
  retentionYears: z.string().min(1, "Retention years is required"),
  requiresTraining: z.boolean().optional(),
  parentId: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const DocumentCategories = (): ReactElement => {
  // const navigate = useNavigate();
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<DocumentCategory | null>(null);
  const [viewingCategory, setViewingCategory] =
    useState<DocumentCategory | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<DocumentCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { canCreate } = usePermissions();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      reviewFrequency: "12",
      retentionYears: "7",
      requiresTraining: false,
      parentId: "",
    },
  });

  const loadCategories = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await documentService.getCategories();
      setCategories(response.data || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to load categories",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const handleEdit = (category: DocumentCategory) => {
    setEditingCategory(category);
    setValue("name", category.name);
    setValue("code", category.code);
    setValue("description", category.description || "");
    setValue(
      "reviewFrequency",
      category.review_frequency_months?.toString() || "12",
    );
    setValue("retentionYears", category.retention_years?.toString() || "7");
    setValue("requiresTraining", !!category.requires_training);
    setValue("parentId", category.parent_id || "");
    setIsModalOpen(true);
  };

  const handleView = (category: DocumentCategory) => {
    setViewingCategory(category);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (category: DocumentCategory) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      setIsDeleting(true);
      await documentService.deleteCategory(categoryToDelete.id);
      showToast.success("Category deleted successfully");
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
      await loadCategories();
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message || "Failed to delete category",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<DocumentCategory>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        render: (cat) => <span className="">{cat.name}</span>,
      },
      {
        key: "code",
        label: "Code",
        render: (cat) => <CodeBadge label={cat.code} />,
      },
      {
        key: "review_frequency_months",
        label: "Review Frequency",
        render: (category) =>
          category.review_frequency_months
            ? `${category.review_frequency_months} months`
            : "-",
      },
      {
        key: "parent_id",
        label: "Parent Category",
        render: (category) => {
          const parent = categories.find((c) => c.id === category.parent_id);
          return (
            <span className="text-[#6b7280]">{parent ? parent.name : "-"}</span>
          );
        },
      },
      {
        key: "retention_years",
        label: "Retention",
        render: (category) =>
          category.retention_years ? `${category.retention_years} years` : "-",
      },
      {
        key: "requires_training",
        label: "Requires Training",
        render: (category) => (
          <div className="flex items-center">
            <div
              className={cn(
                "w-10 h-5 rounded-full relative transition-colors duration-200 pointer-events-none",
                category.requires_training ? "bg-[#084cc8]" : "bg-gray-200",
              )}
            >
              <div
                className={cn(
                  "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm",
                  category.requires_training && "translate-x-5",
                )}
              />
            </div>
          </div>
        ),
      },
      {
        key: "description",
        label: "Description",
        render: (category) => (
          <span className="text-gray-500 line-clamp-1 max-w-[300px]">
            {category.description || "-"}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        render: (category) => (
          <ActionDropdown
            actions={[
              {
                label: "View Details",
                onClick: () => handleView(category),
                icon: <Eye className="w-4 h-4" />,
              },
              ...(canCreate("document")
                ? [
                    {
                      label: "Edit Category",
                      onClick: () => handleEdit(category),
                      icon: <Edit className="w-4 h-4" />,
                    },
                    {
                      label: "Delete",
                      onClick: () => handleDeleteClick(category),
                      icon: <Trash2 className="w-4 h-4" />,
                      variant: "danger" as const,
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ],
    [categories],
  );

  const onFormSubmit = async (data: CategoryFormData): Promise<void> => {
    try {
      setIsSubmitting(true);
      const payload = {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim() || undefined,
        review_frequency_months: parseInt(data.reviewFrequency),
        retention_years: parseInt(data.retentionYears),
        requires_training: data.requiresTraining,
        parent_id: data.parentId || null,
      };

      if (editingCategory) {
        await documentService.updateCategory(editingCategory.id, payload);
        showToast.success("Category updated");
      } else {
        await documentService.createCategory(payload);
        showToast.success("Category created");
      }

      setIsModalOpen(false);
      reset();
      setEditingCategory(null);
      await loadCategories();
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message || "Failed to process category",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout
      currentPage="Document Service"
      pageHeader={{
        title: "Document Categories",
        description:
          "View and manage the document categories and their retention policies.",
        action: canCreate("document") && (
          <PrimaryButton
            onClick={() => {
              setEditingCategory(null);
              reset();
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Category
          </PrimaryButton>
        ),
      }}
    >
      <div className="space-y-4">
        <div className="overflow-hidden">
          <DataTable
            data={categories}
            columns={columns}
            keyExtractor={(category) => category.id}
            emptyMessage="No categories found"
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        title={
          editingCategory
            ? "Update Document Category"
            : "Create Document Category"
        }
        maxWidth="lg"
        footer={
          <>
            <SecondaryButton
              onClick={() => {
                setIsModalOpen(false);
                setEditingCategory(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={handleSubmit(onFormSubmit)}
              disabled={isSubmitting}
              className="px-6"
            >
              {isSubmitting
                ? "Processing..."
                : editingCategory
                  ? "Update Category"
                  : "Create Category"}
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <p className="text-sm text-gray-500">
            Add a document category with review, retention, and training
            requirements.
          </p>

          <div className="flex flex-col gap-4">
            <FormField
              label="Category Name"
              required
              placeholder="e.g. Standard Operating Procedures"
              error={errors.name?.message}
              {...register("name")}
            />

            <FormField
              label="Code"
              required
              placeholder="e.g. SOP"
              // description="Short code (e.g. INT, EXT, AUD). Max 100 characters."
              error={errors.code?.message}
              {...register("code")}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Controller
                name="reviewFrequency"
                control={control}
                render={({ field }) => (
                  <FormSelect
                    label="Review Frequency (months)"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: "1", label: "1" },
                      { value: "3", label: "3" },
                      { value: "6", label: "6" },
                      { value: "12", label: "12" },
                      { value: "24", label: "24" },
                      { value: "36", label: "36" },
                      { value: "60", label: "60" },
                    ]}
                    placeholder="Select months"
                  />
                )}
              />
              <Controller
                name="retentionYears"
                control={control}
                render={({ field }) => (
                  <FormSelect
                    label="Retention (years)"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: "1", label: "1" },
                      { value: "3", label: "3" },
                      { value: "5", label: "5" },
                      { value: "7", label: "7" },
                      { value: "10", label: "10" },
                      { value: "25", label: "25" },
                      { value: "99", label: "Permanent" },
                    ]}
                    placeholder="Select years"
                  />
                )}
              />
            </div>

            <Controller
              name="parentId"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Parent Category (Optional)"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    { value: "", label: "No Parent (Root)" },
                    ...categories
                      .filter(
                        (c) => !editingCategory || c.id !== editingCategory.id,
                      )
                      .map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  placeholder="Select parent category"
                />
              )}
            />

            <FormTextArea
              label="Description"
              placeholder="Description of this user category."
              error={errors.description?.message}
              rows={3}
              {...register("description")}
            />

            <div className="flex items-center justify-between py-4 border-t border-gray-100 mt-2">
              <div>
                <label className="text-sm font-bold text-[#0f1724]">
                  Requires Training
                </label>
                <p className="text-[11px] text-gray-500">
                  Users must acknowledge documents in this category
                </p>
              </div>
              <Controller
                name="requiresTraining"
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
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingCategory(null);
        }}
        title="Document Category Details"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                Name
              </label>
              <p className="text-sm font-semibold text-[#0f1724] mt-1">
                {viewingCategory?.name}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                Code
              </label>
              <p className="text-sm font-semibold text-[#0f1724] mt-1">
                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                  {viewingCategory?.code}
                </span>
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                Review Frequency
              </label>
              <p className="text-sm font-semibold text-[#0f1724] mt-1">
                {viewingCategory?.review_frequency_months} months
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                Retention
              </label>
              <p className="text-sm font-semibold text-[#0f1724] mt-1">
                {viewingCategory?.retention_years} years
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                Parent Category
              </label>
              <p className="text-sm font-semibold text-[#0f1724] mt-1">
                {categories.find((c) => c.id === viewingCategory?.parent_id)
                  ?.name || "None (Root Category)"}
              </p>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">
              Description
            </label>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              {viewingCategory?.description || "No description provided."}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#0f1724]">
                Requires Training
              </p>
              <p className="text-xs text-gray-500">
                Training acknowledgement is{" "}
                {viewingCategory?.requires_training ? "enabled" : "disabled"}{" "}
                for this category.
              </p>
            </div>
            <div
              className={cn(
                "w-10 h-5 rounded-full relative",
                viewingCategory?.requires_training
                  ? "bg-[#084cc8]"
                  : "bg-gray-200",
              )}
            >
              <div
                className={cn(
                  "absolute top-1 left-1 w-3 h-3 bg-white rounded-full",
                  viewingCategory?.requires_training && "translate-x-5",
                )}
              />
            </div>
          </div>
          {/* <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="px-6 py-2 bg-[#0f1724] rounded-md text-sm font-bold text-white hover:bg-black transition-colors"
            >
              Close
            </button>
          </div> */}
        </div>
      </Modal>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Document Category"
        message="Are you sure you want to delete this category? This action cannot be undone and will fail if the category is currently associated with documents."
        itemName={categoryToDelete?.name || ""}
        isLoading={isDeleting}
      />
    </Layout>
  );
};

export default DocumentCategories;
