import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/layout/Layout";
import {
  FormField,
  FormSelect,
  FormTextArea,
  PrimaryButton,
} from "@/components/shared";
import { documentService } from "@/services/document-service";
import type { DocumentCategory } from "@/types/document";
import { showToast } from "@/utils/toast";
import { FileText } from "lucide-react";
import { moduleService } from "@/services/module-service";
import type { MyModule } from "@/types/module";

const documentSchema = z.object({
  title: z.string().min(1, "Document title is required"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  department: z.string().optional(),
  tags: z.string().optional(),
  selectedModuleId: z.string().min(1, "Source module is required"),
});

type DocumentFormData = z.infer<typeof documentSchema>;

const EditDocument = (): ReactElement => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [modules, setModules] = useState<MyModule[]>([]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: "",
      description: "",
      category_id: "",
      department: "",
      tags: "",
      selectedModuleId: "",
    },
  });

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      if (!id) return;
      try {
        setIsLoading(true);
        const [categoriesRes, modulesRes, docRes] = await Promise.all([
          documentService.getCategories(),
          moduleService.getMyModules(),
          documentService.getById(id),
        ]);

        setCategories(categoriesRes.data || []);
        const myModules = modulesRes.data || [];
        setModules(myModules);

        const doc = docRes.data;
        // Find matching module by id (UUID) or module_id (code)
        const matchedModule = myModules.find(
          (m) =>
            (doc.source_module_id && m.id === doc.source_module_id) ||
            (doc.source_module && m.module_id === doc.source_module),
        );

        reset({
          title: doc.title,
          description: doc.description || "",
          category_id: doc.category_id || doc.category?.id || "",
          department: doc.department || "",
          tags: (doc.tags || []).join(", "),
          selectedModuleId: matchedModule?.id || "",
        });
      } catch (err: any) {
        showToast.error(
          err?.response?.data?.error?.message || "Failed to load document data",
        );
        navigate("/tenant/documents");
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, [id, reset, navigate]);

  const onFormSubmit = async (data: DocumentFormData): Promise<void> => {
    if (!id) return;
    try {
      setIsSaving(true);
      await documentService.update(id, {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        category_id: data.category_id || undefined,
        department: data.department?.trim() || undefined,
        tags: data.tags
          ? data.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        source_module: modules.find((m) => m.id === data.selectedModuleId)!
          .module_id,
        source_module_id: data.selectedModuleId,
      });
      showToast.success("Document updated successfully");
      navigate(`/tenant/documents/${id}`);
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message || "Failed to update document",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout currentPage="Document Service">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-sm text-[#6b7280]">Loading document details...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="Document Service"
      breadcrumbs={[
        { label: "Document Service", path: "/tenant/documents" },
        { label: "Edit Document" },
      ]}
      pageHeader={{
        title: "Edit Document",
        description: "Modify document metadata and classification details.",
      }}
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] p-4 md:p-5">
          <div className="flex items-start justify-between gap-4 border-b border-[rgba(0,0,0,0.08)] pb-4 mb-4">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 w-8 h-8 rounded-md bg-[#112868]/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#112868]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0f1724]">
                  Edit Document
                </h3>
                <p className="text-xs text-[#6b7280] mt-1">
                  Updates will apply to the current version of the document.
                </p>
              </div>
            </div>
            {/* <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#0f1724]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button> */}
          </div>

          <div className="grid grid-cols-1 gap-x-4">
            <FormField
              label="Document Title"
              required
              placeholder="Enter document title"
              error={errors.title?.message}
              {...register("title")}
            />
          </div>

          <FormTextArea
            label="Description"
            placeholder="Brief description of this document"
            error={errors.description?.message}
            {...register("description")}
          />
        </div>

        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] p-4 md:p-5">
          <h3 className="text-sm font-semibold text-[#0f1724] mb-3">
            Classification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Category"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={categories.map((category) => ({
                    value: category.id,
                    label: `${category.name} (${category.code})`,
                  }))}
                  placeholder="Select category"
                  error={errors.category_id?.message}
                />
              )}
            />
            <FormField
              label="Department"
              placeholder="Optional"
              error={errors.department?.message}
              {...register("department")}
            />
            <FormField
              label="Tags"
              placeholder="Comma separated tags (e.g. quality, sop)"
              error={errors.tags?.message}
              {...register("tags")}
            />
            <Controller
              name="selectedModuleId"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Source Module"
                  required
                  value={field.value}
                  onValueChange={field.onChange}
                  options={modules.map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
                  placeholder="Select originating module"
                  error={errors.selectedModuleId?.message}
                />
              )}
            />
          </div>
        </div>

        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] p-4 md:p-5">
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              className="h-10 px-4 border border-[rgba(0,0,0,0.08)] rounded-md text-xs text-[#0f1724] hover:bg-gray-50"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <PrimaryButton
              type="submit"
              disabled={isSaving}
              onClick={handleSubmit(onFormSubmit)}
            >
              {isSaving ? "Updating..." : "Update Document"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Layout>
  );
};

export default EditDocument;
