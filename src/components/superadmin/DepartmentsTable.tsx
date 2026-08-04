import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  type ReactElement,
} from "react";
import { useSelector } from "react-redux";
import {
  // PrimaryButton,
  StatusBadge,
  ActionDropdown,
  // DataTable,
  // Pagination,
  // FilterDropdown,
  // DeleteConfirmationModal,
  SearchBox,
  ActiveOnlyToggle,
  type Column,
} from "@/components/shared";
import {
  NewDepartmentModal,
  EditDepartmentModal,
  ViewDepartmentModal,
} from "@/components/shared/DepartmentModals";
// import { Plus } from "lucide-react";
import { departmentService } from "@/services/department-service";
import { DepartmentListView } from "./DepartmentListView";
import { DepartmentTreeView } from "./DepartmentTreeView";
import type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from "@/types/department";
import { showToast } from "@/utils/toast";
import type { RootState } from "@/store/store";
import { useAppTheme } from "@/hooks/useAppTheme";
import { usePermissions } from "@/hooks/usePermissions";
import CodeBadge from "../shared/CodeBadge";

interface DepartmentsTableProps {
  tenantId?: string | null; // If provided, use this tenantId (Super Admin mode)
  compact?: boolean; // Compact mode for tabs
  showHeader?: boolean;
}

export interface DepartmentsTableRef {
  openNewModal: () => void;
}

export const DepartmentsTable = forwardRef<
  DepartmentsTableRef,
  DepartmentsTableProps
>(
  (
    {
      tenantId: propsTenantId,
      compact = false,
      showHeader = true,
    }: DepartmentsTableProps,
    ref,
  ): ReactElement => {
    const { primaryColor } = useAppTheme();
    const { canUpdate, canCreate } = usePermissions();
    const reduxTenantId = useSelector(
      (state: RootState) => state.auth.tenantId,
    );
    const effectiveTenantId = propsTenantId || reduxTenantId;

    const [departments, setDepartments] = useState<Department[]>([]);
    const [treeData, setTreeData] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"list" | "tree">("list");

    // Pagination state (Client-side since backend doesn't support it yet)
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(compact ? 10 : 5);

    // Filter state
    const [activeOnly, setActiveOnly] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] =
      useState<string>("");

    // Modal states
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    // const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] =
      useState<Department | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      openNewModal: () => setIsNewModalOpen(true),
    }));

    const fetchDepartments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (viewMode === "list") {
          const response = await departmentService.list(effectiveTenantId, {
            active_only: activeOnly,
            search: debouncedSearchQuery,
          });
          if (response.success) {
            setDepartments(response.data);
          } else {
            setError("Failed to load departments");
          }
        } else {
          const response = await departmentService.getTree(
            effectiveTenantId,
            activeOnly,
          );
          if (response.success) {
            setTreeData(response.data);
          } else {
            setError("Failed to load department tree");
          }
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.error?.message || "Failed to load departments",
        );
      } finally {
        setIsLoading(false);
      }
    };

    // Debouncing search query
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery);
      }, 500);

      return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
      fetchDepartments();
    }, [effectiveTenantId, activeOnly, debouncedSearchQuery, viewMode]);

    const handleCreate = async (data: CreateDepartmentRequest) => {
      try {
        setIsActionLoading(true);
        const response = await departmentService.create(
          data,
          effectiveTenantId,
        );
        if (response.success) {
          showToast.success("Department created successfully");
          setIsNewModalOpen(false);
          fetchDepartments();
        }
      } catch (err: any) {
        showToast.error(
          err?.response?.data?.error?.message || "Failed to create department",
        );
      } finally {
        setIsActionLoading(false);
      }
    };

    const handleUpdate = async (id: string, data: UpdateDepartmentRequest) => {
      try {
        setIsActionLoading(true);
        const response = await departmentService.update(
          id,
          data,
          effectiveTenantId,
        );
        if (response.success) {
          showToast.success("Department updated successfully");
          setIsEditModalOpen(false);
          fetchDepartments();
        }
      } catch (err: any) {
        showToast.error(
          err?.response?.data?.error?.message || "Failed to update department",
        );
      } finally {
        setIsActionLoading(false);
      }
    };

    // const handleDelete = async () => {
    //   if (!selectedDepartment) return;
    //   try {
    //     setIsActionLoading(true);
    //     const response = await departmentService.delete(
    //       selectedDepartment.id,
    //       effectiveTenantId,
    //     );
    //     if (response.success) {
    //       showToast.success("Department deleted successfully");
    //       setIsDeleteModalOpen(false);
    //       fetchDepartments();
    //     }
    //   } catch (err: any) {
    //     showToast.error(
    //       err?.response?.data?.error?.message || "Failed to delete department",
    //     );
    //   } finally {
    //     setIsActionLoading(false);
    //   }
    // };

    // Client-side pagination logic
    const totalItems = departments.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedData = departments.slice(
      (currentPage - 1) * limit,
      currentPage * limit,
    );

    const columns: Column<Department>[] = [
      {
        key: "name",
        label: "Department Name",
        render: (dept) => (
          <span className="">
            {dept.name}
          </span>
        ),
      },
      {
        key: "code",
        label: "Code",
        render: (dept) => <CodeBadge label={dept.code} />,
      },
      {
        key: "parent_name",
        label: "Parent",
        render: (dept) => (
          <span className="">
            {dept.parent_name || "-"}
          </span>
        ),
      },
      {
        key: "level",
        label: "Level",
        render: (dept) => (
          <span className="">{dept.level}</span>
        ),
      },
      {
        key: "sort_order",
        label: "Order",
        render: (dept) => (
          <span className="">{dept.sort_order}</span>
        ),
      },
      {
        key: "child_count",
        label: "Sub-depts",
        render: (dept) => (
          <span className="">
            {dept.child_count || 0}
          </span>
        ),
      },
      {
        key: "user_count",
        label: "Users",
        render: (dept) => (
          <span className="">{dept.user_count || 0}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (dept) => (
          <StatusBadge variant={dept.is_active ? "success" : "failure"}>
            {dept.is_active ? "Active" : "Inactive"}
          </StatusBadge>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        render: (dept) => (
          <div className="flex justify-end">
            <ActionDropdown
              onView={() => {
                setSelectedDepartment(dept);
                setIsViewModalOpen(true);
              }}
              onEdit={
                canUpdate("departments")
                  ? () => {
                      setSelectedDepartment(dept);
                      setIsEditModalOpen(true);
                    }
                  : undefined
              }
            />
          </div>
        ),
      },
    ];

    return (
      <div className={`flex flex-col gap-2`}>
        {showHeader && (
          <div className="flex flex-col border-b border-[rgba(0,0,0,0.08)]">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-transparent">
              <div className="flex items-center gap-6">
                <button
                  className="pb-3 text-sm font-medium transition-all relative"
                  style={{
                    color: viewMode === "list" ? primaryColor : "#64748b",
                  }}
                  onClick={() => setViewMode("list")}
                >
                  List View
                  {viewMode === "list" && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: primaryColor }}
                    />
                  )}
                </button>
                <button
                  className="pb-3 text-sm font-medium transition-all relative"
                  style={{
                    color: viewMode === "tree" ? primaryColor : "#64748b",
                  }}
                  onClick={() => setViewMode("tree")}
                >
                  Tree View
                  {viewMode === "tree" && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: primaryColor }}
                    />
                  )}
                </button>
              </div>
              <div>
                <div className="flex items-center gap-3 pb-2">
                  {viewMode === "list" && (
                    <SearchBox
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search by name or code..."
                    />
                  )}
                  {/* Active Only Toggle */}
                  <ActiveOnlyToggle
                    activeOnly={activeOnly}
                    onChange={setActiveOnly}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === "list" ? (
          <DepartmentListView
            data={paginatedData}
            columns={columns}
            isLoading={isLoading}
            error={error}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            limit={limit}
            onPageChange={setCurrentPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setCurrentPage(1);
            }}
          />
        ) : (
          <DepartmentTreeView
            data={treeData}
            isLoading={isLoading}
            error={error}
            onAddSub={
              canCreate("departments")
                ? (item) => {
                    setSelectedDepartment(item);
                    setIsNewModalOpen(true);
                  }
                : undefined
            }
            onEdit={
              canUpdate("departments")
                ? (item) => {
                    setSelectedDepartment(item);
                    setIsEditModalOpen(true);
                  }
                : undefined
            }
          />
        )}

        <NewDepartmentModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSubmit={handleCreate}
          isLoading={isActionLoading}
          tenantId={effectiveTenantId}
        />

        <EditDepartmentModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedDepartment(null);
          }}
          department={selectedDepartment}
          onSubmit={handleUpdate}
          isLoading={isActionLoading}
          tenantId={effectiveTenantId}
        />

        <ViewDepartmentModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedDepartment(null);
          }}
          department={selectedDepartment}
        />

        {/* <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDepartment(null);
        }}
        onConfirm={handleDelete}
        title="Delete Department"
        message="Are you sure you want to delete this department? This action cannot be undone."
        itemName={selectedDepartment?.name || ""}
        isLoading={isActionLoading}
      /> */}
      </div>
    );
  },
);
