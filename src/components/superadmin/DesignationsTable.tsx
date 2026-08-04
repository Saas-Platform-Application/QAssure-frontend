import {
  useState,
  useEffect,
  type ReactElement,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useSelector } from "react-redux";
import {
  StatusBadge,
  ActionDropdown,
  DataTable,
  Pagination,
  type Column,
  SearchBox,
  ActiveOnlyToggle,
} from "@/components/shared";
import {
  NewDesignationModal,
  EditDesignationModal,
  ViewDesignationModal,
} from "@/components/shared/DesignationModals";
// import { Plus } from "lucide-react";
import { designationService } from "@/services/designation-service";
import type {
  Designation,
  CreateDesignationRequest,
  UpdateDesignationRequest,
} from "@/types/designation";
import { showToast } from "@/utils/toast";
import type { RootState } from "@/store/store";
import { usePermissions } from "@/hooks/usePermissions";
// import { useAppTheme } from "@/hooks/useAppTheme";
import CodeBadge from "../shared/CodeBadge";

export interface DesignationsTableRef {
  openNewModal: () => void;
  refresh: () => void;
}

interface DesignationsTableProps {
  tenantId?: string | null; // If provided, use this tenantId (Super Admin mode)
  compact?: boolean; // Compact mode for tabs
  showHeader?: boolean;
}

const DesignationsTable = forwardRef<
  DesignationsTableRef,
  DesignationsTableProps
>(
  (
    { tenantId: propsTenantId, compact = false, showHeader = true },
    ref,
  ): ReactElement => {
    const { canUpdate } = usePermissions();
    // const { primaryColor } = useAppTheme();
    const reduxTenantId = useSelector(
      (state: RootState) => state.auth.tenantId,
    );
    const effectiveTenantId = propsTenantId || reduxTenantId;

    const [designations, setDesignations] = useState<Designation[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      openNewModal: () => setIsNewModalOpen(true),
      refresh: () => fetchDesignations(),
    }));

    // Pagination state
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
    const [selectedDesignation, setSelectedDesignation] =
      useState<Designation | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const fetchDesignations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await designationService.list(effectiveTenantId, {
          active_only: activeOnly,
          search: debouncedSearchQuery,
        });
        if (response.success) {
          setDesignations(response.data);
        } else {
          setError("Failed to load designations");
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.error?.message || "Failed to load designations",
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
      fetchDesignations();
    }, [effectiveTenantId, activeOnly, debouncedSearchQuery]);

    const handleCreate = async (data: CreateDesignationRequest) => {
      try {
        setIsActionLoading(true);
        const response = await designationService.create(
          data,
          effectiveTenantId,
        );
        if (response.success) {
          showToast.success("Designation created successfully");
          setIsNewModalOpen(false);
          fetchDesignations();
        }
      } catch (err: any) {
        showToast.error(
          err?.response?.data?.error?.message || "Failed to create designation",
        );
      } finally {
        setIsActionLoading(false);
      }
    };

    const handleUpdate = async (id: string, data: UpdateDesignationRequest) => {
      try {
        setIsActionLoading(true);
        const response = await designationService.update(
          id,
          data,
          effectiveTenantId,
        );
        if (response.success) {
          showToast.success("Designation updated successfully");
          setIsEditModalOpen(false);
          fetchDesignations();
        }
      } catch (err: any) {
        showToast.error(
          err?.response?.data?.error?.message || "Failed to update designation",
        );
      } finally {
        setIsActionLoading(false);
      }
    };

    // const handleDelete = async () => {
    //   if (!selectedDesignation) return;
    //   try {
    //     setIsActionLoading(true);
    //     const response = await designationService.delete(
    //       selectedDesignation.id,
    //       effectiveTenantId,
    //     );
    //     if (response.success) {
    //       showToast.success("Designation deleted successfully");
    //       setIsDeleteModalOpen(false);
    //       fetchDesignations();
    //     }
    //   } catch (err: any) {
    //     showToast.error(
    //       err?.response?.data?.error?.message || "Failed to delete designation",
    //     );
    //   } finally {
    //     setIsActionLoading(false);
    //   }
    // };

    // Client-side pagination logic
    const totalItems = designations.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedData = designations.slice(
      (currentPage - 1) * limit,
      currentPage * limit,
    );

    const columns: Column<Designation>[] = [
      {
        key: "name",
        label: "Designation Name",
        render: (desig) => (
          <span className="text-sm font-medium text-[#0f1724]">
            {desig.name}
          </span>
        ),
      },
      {
        key: "code",
        label: "Code",
        render: (desig) => <CodeBadge label={desig.code} />,
      },
      {
        key: "level",
        label: "Level",
        render: (desig) => (
          <span className="text-sm text-[#6b7280]">{desig.level}</span>
        ),
      },
      {
        key: "sort_order",
        label: "Order",
        render: (desig) => (
          <span className="text-sm text-[#6b7280]">{desig.sort_order}</span>
        ),
      },
      {
        key: "user_count",
        label: "Users",
        render: (desig) => (
          <span className="text-sm text-[#6b7280]">
            {desig.user_count || 0}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (desig) => (
          <StatusBadge variant={desig.is_active ? "success" : "failure"}>
            {desig.is_active ? "Active" : "Inactive"}
          </StatusBadge>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        render: (desig) => (
          <div className="flex justify-end">
            <ActionDropdown
              onView={() => {
                setSelectedDesignation(desig);
                setIsViewModalOpen(true);
              }}
              onEdit={
                canUpdate("designations")
                  ? () => {
                      setSelectedDesignation(desig);
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
      <div className={`flex flex-col gap-4 ${!compact ? "bg-white" : ""}`}>
        {showHeader && (
          <div className="pb-2 border-b border-[rgba(0,0,0,0.08)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <SearchBox
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search designations..."
              />
            </div>
            <ActiveOnlyToggle
              activeOnly={activeOnly}
              onChange={(val) => setActiveOnly(val)}
            />
          </div>
        )}

        <DataTable
          data={paginatedData}
          columns={columns}
          keyExtractor={(desig) => desig.id}
          isLoading={isLoading}
          error={error}
          emptyMessage="No designations found"
        />

        {totalItems > 0 && (
          <Pagination
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
        )}

        <NewDesignationModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSubmit={handleCreate}
          isLoading={isActionLoading}
        />

        <EditDesignationModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedDesignation(null);
          }}
          designation={selectedDesignation}
          onSubmit={handleUpdate}
          isLoading={isActionLoading}
        />

        <ViewDesignationModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedDesignation(null);
          }}
          designation={selectedDesignation}
        />

        {/* <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDesignation(null);
        }}
        onConfirm={handleDelete}
        title="Delete Designation"
        message="Are you sure you want to delete this designation? This action cannot be undone."
        itemName={selectedDesignation?.name || ""}
        isLoading={isActionLoading}
      /> */}
      </div>
    );
  },
);

export default DesignationsTable;
