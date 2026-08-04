import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  FilterDropdown,
  Pagination,
  PrimaryButton,
  type Column,
} from "@/components/shared";
import { documentService } from "@/services/document-service";
import { moduleService } from "@/services/module-service";
import type { DocumentCategory, DocumentSummary } from "@/types/document";
import type { Module } from "@/types/module";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Plus, Search } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toLabel = (value: string): string =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const Documents = (): ReactElement => {
  const { primaryColor } = useAppTheme();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [statuses, setStatuses] = useState<
    Array<{ code: string; name: string }>
  >([]);
  const [types, setTypes] = useState<Array<{ code: string; name: string }>>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canCreate } = usePermissions();

  const offset = (currentPage - 1) * limit;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    const loadDropdownData = async (): Promise<void> => {
      try {
        const [categoriesRes, statusesRes, typesRes, modulesRes] =
          await Promise.all([
            documentService.getCategories(),
            documentService.getStatuses(),
            documentService.getTypes(),
            moduleService.getAvailable(),
          ]);
        setCategories(categoriesRes.data || []);
        setStatuses(statusesRes.data || []);
        setTypes(typesRes.data || []);
        setModules(modulesRes.data || []);
      } catch {
        // Keep page usable even if some filter metadata endpoints fail.
      }
    };

    void loadDropdownData();
  }, []);

  useEffect(() => {
    const loadDocuments = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await documentService.list({
          status: statusFilter || undefined,
          category_id: categoryFilter || undefined,
          document_type: typeFilter || undefined,
          source_module_id: moduleFilter || undefined,
          search: search.trim() || undefined,
          limit,
          offset,
        });
        setDocuments(response.data || []);
        setTotal(response.pagination?.total || 0);
      } catch (err: any) {
        setError(
          err?.response?.data?.error?.message || "Failed to load documents",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadDocuments();
  }, [
    statusFilter,
    categoryFilter,
    typeFilter,
    moduleFilter,
    search,
    limit,
    offset,
  ]);

  const columns: Column<DocumentSummary>[] = useMemo(() => {
    const cols: Column<DocumentSummary>[] = [
      {
        key: "document_number",
        label: "Document No",
        render: (doc) => (
          <button
            type="button"
            className="hover:underline transition-colors cursor-pointer"
            style={{ color: primaryColor }}
            onClick={() => navigate(`/tenant/documents/${doc.id}`)}
          >
            {doc.document_number}
          </button>
        ),
      },
      {
        key: "title",
        label: "Title",
        render: (doc) => <span className="">{doc.title}</span>,
      },
      {
        key: "document_type",
        label: "Type",
        render: (doc) => <span className="">{doc.document_type || "-"}</span>,
      },
      {
        key: "category",
        label: "Category",
        render: (doc) => <span className="">{doc.category || "-"}</span>,
      },
      {
        key: "status",
        label: "Status",
        render: (doc) => (
          <span
            className="inline-flex items-center rounded-md px-2 py-1 text-[11px]"
            style={{
              backgroundColor: `${primaryColor}1A`,
              color: primaryColor,
            }}
          >
            {toLabel(doc.status)}
          </span>
        ),
      },
      {
        key: "module_name",
        label: "Module",
        render: (doc) => (
          <span className="">{doc.module_name || "Platform"}</span>
        ),
      },
      {
        key: "current_version",
        label: "Version",
        render: (doc) => (
          <span className="">{doc.current_version || "-"}</span>
        ),
      },
      {
        key: "updated_at",
        label: "Updated",
        render: (doc) => (
          <span className="">{formatDate(doc.updated_at)}</span>
        ),
      },
    ];

    if (canCreate("document")) {
      cols.push({
        key: "actions",
        label: "Actions",
        render: (doc) => (
          <button
            type="button"
            className="text-xs transition-colors hover:underline font-medium"
            style={{ color: primaryColor }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/tenant/documents/edit/${doc.id}`);
            }}
          >
            Edit
          </button>
        ),
      });
    }

    return cols;
  }, [navigate, canCreate, primaryColor]);

  return (
    <Layout
      currentPage="Document Service"
      pageHeader={{
        title: "Document List",
        description:
          "Manage controlled documents, track versions and open document details.",
        action: (
          <div className="flex gap-2">
            {/* <button
              type="button"
              className="h-10 px-3 border border-[rgba(0,0,0,0.08)] rounded-md text-xs text-[#0f1724] hover:bg-gray-50 bg-white transition-colors"
              onClick={() => navigate("/tenant/documents/categories")}
            >
              Manage Categories
            </button> */}
            {canCreate("document") && (
              <PrimaryButton
                onClick={() => navigate("/tenant/documents/create")}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Document
              </PrimaryButton>
            )}
          </div>
        ),
      }}
    >
      <div className="overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-2">
          {/* Left side: Search and Filters */}
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Bar */}
            <div className="relative w-full max-w-[280px]">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, ID..."
                className="h-10 w-full pl-9 pr-3 bg-white border border-[rgba(0,0,0,0.08)] rounded-md text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  // @ts-ignore
                  "--tw-ring-color": `${primaryColor}33`,
                  borderColor: "rgba(0,0,0,0.08)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = primaryColor;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColor}1A`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <FilterDropdown
                label="Status"
                options={statuses.map((status) => ({
                  value: status.code,
                  label: status.name,
                }))}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value as string | null);
                  setCurrentPage(1);
                }}
                placeholder="All"
              />

              <FilterDropdown
                label="Category"
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                value={categoryFilter}
                onChange={(value) => {
                  setCategoryFilter(value as string | null);
                  setCurrentPage(1);
                }}
                placeholder="All"
              />

              <FilterDropdown
                label="Type"
                options={types.map((type) => ({
                  value: type.code,
                  label: type.name,
                }))}
                value={typeFilter}
                onChange={(value) => {
                  setTypeFilter(value as string | null);
                  setCurrentPage(1);
                }}
                placeholder="All"
              />

              <FilterDropdown
                label="Module"
                options={modules.map((module) => ({
                  value: module.id,
                  label: module.name,
                }))}
                value={moduleFilter}
                onChange={(value) => {
                  setModuleFilter(value as string | null);
                  setCurrentPage(1);
                }}
                placeholder="All Modules"
              />

              {/* <FilterDropdown
                  label="Priority"
                  options={[
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                  ]}
                  value={null}
                  onChange={() => {}}
                  placeholder="All"
                />

                <FilterDropdown
                  label=""
                  showIcon={true}
                  icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                  options={[
                    { value: "more", label: "More Filters..." },
                  ]}
                  value={null}
                  onChange={() => {}}
                  placeholder="More"
                /> */}
            </div>
          </div>

          {/* Right side: Clear Filters */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter(null);
                setCategoryFilter(null);
                setTypeFilter(null);
                setModuleFilter(null);
                setCurrentPage(1);
              }}
              className="text-[13px] font-medium text-[#6b7280] hover:text-[#94A3B8] transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        </div>

        <DataTable
          data={documents}
          columns={columns}
          keyExtractor={(doc) => doc.id}
          emptyMessage="No documents found"
          isLoading={isLoading}
          error={error}
        />

        {total > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total}
            limit={limit}
            onPageChange={setCurrentPage}
            onLimitChange={(value) => {
              setLimit(value);
              setCurrentPage(1);
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default Documents;
