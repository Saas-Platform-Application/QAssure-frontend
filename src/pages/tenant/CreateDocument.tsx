import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/layout/Layout";
import {
  FormField,
  FormSelect,
  FormTextArea,
  PrimaryButton,
  RichTextEditor,
  FormTagInput,
  SecondaryButton,
} from "@/components/shared";
import {
  documentService,
  type FileAttachmentItem,
} from "@/services/document-service";
import type { DocumentCategory } from "@/types/document";
import { showToast } from "@/utils/toast";
import {
  ArrowLeft,
  FileText,
  Info,
  Paperclip,
  Plus,
  MessageSquare,
} from "lucide-react";
import { moduleService } from "@/services/module-service";
import type { MyModule } from "@/types/module";
import { workflowService } from "@/services/workflow-service";

const documentSchema = z.object({
  title: z.string().min(1, "Document title is required"),
  description: z.string().optional(),
  document_type: z.string().min(1, "Document type is required"),
  category_id: z.string().optional(),
  department: z.string().optional(),
  tags: z.array(z.string()),
  selectedModuleId: z.string().min(1, "Source module is required"),
  source_record_id: z.string().optional(),
  workflow_definition_id: z.string().optional(),
  content: z.string().optional(),
  contentHtml: z.string().optional(),
  sections: z
    .array(
      z.object({
        title: z.string().min(1, "Section title is required"),
        content: z.string().optional(),
        contentHtml: z.string().min(1, "Section content is required"),
        is_mandatory: z.boolean(),
      }),
    )
    .min(1, "At least one section is required for structured review"),
});

type DocumentFormData = z.infer<typeof documentSchema>;

const CreateDocument = (): ReactElement => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [types, setTypes] = useState<Array<{ code: string; name: string }>>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [modules, setModules] = useState<MyModule[]>([]);
  const [workflowOptions, setWorkflowOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: "",
      description: "",
      document_type: "",
      category_id: "",
      department: "",
      tags: [],
      selectedModuleId: "",
      source_record_id: "",
      workflow_definition_id: "",
      content: "",
      contentHtml: "",
      sections: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sections",
  });

  // File attachment fields
  const [files, setFiles] = useState<FileAttachmentItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [fileName, setFileName] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [mimeType, setMimeType] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Split-Pane view state
  const [showSourcePane, setShowSourcePane] = useState(false);
  const [sourceHtml, setSourceHtml] = useState("");
  const [selectionMenu, setSelectionMenu] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionMenu(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 2) {
      setSelectionMenu(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectionMenu({
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY,
      text: text,
    });
  };

  const addSelectedToNewSection = () => {
    if (!selectionMenu) return;
    append({
      title:
        selectionMenu.text.substring(0, 30) +
        (selectionMenu.text.length > 30 ? "..." : ""),
      contentHtml: `<p>${selectionMenu.text}</p>`,
      content: selectionMenu.text,
      is_mandatory: true,
    });
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
    showToast.success("Added to new section");
  };

  const appendToLastSection = () => {
    if (!selectionMenu || fields.length === 0) return;
    const lastIndex = fields.length - 1;
    const currentHtml = watch(`sections.${lastIndex}.contentHtml`);
    const currentText = watch(`sections.${lastIndex}.content`);

    setValue(
      `sections.${lastIndex}.contentHtml`,
      `${currentHtml}<p>${selectionMenu.text}</p>`,
    );
    setValue(
      `sections.${lastIndex}.content`,
      `${currentText}\n\n${selectionMenu.text}`,
    );

    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
    showToast.success("Appended to section " + (lastIndex + 1));
  };

  useEffect(() => {
    const loadLookups = async (): Promise<void> => {
      try {
        const [typesRes, categoriesRes, modulesRes] = await Promise.all([
          documentService.getTypes(),
          documentService.getCategories(),
          moduleService.getMyModules(),
        ]);
        setTypes(typesRes.data || []);
        setCategories(categoriesRes.data || []);
        setModules(modulesRes.data || []);
      } catch (err: any) {
        showToast.error(
          err?.response?.data?.error?.message ||
            "Failed to load document metadata",
        );
      }
    };
    void loadLookups();
    void loadFiles();
  }, []);

  const selectedModuleId = watch("selectedModuleId");

  useEffect(() => {
    const loadWorkflows = async (): Promise<void> => {
      if (!selectedModuleId) {
        setWorkflowOptions([]);
        setValue("workflow_definition_id", "");
        return;
      }

      try {
        const workflowRes = await workflowService.listDefinitions({
          entity_type: "document",
          status: "active",
          source_module_id: selectedModuleId,
          limit: 100,
        });

        setWorkflowOptions(
          (workflowRes.data || []).map((d: any) => ({
            value: d.id,
            label: `${d.name} (${d.code})`,
          })),
        );
        // Clear selection if the current one isn't in the new list
        const currentWfId = watch("workflow_definition_id");
        if (
          currentWfId &&
          !workflowRes.data.some((d: any) => d.id === currentWfId)
        ) {
          setValue("workflow_definition_id", "");
        }
      } catch (err: any) {
        console.error("Failed to load workflows:", err);
        setWorkflowOptions([]);
      }
    };

    void loadWorkflows();
  }, [selectedModuleId, setValue]);

  const loadFiles = async (): Promise<void> => {
    setIsLoadingFiles(true);
    try {
      const res = await documentService.listForDropdown();
      setFiles(res.data || []);
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message || "Failed to load files",
      );
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleFileSelect = async (fileId: string): Promise<void> => {
    setSelectedFileId(fileId);
    if (!fileId) {
      setFileName("");
      setFilePath("");
      setFileSize(undefined);
      setMimeType("");
      setFileHash("");
      setValue("contentHtml", "");
      setValue("content", "");
      return;
    }

    const selected = files.find((f) => f.id === fileId);
    if (!selected) return;

    setFileName(selected.original_name);
    setFilePath(selected.file_path);
    setFileSize(selected.file_size);
    setMimeType(selected.mime_type);
    setFileHash(selected.checksum);

    try {
      showToast.success(
        `Extracting content from "${selected.original_name}"...`,
      );
      const res = await documentService.getFileContent(fileId);
      if (res.success && res.data) {
        setSourceHtml(res.data.html || "");
        setShowSourcePane(true); // Automatically show the split pane

        // Reset sections and start with a single "Main Content" block
        while (fields.length > 0) remove(0);

        append({
          title: "Main Content",
          contentHtml: res.data.html || "",
          content: res.data.text || "",
          is_mandatory: true,
        });

        showToast.success(
          `Content loaded from "${selected.original_name}". Use the reference pane to build your structure.`,
        );

        // Clear main content fields as we are now strictly using sections
        setValue("contentHtml", "");
        setValue("content", "");
      } else {
        showToast.error("Failed to extract file content");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || "Failed to extract file content";
      showToast.error(msg);

      // Fallback: create a section with error information
      while (fields.length > 0) remove(0);
      append({
        title: "Sourced Content",
        contentHtml: `<p>Document sourced from file: <strong>${selected.original_name}</strong></p>`,
        content: `Document sourced from file: ${selected.original_name}`,
        is_mandatory: true,
      });
    }
  };

  const onFormSubmit = async (data: DocumentFormData): Promise<void> => {
    try {
      setIsSaving(true);
      const response = await documentService.create({
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        document_type: data.document_type,
        category_id: data.category_id || undefined,
        department: data.department?.trim() || undefined,
        tags: data.tags || [],
        content: data.content?.trim() || undefined,
        content_html: data.contentHtml?.trim() || undefined,
        file_name: fileName || undefined,
        file_path: filePath || undefined,
        file_size: fileSize,
        mime_type: mimeType || undefined,
        file_hash: fileHash || undefined,
        source_module: modules.find((m) => m.id === data.selectedModuleId)!
          .module_id,
        source_module_id: data.selectedModuleId,
        source_record_id: data.source_record_id?.trim() || undefined,
        workflow_definition_id: data.workflow_definition_id || undefined,
        sections: data.sections?.map((s, i) => ({
          title: s.title,
          content: s.content,
          content_html: s.contentHtml,
          order_index: i,
          is_mandatory: s.is_mandatory,
        })),
      });
      showToast.success("Document created successfully");
      navigate(`/tenant/documents/${response.data.id}`);
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message || "Failed to create document",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout
      currentPage="Document Service"
      // breadcrumbs={[
      //   { label: "Document Service", path: "/tenant/documents" },
      //   { label: "Create Document" },
      // ]}
      pageHeader={{
        title: "Create Document",
        description:
          "Fill in document details, classification and draft content before submitting for workflow.",
      }}
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div
          className={
            showSourcePane
              ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
              : "space-y-4"
          }
        >
          {/* LEFT PANE: Source Reference (Only visible if showSourcePane is true) */}
          {showSourcePane && (
            <div className="lg:col-span-5 space-y-4 sticky top-6 animate-in slide-in-from-left duration-500">
              <div className="bg-[#f8fafc] border border-[rgba(0,0,0,0.08)] rounded-xl shadow-[0px_10px_30px_-10px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
                <div className="px-4 py-3 bg-white border-b border-[rgba(0,0,0,0.08)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-[#112868]/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#112868]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#0f1724] uppercase tracking-wider">
                        Document Reference
                      </h3>
                      <p className="text-[9px] text-gray-400 font-medium truncate max-w-[200px]">
                        {fileName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSourcePane(false)}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Hide Reference Pane"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
                <div
                  className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white"
                  onMouseUp={handleTextSelection}
                >
                  <div
                    className="prose prose-sm prose-slate max-w-none select-text selection:bg-blue-100 selection:text-blue-900"
                    dangerouslySetInnerHTML={{ __html: sourceHtml }}
                  />
                </div>

                {/* Floating Selection Menu */}
                {selectionMenu && (
                  <div
                    className="fixed z-[9999] -translate-x-1/2 -translate-y-full mb-2 flex items-center gap-1 p-1 bg-[#112868] rounded-lg shadow-xl border border-white/10 animate-in fade-in zoom-in duration-200"
                    style={{ left: selectionMenu.x, top: selectionMenu.y }}
                  >
                    <button
                      type="button"
                      onClick={addSelectedToNewSection}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add as New
                    </button>
                    <div className="w-[1px] h-4 bg-white/20 mx-0.5" />
                    <button
                      type="button"
                      onClick={appendToLastSection}
                      disabled={fields.length === 0}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                    >
                      <Paperclip className="w-3 h-3" />
                      Append
                    </button>
                  </div>
                )}

                <div className="px-5 py-4 bg-[#f8fafc] border-t border-[rgba(0,0,0,0.05)]">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 p-1 rounded bg-blue-100">
                      <Info className="w-3 h-3 text-blue-600" />
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-600 font-medium">
                      <span className="text-blue-700 font-bold">
                        Interactive Mode:
                      </span>{" "}
                      Select text from this pane and copy it directly into your
                      sections on the right. This ensures accuracy and full
                      traceability from the source document.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RIGHT PANE: The Form */}
          <div
            className={showSourcePane ? "lg:col-span-7 space-y-4" : "space-y-4"}
          >
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] p-4 md:p-5">
              <div className="flex items-start justify-between gap-4 border-b border-[rgba(0,0,0,0.08)] pb-4 mb-4">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 w-8 h-8 rounded-md bg-[#112868]/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#112868]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0f1724]">
                      New Controlled Document
                    </h3>
                    <p className="text-xs text-[#6b7280] mt-1">
                      {watch("workflow_definition_id") ? (
                        <span>
                          Document will go directly to{" "}
                          <span className="font-medium text-amber-600">
                            In Review
                          </span>{" "}
                          status upon creation.
                        </span>
                      ) : (
                        <span>
                          Document will be created in{" "}
                          <span className="font-medium">Draft</span> status.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/tenant/documents")}
                  className="inline-flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#0f1724]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
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
                  name="document_type"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Document Type"
                      required
                      value={field.value}
                      onValueChange={field.onChange}
                      options={types.map((type) => ({
                        value: type.code,
                        label: type.name,
                      }))}
                      placeholder="Select type"
                      error={errors.document_type?.message}
                    />
                  )}
                />
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
                  placeholder="Optional department name"
                  error={errors.department?.message}
                  {...register("department")}
                />
                <FormField
                  label="Source Record ID"
                  placeholder="Internal record ID from source app (e.g. Report_ID_001)"
                  error={errors.source_record_id?.message}
                  {...register("source_record_id")}
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
                <Controller
                  name="selectedModuleId"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Source Module"
                      required
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        setValue("workflow_definition_id", "");
                      }}
                      options={modules.map((m) => ({
                        value: m.id,
                        label: m.name,
                      }))}
                      placeholder="Select originating module"
                      error={errors.selectedModuleId?.message}
                    />
                  )}
                />
                <Controller
                  name="workflow_definition_id"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Auto-Start Workflow (Optional)"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      options={[
                        { value: "", label: "— Save as Draft —" },
                        ...workflowOptions,
                      ]}
                      placeholder={
                        selectedModuleId
                          ? "Select workflow to auto-start"
                          : "Please select a Source Module first"
                      }
                      disabled={!selectedModuleId}
                      error={errors.workflow_definition_id?.message}
                      isSearchable
                      helperText={
                        !selectedModuleId
                          ? "Workflow options depend on the selected Source Module."
                          : watch("workflow_definition_id")
                            ? "Document will be created and automatically submitted for review (In Review status)."
                            : "Document will be created in Draft status for manual submission later."
                      }
                    />
                  )}
                />
              </div>
            </div>

            {/* File Attachment Selection */}
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4 text-[#112868]" />
                <h3 className="text-sm font-semibold text-[#0f1724]">
                  Load Content From File (Optional)
                </h3>
                {sourceHtml && !showSourcePane && (
                  <button
                    type="button"
                    onClick={() => setShowSourcePane(true)}
                    className="ml-auto text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded border border-blue-100 transition-all hover:shadow-sm"
                  >
                    Open Reference Pane
                  </button>
                )}
              </div>
              <p className="text-xs text-[#6b7280] mb-3">
                Select a previously uploaded file to automatically populate
                content and file metadata.
              </p>
              <FormSelect
                label="Select File"
                value={selectedFileId}
                onValueChange={handleFileSelect}
                options={[
                  { value: "", label: "— None —" },
                  ...files.map((f) => ({
                    value: f.id,
                    label: `${f.original_name} (${f.file_size_formatted})`,
                  })),
                ]}
                placeholder={
                  isLoadingFiles
                    ? "Loading files..."
                    : "Select a file to attach"
                }
              />

              {selectedFileId && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0 text-xs text-[#6b7280]">
                  <p>
                    <span className="font-medium">File:</span> {fileName}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span> {mimeType}
                  </p>
                  <p>
                    <span className="font-medium">Size:</span>{" "}
                    {fileSize
                      ? `${(fileSize / 1024 / 1024).toFixed(2)} MB`
                      : "-"}
                  </p>
                  <p>
                    <span className="font-medium">Hash:</span>{" "}
                    {fileHash ? fileHash.substring(0, 16) + "..." : "-"}
                  </p>
                </div>
              )}
            </div>

            {/* Structured Sections Selection */}
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#112868]" />
                  <h3 className="text-sm font-semibold text-[#0f1724]">
                    Structured Sections
                  </h3>
                </div>
                <SecondaryButton
                  type="button"
                  onClick={() =>
                    append({
                      title: "",
                      content: "",
                      contentHtml: "",
                      is_mandatory: true,
                    })
                  }
                  className="h-8 text-[11px]"
                >
                  + Add Section
                </SecondaryButton>
              </div>

              {fields.length > 0 ? (
                <div className="space-y-6">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border border-dashed border-[#e2e8f0] rounded-lg relative bg-[#fafafa]"
                    >
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove Section"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 rotate-45" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormField
                          label={`Section ${index + 1} Title`}
                          required
                          placeholder="e.g. 1. Purpose, 2. Scope"
                          error={errors.sections?.[index]?.title?.message}
                          {...register(`sections.${index}.title` as const)}
                        />
                        <div className="flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            id={`mandatory-${index}`}
                            className="w-4 h-4 text-[#112868] border-gray-300 rounded focus:ring-[#112868]"
                            {...register(
                              `sections.${index}.is_mandatory` as const,
                            )}
                          />
                          <label
                            htmlFor={`mandatory-${index}`}
                            className="text-xs font-medium text-[#64748b]"
                          >
                            Mandatory Review Required
                          </label>
                        </div>
                      </div>

                      <Controller
                        name={`sections.${index}.contentHtml` as const}
                        control={control}
                        render={({ field: editorField }) => (
                          <RichTextEditor
                            label="Section Content"
                            value={editorField.value || ""}
                            required
                            placeholder="Write section content..."
                            minHeightClassName="h-[200px] overflow-y-auto"
                            onChange={(html, text) => {
                              editorField.onChange(html);
                              setValue(`sections.${index}.content`, text);
                            }}
                            error={
                              errors.sections?.[index]?.contentHtml?.message
                            }
                          />
                        )}
                      />

                      {/* Section Comments (Feedback for rework) */}
                      {(field as any).comments &&
                        (field as any).comments.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                                Unresolved Feedback (
                                {(field as any).comments.length})
                              </span>
                            </div>
                            <div className="space-y-2">
                              {(field as any).comments.map((comment: any) => (
                                <div
                                  key={comment.id}
                                  className="p-2.5 bg-amber-50/50 border border-amber-100 rounded-md"
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-semibold text-amber-900">
                                      {comment.author_email}
                                    </span>
                                    <span className="text-[9px] text-amber-600 bg-white px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-tighter">
                                      {comment.workflow_step}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-700 leading-normal">
                                    {comment.comment_text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 border border-dashed border-[#e2e8f0] rounded-lg flex flex-col items-center justify-center bg-[#fafafa]">
                  <FileText className="w-8 h-8 text-[#cbd5e1] mb-2" />
                  <p className="text-xs text-[#94a3b8]">
                    No structured sections added yet.
                  </p>
                  <p className="text-[10px] text-[#cbd5e1] mt-1">
                    Use sections for granular review and collaboration.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Structured Review Enabled
              </p>
              <p className="text-xs text-blue-700">
                All documents must use sections to enable granular review, QA
                validation, and section-level rework tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] p-4 md:p-5">
          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              className="h-10 px-4 border border-[rgba(0,0,0,0.08)] rounded-md text-xs text-[#0f1724] hover:bg-gray-50"
              onClick={() => navigate("/tenant/documents")}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              className="h-10 px-4 border border-[rgba(0,0,0,0.08)] rounded-md text-xs text-[#112868] hover:bg-[#f8fafc] disabled:opacity-60"
              onClick={handleSubmit(onFormSubmit)}
            >
              {isSaving ? "Saving..." : "Save As Draft"}
            </button>
            <PrimaryButton
              type="submit"
              disabled={isSaving}
              onClick={handleSubmit(onFormSubmit)}
            >
              {isSaving ? "Creating..." : "Create Document"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Layout>
  );
};

export default CreateDocument;
