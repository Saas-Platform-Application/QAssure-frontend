/**
 * FilesList — File Attachment Services › Files List
 *
 * Matches the design image:
 * - Data table with File Name, Size, Category, Source Module, Uploaded By, Upload Date, Version, Actions
 * - Search, Category filter, More Filters dropdown (source_module, tags)
 * - Upload New File modal
 * - Pagination
 * - Tenant-admin sees all admin actions; tenant-user sees limited view (conditional render)
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Upload,
  FileText,
  Image,
  FileArchive,
  Table as TableIcon,
  ChevronDown,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import {
  Pagination,
  DataTable,
  SearchBox,
  type Column,
} from "@/components/shared";
import { DeleteConfirmationModal } from "@/components/shared/DeleteConfirmationModal";
import { cn } from "@/lib/utils";
import fileAttachmentService, {
  type FileAttachment,
  type CategoriesFilterOptions,
} from "@/services/file-attachment-service";
import { moduleService } from "@/services/module-service";
import { FilterDropdown, ActionDropdown } from "@/components/shared";
import { FileUploadModal } from "@/components/shared/FileUploadModal";
import { useAppTheme } from "@/hooks/useAppTheme";
import { PrimaryButton } from "@/components/shared";
import type { RootState } from "@/store/store";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(
  mime: string,
  name: string,
  primaryColor: string,
): ReactElement {
  if (mime?.startsWith("image/"))
    return <Image className="w-4 h-4 text-emerald-500" />;
  if (mime === "application/pdf")
    return <FileText className="w-4 h-4 text-red-500" />;
  if (
    mime?.includes("spreadsheet") ||
    name?.endsWith(".csv") ||
    name?.endsWith(".xlsx") ||
    name?.endsWith(".xls")
  )
    return <TableIcon className="w-4 h-4 text-green-600" />;
  if (mime?.includes("zip") || mime?.includes("archive"))
    return <FileArchive className="w-4 h-4 text-yellow-500" />;
  return <FileText className="w-4 h-4" style={{ color: primaryColor }} />;
}

const categoryColors: Record<string, string> = {
  finance: "bg-purple-100 text-purple-700",
  marketing: "bg-orange-100 text-orange-700",
  hr: "bg-blue-100 text-blue-700",
  data: "bg-teal-100 text-teal-700",
  legal: "bg-red-100 text-red-700",
  training: "bg-yellow-100 text-yellow-700",
  other: "bg-gray-100 text-gray-600",
};

function getCategoryStyle(cat: string) {
  return categoryColors[cat?.toLowerCase()] || "bg-gray-100 text-gray-600";
}

const moduleColors: Record<string, string> = {
  platform: "bg-indigo-100 text-indigo-700",
  document: "bg-blue-100 text-blue-700",
  capa: "bg-orange-100 text-orange-700",
  training: "bg-yellow-100 text-yellow-700",
  supplier: "bg-green-100 text-green-700",
  audit: "bg-red-100 text-red-700",
  api_key: "bg-gray-100 text-gray-700",
};

function getModuleStyle(mod: string) {
  return moduleColors[mod?.toLowerCase()] || "bg-gray-100 text-gray-600";
}

function getInitials(email: string): string {
  if (!email) return "?";
  const parts = email.split("@")[0].split(".");
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

const avatarColors = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
];

function getAvatarColor(email: string) {
  const idx = (email?.charCodeAt(0) || 0) % avatarColors.length;
  return avatarColors[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterDropdown (local inline, no shared dependency)
// ─────────────────────────────────────────────────────────────────────────────
interface DropOption {
  value: string;
  label: string;
}

function FilterPill({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: DropOption[];
  value: string | null;
  onChange: (v: string | null) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const { primaryColor } = useAppTheme();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border transition-colors",
          value
            ? "bg-opacity-5"
            : "border-[rgba(0,0,0,0.1)] bg-white text-[#475569]",
        )}
        style={
          value
            ? {
                borderColor: primaryColor,
                backgroundColor: `${primaryColor}10`,
                color: primaryColor,
              }
            : {}
        }
      >
        {label}
        {selected && (
          <span style={{ color: primaryColor }}>: {selected.label}</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-[rgba(0,0,0,0.1)] shadow-lg rounded-xl py-1 min-w-[160px]">
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-gray-50",
                !value ? "font-semibold text-[#0e1b2a]" : "text-[#475569]",
              )}
            >
              All
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-gray-50",
                  value === opt.value
                    ? "font-semibold text-[#0e1b2a]"
                    : "text-[#475569]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const FilesList = (): ReactElement => {
  const navigate = useNavigate();
  const { primaryColor } = useAppTheme();
  const permissions = useSelector((state: RootState) => state.auth.permissions);

  // Permission checks
  const canCreate = permissions.some(
    (p) =>
      (p.resource === "files" || p.resource === "*") &&
      (p.action === "create" || p.action === "*"),
  );
  const canUpdate = permissions.some(
    (p) =>
      (p.resource === "files" || p.resource === "*") &&
      (p.action === "update" || p.action === "*"),
  );
  const canDelete = permissions.some(
    (p) =>
      (p.resource === "files" || p.resource === "*") &&
      (p.action === "delete" || p.action === "*"),
  );

  // Table columns
  const columns = useMemo<Column<FileAttachment>[]>(
    () => [
      {
        key: "original_name",
        label: "File Name",
        render: (file) => (
          <button
            onClick={() => navigate(`/tenant/files/${file.id}`)}
            className="flex items-center gap-2.5 transition-colors text-left group/link"
          >
            <div className="w-7 h-7 rounded-md bg-gray-50 border border-[rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
              {getFileIcon(file.mime_type, file.original_name, primaryColor)}
            </div>
            <span
              className="text-sm font-medium text-[#0e1b2a] truncate max-w-[200px]"
              onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#0e1b2a")}
            >
              {file.original_name}
            </span>
          </button>
        ),
      },
      {
        key: "file_size",
        label: "Size",
        render: (file) => (
          <span className="text-sm text-[#6b7280]">
            {file.file_size_formatted || formatBytes(file.file_size)}
          </span>
        ),
      },
      {
        key: "category",
        label: "Category",
        render: (file) =>
          file.category ? (
            <span
              className={cn(
                "inline-block text-xs font-semibold rounded px-2 py-0.5 capitalize",
                getCategoryStyle(file.category),
              )}
            >
              {file.category}
            </span>
          ) : (
            <span className="text-[#c4cbd6] text-sm">—</span>
          ),
      },
      {
        key: "source_module",
        label: "Source Module",
        render: (file) =>
          file.source_module ? (
            <span
              className={cn(
                "inline-block text-xs font-semibold rounded px-2 py-0.5 capitalize",
                getModuleStyle(file.source_module),
              )}
            >
              {file.source_module}
            </span>
          ) : (
            <span className="text-[#c4cbd6] text-sm">—</span>
          ),
      },
      {
        key: "uploaded_by_email",
        label: "Uploaded By",
        render: (file) =>
          file.uploaded_by_email ? (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  getAvatarColor(file.uploaded_by_email),
                )}
              >
                {getInitials(file.uploaded_by_email)}
              </div>
              <span className="text-sm text-[#0e1b2a] truncate max-w-[130px]">
                {file.uploaded_by_email.split("@")[0]}
              </span>
            </div>
          ) : (
            <span className="text-sm text-[#9aa6b2]">Unknown</span>
          ),
      },
      {
        key: "created_at",
        label: "Upload Date",
        render: (file) => (
          <span className="text-sm text-[#6b7280]">
            {formatDate(file.created_at)}
          </span>
        ),
      },
      {
        key: "version",
        label: "Version",
        render: (file) => (
          <span className="text-sm text-[#0e1b2a] font-medium">
            v{file.version}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        render: (file) => (
          <ActionDropdown
            onView={() => navigate(`/tenant/files/${file.id}`)}
            onDownload={() => handleDownload(file)}
            onEdit={
              canUpdate ? () => navigate(`/tenant/files/${file.id}`) : undefined
            }
            onDelete={canDelete ? () => openDeleteConfirm(file) : undefined}
          />
        ),
      },
    ],
    [canUpdate, canDelete, navigate, primaryColor],
  );

  // ── State ──
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [moduleIdFilter, setModuleIdFilter] = useState<string | null>(null);
  const [modules, setModules] = useState<{ id: string; name: string }[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (currentPage - 1) * limit;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Filter option data
  const [categories, setCategories] = useState<
    CategoriesFilterOptions["categories"]
  >([]);

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);

  // Deleting
  const [fileToDelete, setFileToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isHardDelete, setIsHardDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Load categories ──
  useEffect(() => {
    fileAttachmentService
      .getCategoriesFilterOptions()
      .then((res) => {
        setCategories(res.data.categories);
      })
      .catch(() => {});

    moduleService
      .getMyModules()
      .then((res) => {
        if (res.success) {
          setModules(res.data.map((m) => ({ id: m.id, name: m.name })));
        }
      })
      .catch(() => {});
  }, []);

  // ── Load files ──
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fileAttachmentService.list({
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        source_module_id: moduleIdFilter || undefined,
        limit,
        offset,
      });
      setFiles(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to load files");
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, moduleIdFilter, limit, offset]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const categoryOptions = useMemo<DropOption[]>(
    () => categories.map((c) => ({ value: c.category, label: c.category })),
    [categories],
  );

  // ── Actions ──
  const handleDownload = (file: FileAttachment) => {
    fileAttachmentService.download(file.id, file.original_name).catch(() => {});
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await fileAttachmentService.delete(fileToDelete.id, isHardDelete);
      setFileToDelete(null);
      setIsHardDelete(false);
      await loadFiles();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to delete file");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteConfirm = (file: FileAttachment) => {
    setFileToDelete({ id: file.id, name: file.original_name });
    setIsHardDelete(false);
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter(null);
    setModuleIdFilter(null);
    setCurrentPage(1);
  };

  // Mobile card renderer
  const mobileCardRenderer = (file: FileAttachment) => (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-[rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
              {getFileIcon(file.mime_type, file.original_name, primaryColor)}
            </div>
            <div className="flex flex-col">
              <h3
                className="text-sm font-medium text-[#0e1b2a] truncate cursor-pointer hover:underline"
                style={{ "--hover-color": primaryColor } as any}
                onClick={() => navigate(`/tenant/files/${file.id}`)}
              >
                {file.original_name}
              </h3>
              <p className="text-xs text-[#6b7280]">
                {file.file_size_formatted || formatBytes(file.file_size)} • v
                {file.version}
              </p>
            </div>
          </div>
        </div>
        <ActionDropdown
          onView={() => navigate(`/tenant/files/${file.id}`)}
          onDownload={() => handleDownload(file)}
          onEdit={
            canUpdate ? () => navigate(`/tenant/files/${file.id}`) : undefined
          }
          onDelete={canDelete ? () => openDeleteConfirm(file) : undefined}
        />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {file.category && (
          <span
            className={cn(
              "px-2 py-0.5 rounded font-semibold capitalize",
              getCategoryStyle(file.category),
            )}
          >
            {file.category}
          </span>
        )}
        {file.source_module && (
          <span
            className={cn(
              "px-2 py-0.5 rounded font-semibold capitalize",
              getModuleStyle(file.source_module),
            )}
          >
            {file.source_module}
          </span>
        )}
        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
          {formatDate(file.created_at)}
        </span>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout
      currentPage="File Attachment Services"
      // breadcrumbs={[
      //   { label: "File Attachment Services" },
      //   { label: "File List" },
      // ]}
      pageHeader={{
        title: "Files List",
        description:
          "Manage controlled documents across their entire lifecycle.",
        action: canCreate ? (
          <PrimaryButton
            id="upload-new-file-btn"
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload New File
          </PrimaryButton>
        ) : null,
      }}
    >
      <div className="overflow-hidden">
        {/* Filter bar */}
        <div className="border-b border-[rgba(0,0,0,0.08)] pb-2">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <SearchBox
              value={search}
              onChange={(v) => {
                setSearch(v);
                setCurrentPage(1);
              }}
              placeholder="Search by name, ID..."
            />

            {/* Category filter */}
            <FilterPill
              label="Category"
              options={categoryOptions}
              value={categoryFilter}
              onChange={(v) => {
                setCategoryFilter(v);
                setCurrentPage(1);
              }}
            />

            {/* Source Module filter */}
            <FilterDropdown
              label="Module"
              options={modules.map((m) => ({ value: m.id, label: m.name }))}
              value={moduleIdFilter}
              onChange={(val) => {
                setModuleIdFilter(val as string | null);
                setCurrentPage(1);
              }}
              placeholder="All Modules"
            />

            {/* More Filters label pill */}
            {/* <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border border-[rgba(0,0,0,0.1)] bg-white text-[#475569] hover:border-[#084cc8]/30 transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              More Filters
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button> */}

            <div className="ml-auto">
              <button
                onClick={clearFilters}
                className="text-sm font-medium text-[#6b7280] hover:text-[#0f1724] transition-colors"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <DataTable
          data={files}
          columns={columns}
          keyExtractor={(file) => file.id}
          isLoading={isLoading}
          error={error}
          emptyMessage="No files found"
          mobileCardRenderer={mobileCardRenderer}
        />

        {/* Pagination */}
        {total > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total}
            limit={limit}
            onPageChange={setCurrentPage}
            onLimitChange={setLimit}
          />
        )}
      </div>

      {/* Upload modal */}
      <FileUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        categories={categories}
        onUploaded={() => {
          setShowUpload(false);
          void loadFiles();
        }}
        isTenantAdmin={canCreate}
      />

      {fileToDelete && (
        <DeleteConfirmationModal
          isOpen={!!fileToDelete}
          onClose={() => setFileToDelete(null)}
          onConfirm={handleDelete}
          title="Delete File"
          message="Are you sure you want to delete this file"
          itemName={fileToDelete.name}
          isLoading={isDeleting}
        >
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
            <input
              type="checkbox"
              id="hard-delete-check"
              checked={isHardDelete}
              onChange={(e) => setIsHardDelete(e.target.checked)}
              className="w-4 h-4 text-red-600 focus:ring-red-500 border-red-300 rounded"
            />
            <label
              htmlFor="hard-delete-check"
              className="text-sm font-semibold text-red-700 cursor-pointer"
            >
              Permanent Delete (Hard Delete)
            </label>
            <p className="text-[10px] text-red-600/70 ml-1">
              {isHardDelete
                ? "Files will be wiped from storage."
                : "Files will be moved to trash."}
            </p>
          </div>
        </DeleteConfirmationModal>
      )}
    </Layout>
  );
};

export default FilesList;
