/**
 * FileUploadModal
 * Upload New File modal — drag & drop or click to select, up to 10 files
 * Fields: entity_type, entity_id, category_id (select), tags, description
 * Matches backend UploadFileSchema exactly
 */

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactElement,
  useEffect,
} from "react";
import {
  X,
  Upload,
  FileText,
  Image,
  FileArchive,
  AlertCircle,
  Table,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronDown as ChevronDownIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Modal,
  PrimaryButton,
  SecondaryButton,
  FormField,
  FormSelect,
  FormTextArea,
  FormTagInput,
} from "@/components/shared";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import fileAttachmentService, {
  type CategoriesFilterOptions,
  type StorageQuota,
} from "@/services/file-attachment-service";

// ─────────────────────────────────────────────────────────────────────────────
// Constants from backend blocked extensions
// ─────────────────────────────────────────────────────────────────────────────
const BLOCKED_EXTENSIONS = [
  ".exe",".bat",".cmd",".sh",".ps1",".msi",".dll",".com",".scr",".vbs",".js",
];
const MAX_FILES = 10;
const MAX_SIZE_MB = 50; // UI shows 50 MB as the soft warning (backend: 100 MB)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getExt(name: string) {
  return name.slice(((name.lastIndexOf(".") - 1) >>> 0) + 1).toLowerCase();
}

// function isBlocked(name: string) {
//   return BLOCKED_EXTENSIONS.includes(getExt(name) ? `.${getExt(name)}` : "");
// }

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts or older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getFileIcon(mime: string, name: string): ReactElement {
  if (mime.startsWith("image/")) return <Image className="w-4 h-4 text-emerald-500" />;
  if (mime === "application/pdf") return <FileText className="w-4 h-4 text-red-500" />;
  if (mime.includes("spreadsheet") || name.endsWith(".csv") || name.endsWith(".xlsx"))
    return <Table className="w-4 h-4 text-green-600" />;
  if (mime.includes("zip") || mime.includes("archive"))
    return <FileArchive className="w-4 h-4 text-yellow-500" />;
  return <FileText className="w-4 h-4 text-blue-500" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-file state
// ─────────────────────────────────────────────────────────────────────────────
type FileStatus = "idle" | "uploading" | "done" | "error" | "blocked";

interface FileEntry {
  file: File;
  id: string;
  status: FileStatus;
  progress: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
export interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: () => void;
  /** Pre-fill entity type (e.g. "document") */
  defaultEntityType?: string;
  /** Pre-fill entity id */
  defaultEntityId?: string;
  categories?: CategoriesFilterOptions["categories"];
  /** For tenant-admin: show all fields; for tenant-user: same but with permission gating done by parent */
  isTenantAdmin?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY TYPE OPTIONS (common entity types in the platform)
// ─────────────────────────────────────────────────────────────────────────────
const ENTITY_TYPES = [
  "document",
  "capa",
  "training",
  "supplier",
  "audit",
  "project",
  "workflow",
  "tenant",
  "user",
  "other",
];

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────────────────────────────────────
const fileUploadSchema = z.object({
  entity_type: z.string().min(1, "Entity Type is required"),
  entity_id: z.string().min(1, "Entity ID is required"),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  description: z.string().max(500, "Description must be at most 500 characters").optional(),
  files: z.array(z.any()).min(1, "At least one file is required"),
});

type FileUploadFormData = z.infer<typeof fileUploadSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const FileUploadModal = ({
  isOpen,
  onClose,
  onUploaded,
  defaultEntityType = "",
  defaultEntityId = "",
  categories = [],
  isTenantAdmin = true,
}: FileUploadModalProps): ReactElement | null => {
  // ── Form configuration ──
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FileUploadFormData>({
    resolver: zodResolver(fileUploadSchema) as any,
    defaultValues: {
      entity_type: defaultEntityType,
      entity_id: defaultEntityId,
      category: "",
      tags: [],
      description: "",
      files: [],
    },
  });

  // Watch form values
  const entityId = watch("entity_id");
  const categoryInput = watch("category");

  // ── Local UI state ──
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  
  // Ref for the hidden file input
  const inputRef = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // File entries with upload progress (internal state kept separate from zod files array for progress tracking)
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  
  // Storage quota settings fetched dynamically from backend
  const [quota, setQuota] = useState<StorageQuota | null>(null);

  useEffect(() => {
    if (isOpen) {
      fileAttachmentService.getQuota()
        .then((res) => {
          if (res?.data) {
            setQuota(res.data);
          }
        })
        .catch((err) => {
          console.error("Failed to load quota settings in FileUploadModal:", err);
        });
    }
  }, [isOpen]);

  // ── Auto-generate Entity ID ──
  useEffect(() => {
    if (isOpen && !entityId && !defaultEntityId) {
      setValue("entity_id", generateUUID());
    }
  }, [isOpen, defaultEntityId, entityId, setValue]);

  // ── Close dropdown on click outside ──
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Reset on close ──
  const handleClose = () => {
    if (isUploading) return;
    reset({
      entity_type: defaultEntityType,
      entity_id: defaultEntityId || (isOpen ? generateUUID() : ""),
      category: "",
      tags: [],
      description: "",
      files: [],
    });
    setFileEntries([]);
    setUploadError(null);
    setUploadSuccess(false);
    onClose();
  };

  // ── Add files ──
  const addFiles = useCallback((incoming: File[]) => {
    const activeBlocked = quota?.blocked_extensions || BLOCKED_EXTENSIONS;
    const activeMaxSizeBytes = quota?.max_file_size_bytes || (MAX_SIZE_MB * 1024 * 1024);

    const newEntries: FileEntry[] = incoming
      .slice(0, MAX_FILES)
      .map((file) => {
        const ext = getExt(file.name);
        const fileExt = ext ? `.${ext}` : "";
        const isBlockedType = activeBlocked.some(
          (blockedExt) => blockedExt.toLowerCase() === fileExt.toLowerCase()
        );
        const isTooLarge = file.size > activeMaxSizeBytes;

        let status: FileStatus = "idle";
        let error: string | undefined;

        if (isBlockedType) {
          status = "blocked";
          error = "Blocked file type";
        } else if (isTooLarge) {
          status = "blocked";
          error = `Exceeds limit of ${formatBytes(activeMaxSizeBytes)}`;
        }

        return {
          file,
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          status,
          progress: 0,
          error,
        };
      });

    setFileEntries((prev) => {
      const combined = [...prev, ...newEntries];
      const limited = combined.slice(0, MAX_FILES);
      // Sync with react-hook-form
      setValue("files", limited.map(e => e.file), { shouldValidate: true });
      return limited;
    });
  }, [setValue, quota]);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      addFiles(dropped);
    },
    [addFiles]
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFileEntries((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      // Sync with react-hook-form
      setValue("files", filtered.map(e => e.file), { shouldValidate: true });
      return filtered;
    });
  };

  // ── Upload ──
  const handleUpload = async (data: FileUploadFormData) => {
    const validFiles = fileEntries.filter((f) => f.status !== "blocked");
    if (validFiles.length === 0) { setUploadError("No valid files to upload"); return; }

    setIsUploading(true);
    setUploadError(null);

    // Mark all valid as uploading
    setFileEntries((prev) =>
      prev.map((f) => (f.status === "idle" ? { ...f, status: "uploading", progress: 10 } : f))
    );

    try {
      // Find matching category ID if it exists in the list
      const matchedCategory = categories.find(
        (c) => c.category.toLowerCase() === (data.category || "").toLowerCase()
      );

      if (validFiles.length === 1) {
        // Single upload
        await fileAttachmentService.upload({
          files: [validFiles[0].file],
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          category: matchedCategory ? matchedCategory.category : data.category,
          category_id: matchedCategory ? matchedCategory.category_id || undefined : undefined,
          description: data.description?.trim() || undefined,
          tags: data.tags?.length ? data.tags : undefined,
        });
        setFileEntries((prev) =>
          prev.map((f) =>
            f.id === validFiles[0].id ? { ...f, status: "done", progress: 100 } : f
          )
        );
      } else {
        // Multiple upload
        const result = await fileAttachmentService.uploadMultiple(
          {
            files: validFiles.map((f) => f.file),
            entity_type: data.entity_type,
            entity_id: data.entity_id,
            category: matchedCategory ? matchedCategory.category : data.category,
            category_id: matchedCategory ? matchedCategory.category_id || undefined : undefined,
            description: data.description?.trim() || undefined,
            tags: data.tags?.length ? data.tags : undefined,
          },
          (_, percent) => {
            setFileEntries((prev) =>
              prev.map((f) =>
                f.status === "uploading" ? { ...f, progress: Math.max(f.progress, percent) } : f
              )
            );
          }
        );

        setFileEntries((prev) =>
          prev.map((f) => {
            const errEntry = result.data.errors.find((e) => e.file === f.file.name);
            if (errEntry) return { ...f, status: "error", error: errEntry.error, progress: 0 };
            if (f.status === "uploading") return { ...f, status: "done", progress: 100 };
            return f;
          })
        );
      }

      setUploadSuccess(true);
      onUploaded?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Upload failed";
      setUploadError(msg);
      setFileEntries((prev) =>
        prev.map((f) =>
          f.status === "uploading" ? { ...f, status: "error", error: msg, progress: 0 } : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  const validCount = fileEntries.filter((f) => f.status !== "blocked").length;
  const doneCount = fileEntries.filter((f) => f.status === "done").length;

  const footer = (
    <>
      <SecondaryButton
        onClick={handleClose}
        disabled={isUploading}
      >
        Cancel
      </SecondaryButton>
      <PrimaryButton
        onClick={handleSubmit(handleUpload as any)}
        disabled={isUploading}
        className="flex items-center gap-2"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading ({doneCount}/{validCount})
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload {validCount > 0 ? `(${validCount})` : ""}
          </>
        )}
      </PrimaryButton>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload New File"
      description="Attach files via File Attachment Service"
      maxWidth="md"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Drop Zone */}
        <div className="flex flex-col pb-4 gap-0.5">
          <p className="text-[13px] font-medium text-[#0e1b2a]">Attach Files <span className="text-[#e02424]">*</span></p>
          {fileEntries.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-8 cursor-pointer transition-all",
                errors.files ? "border-[#ef4444] bg-[#ef4444]/5" : isDragging
                  ? "border-[#084cc8] bg-[#084cc8]/5"
                  : "border-[rgba(0,0,0,0.12)] hover:border-[#084cc8]/50 hover:bg-gray-50"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-[#084cc8]/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-[#084cc8]" />
              </div>
              <div className="text-center text-gray-800">
                <p className="text-sm font-medium text-[#0e1b2a]">Click to upload or drag and drop</p>
                <p className="text-xs text-[#9aa6b2] mt-0.5">
                  Attach supporting source files via File Attachment Service
                </p>
                <p className="text-xs text-[#9aa6b2]">
                  Allowed formats up to {quota ? formatBytes(quota.max_file_size_bytes) : `${MAX_SIZE_MB}MB`}
                </p>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={cn(
                "border-2 border-dashed rounded-xl transition-all",
                errors.files ? "border-[#ef4444] bg-[#ef4444]/5" : isDragging ? "border-[#084cc8] bg-[#084cc8]/5" : "border-[rgba(0,0,0,0.08)]"
              )}
            >
              {/* Add files button */}
              <div
                onClick={() => inputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 cursor-pointer border-b border-[rgba(0,0,0,0.06)] hover:bg-gray-50 transition-all rounded-t-xl"
              >
                <div className="w-7 h-7 rounded-full bg-[#084cc8] flex items-center justify-center text-white">
                  <Upload className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-semibold text-[#084cc8]">Add Files</span>
              </div>

              {/* File list */}
              <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                {fileEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="shrink-0">{getFileIcon(entry.file.type, entry.file.name)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#0e1b2a] truncate max-w-[180px]">
                          {entry.file.name}
                        </span>
                        <span className="text-xs text-[#9aa6b2] shrink-0">
                          {formatBytes(entry.file.size)}
                        </span>
                        {entry.status === "uploading" && (
                          <span className="text-xs font-semibold text-[#084cc8] shrink-0">
                            {entry.progress}%
                          </span>
                        )}
                        {entry.status === "done" && (
                          <span className="text-xs font-semibold text-emerald-600 shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Complete
                          </span>
                        )}
                        {(entry.status === "blocked" || entry.status === "error") && (
                          <span className="text-xs font-semibold text-red-500 shrink-0 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {entry.error}
                          </span>
                        )}
                      </div>
                      {entry.status === "uploading" && (
                        <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#084cc8] rounded-full transition-all duration-300"
                            style={{ width: `${entry.progress}%` }}
                          />
                        </div>
                      )}
                      {entry.status === "done" && (
                        <div className="mt-1.5 h-1 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full w-full" />
                        </div>
                      )}
                      {(entry.status === "blocked" || entry.status === "error") && (
                        <div className="mt-1.5 h-1 bg-red-100 rounded-full" />
                      )}
                    </div>
                    {entry.status !== "uploading" && entry.status !== "done" && (
                      <button
                        onClick={() => removeFile(entry.id)}
                        className="shrink-0 p-1 rounded hover:bg-gray-100 text-[#9aa6b2]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {errors.files && (
            <p className="text-xs text-[#ef4444] mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.files.message}
            </p>
          )}
          <p className="text-[11px] text-[#9aa6b2] mt-2">Up to {MAX_FILES} files allowed</p>

          {uploadSuccess && (
            <div className="flex items-center gap-1.5 mt-2 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Files upload successfully.</span>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onInputChange}
        />

        {/* Fields: Entity Type + Entity ID */}
        <div className="grid grid-cols-2 gap-4 pb-0">
          <Controller
            name="entity_type"
            control={control}
            render={({ field }) => (
              <FormSelect
                label="Entity Type"
                required
                value={field.value}
                onValueChange={field.onChange}
                disabled={!!defaultEntityType || isUploading}
                options={ENTITY_TYPES.map((t) => ({
                  value: t,
                  label: t.charAt(0).toUpperCase() + t.slice(1),
                }))}
                placeholder="Select type"
                error={errors.entity_type?.message}
              />
            )}
          />
          <div className="relative">
            <Controller
              name="entity_id"
              control={control}
              render={({ field }) => (
                <FormField
                  label="Entity ID"
                  required
                  {...field}
                  disabled={!!defaultEntityId || isUploading}
                  placeholder="e.g. PRJ-1204"
                  error={errors.entity_id?.message}
                />
              )}
            />
            {!defaultEntityId && !isUploading && isTenantAdmin && (
              <button
                onClick={() => setValue("entity_id", generateUUID(), { shouldValidate: true })}
                title="Regenerate ID"
                className="absolute right-3 top-[38px] p-1 text-[#9aa6b2] hover:text-[#084cc8] transition-colors"
                type="button"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Name (Editable Combobox) */}
        <div className="relative pb-4" ref={categoryDropdownRef}>
          <label className="text-[13px] font-medium text-[#0e1b2a] block mb-1.5">
            Category Name <span className="text-[#9aa6b2] font-normal">(Select or Enter New)</span>
          </label>
          <div className="relative">
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Input
                  type="text"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    setCategorySearch(e.target.value);
                    setShowCategoryDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (categorySearch.trim()) {
                        field.onChange(categorySearch.trim());
                        setShowCategoryDropdown(false);
                      }
                    }
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  disabled={isUploading}
                  placeholder="Type or select a category..."
                  className="pr-10"
                />
              )}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[#9aa6b2]">
              {categoryInput && (
                <button
                  type="button"
                  onClick={() => { setValue("category", ""); setCategorySearch(""); }}
                  className="p-1.5 hover:text-red-500 transition-colors"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="p-1.5 hover:text-[#0e1b2a] transition-colors"
                title="Toggle dropdown"
              >
                <ChevronDownIcon className={cn("w-4 h-4 transition-transform duration-200", showCategoryDropdown && "rotate-180")} />
              </button>
            </div>
          </div>
          {errors.category && (
            <p className="text-xs text-[#ef4444] mt-1">{errors.category.message}</p>
          )}

          {showCategoryDropdown && !isUploading && (
            <div className="absolute top-[calc(100%-12px)] left-0 right-0 z-[210] bg-white border border-[rgba(0,0,0,0.12)] shadow-xl rounded-lg py-1.5 mt-1 max-h-[220px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
              {categories.filter(c => c.category.toLowerCase().includes(categorySearch.toLowerCase())).length > 0 ? (
                categories
                  .filter(c => c.category.toLowerCase().includes(categorySearch.toLowerCase()))
                  .map((cat) => (
                    <button
                      key={cat.category_id ?? cat.category}
                      type="button"
                      onClick={() => {
                        setValue("category", cat.category, { shouldValidate: true });
                        setShowCategoryDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between",
                        categoryInput === cat.category 
                          ? "bg-[#084cc8]/5 text-[#084cc8] font-medium" 
                          : "text-[#475569] hover:bg-gray-50 hover:text-[#0e1b2a]"
                      )}
                    >
                      {cat.category}
                      {categoryInput === cat.category && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  ))
              ) : (
                <div className="px-4 py-3 text-center">
                  <p className="text-sm text-[#0e1b2a] font-medium">
                    {categorySearch ? `Use "${categorySearch}"` : "No categories found"}
                  </p>
                  <p className="text-[11px] text-[#9aa6b2] mt-0.5">
                    {categorySearch ? "Press Enter to create this as a new category" : "Start typing to create a new one"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="pb-4">
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <FormTagInput
                label="Tags"
                value={field.value || []}
                onChange={field.onChange}
                error={errors.tags?.message}
                placeholder="Add a tag..."
              />
            )}
          />
        </div>

        {/* Description */}
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <FormTextArea
              label="Description"
              {...field}
              disabled={isUploading}
              maxLength={500}
              rows={3}
              placeholder="Description of this file..."
              error={errors.description?.message}
            />
          )}
        />

        {/* Upload error */}
        {uploadError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FileUploadModal;
