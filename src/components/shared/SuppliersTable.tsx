import { useState, useEffect, type ReactElement } from "react";
import {
  PrimaryButton,
  StatusBadge,
  ActionDropdown,
  DataTable,
  Pagination,
  // FilterDropdown,
  type Column,
  SupplierModal,
  ViewSupplierModal,
  SupplierContactsModal,
  SupplierScorecardsModal,
  SearchBox,
} from "@/components/shared";
import { Plus, Building2 } from "lucide-react";
import { supplierService } from "@/services/supplier-service";
import type { Supplier } from "@/types/supplier";
// import { formatDate } from "@/utils/format-date";
// import { useAppTheme } from "@/hooks/useAppTheme";

interface SuppliersTableProps {
  tenantId?: string | null;
  showHeader?: boolean;
  compact?: boolean;
}

const getStatusVariant = (
  status: string,
): "success" | "failure" | "process" | "info" => {
  switch (status?.toLowerCase()) {
    case "approved":
    case "qualified":
      return "success";
    case "pending":
    case "conditional":
      return "process";
    case "suspended":
    case "disqualified":
      return "failure";
    default:
      return "success";
  }
};

const getCategoryColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700";
    case "major":
      return "bg-orange-100 text-orange-700";
    case "minor":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const SuppliersTable = ({
  tenantId,
  showHeader = true,
  compact = false,
}: SuppliersTableProps): ReactElement => {
  // const { primaryColor } = useAppTheme();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(compact ? 5 : 10);
  const [total, setTotal] = useState<number>(0);
  // const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">(
    "create",
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>("");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [scorecardsModalOpen, setScorecardsModalOpen] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await supplierService.list({
        tenantId,
        // status: statusFilter || undefined,
        search: searchQuery || undefined,
        limit,
        offset: (currentPage - 1) * limit,
      });

      if (response.success) {
        setSuppliers(response.data);
        setTotal(response.pagination.total);
      } else {
        setError("Failed to load suppliers");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to load suppliers",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [tenantId, currentPage, limit, searchQuery]);

  const handleCreate = () => {
    setModalMode("create");
    setSelectedSupplierId(null);
    setModalOpen(true);
  };

  const handleView = (id: string) => {
    setSelectedSupplierId(id);
    setViewModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setModalMode("edit");
    setSelectedSupplierId(id);
    setModalOpen(true);
  };

  const handleContacts = (id: string, name: string) => {
    setSelectedSupplierId(id);
    setSelectedSupplierName(name);
    setContactsModalOpen(true);
  };

  const handleScorecards = (id: string, name: string) => {
    setSelectedSupplierId(id);
    setSelectedSupplierName(name);
    setScorecardsModalOpen(true);
  };

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      label: "Supplier Name & Code",
      render: (supplier) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-50 border border-[rgba(0,0,0,0.08)] rounded-lg flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-[#9aa6b2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[#0f1724]">
              {supplier.name}
            </span>
            {supplier.supplier_code && (
              <span className="text-[10px] text-[#6b7280] font-mono">
                {supplier.supplier_code}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "supplier_type",
      label: "Type",
      render: (supplier) => (
        <span className="">
          {supplier.supplier_type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (supplier) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${getCategoryColor(supplier.category)}`}
        >
          {supplier.category}
        </span>
      ),
    },
    // {
    //   key: "status",
    //   label: "Status",
    //   render: (supplier) => (
    //     <StatusBadge variant={getStatusVariant(supplier.status)}>
    //       {supplier.status}
    //     </StatusBadge>
    //   ),
    // },
    // {
    //   key: "location",
    //   label: "Location",
    //   render: (supplier) => (
    //     <span className="text-sm text-[#6b7280]">
    //       {supplier.address?.city
    //         ? `${supplier.address.city}, ${supplier.address.country}`
    //         : supplier.address?.country || "-"}
    //     </span>
    //   ),
    // },
    // {
    //   key: "created_at",
    //   label: "Dated",
    //   render: (supplier) => (
    //     <span className="text-sm text-[#6b7280]">
    //       {formatDate(supplier.created_at)}
    //     </span>
    //   ),
    // },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (supplier) => (
        <div className="flex justify-end">
          <ActionDropdown
            onView={() => handleView(supplier.id)}
            onEdit={() => handleEdit(supplier.id)}
            // onContacts={() => handleContacts(supplier.id, supplier.name)}
            // onScorecards={() => handleScorecards(supplier.id, supplier.name)}
          />
        </div>
      ),
    },
  ];

  const mobileCardRenderer = (supplier: Supplier) => (
    <div className="p-4 border-b border-[#D1D5DB]">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 border border-[#D1D5DB] rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#9aa6b2]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0f1724]">
              {supplier.name}
            </h3>
            <p className="text-xs text-[#6b7280]">{supplier.supplier_type}</p>
          </div>
        </div>
        <ActionDropdown
          onView={() => handleView(supplier.id)}
          onEdit={() => handleEdit(supplier.id)}
          onContacts={() => handleContacts(supplier.id, supplier.name)}
          onScorecards={() => handleScorecards(supplier.id, supplier.name)}
        />
      </div>
      <div className="flex gap-2 items-center">
        <StatusBadge variant={getStatusVariant(supplier.status)}>
          {supplier.status}
        </StatusBadge>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${getCategoryColor(supplier.category)}`}
        >
          {supplier.category}
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {showHeader && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#D1D5DB]">
          <div className="flex flex-wrap items-center gap-3">
            
            <SearchBox 
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              placeholder="Search by name or code..."
            />
            {/* <FilterDropdown
              label="Status"
              options={[
                // { value: "", label: "All Status" },
                { value: "approved", label: "Approved" },
                { value: "qualified", label: "Qualified" },
                { value: "pending", label: "Pending" },
                { value: "suspended", label: "Suspended" },
                { value: "disqualified", label: "Disqualified" },
              ]}
              value={statusFilter || ""}
              onChange={(val) => {
                setStatusFilter(val as string);
                setCurrentPage(1);
              }}
            /> */}
          </div>
          <PrimaryButton
            onClick={handleCreate}
            className="flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-xs">New Supplier</span>
          </PrimaryButton>
        </div>
      )}

      <div className="overflow-hidden">
        <DataTable
          columns={columns}
          data={suppliers}
          keyExtractor={(s) => s.id}
          isLoading={isLoading}
          error={error}
          mobileCardRenderer={mobileCardRenderer}
          emptyMessage="No suppliers found"
        />
        {total > 0 && (
          <div className="p-4 border-t border-[rgba(0,0,0,0.08)]">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(total / limit)}
              totalItems={total}
              limit={limit}
              onPageChange={setCurrentPage}
              onLimitChange={setLimit}
            />
          </div>
        )}
      </div>

      <SupplierModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        supplierId={selectedSupplierId}
        tenantId={tenantId}
        onSuccess={fetchSuppliers}
      />

      <ViewSupplierModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        supplierId={selectedSupplierId}
        tenantId={tenantId}
      />

      <SupplierContactsModal
        isOpen={contactsModalOpen}
        onClose={() => setContactsModalOpen(false)}
        supplierId={selectedSupplierId}
        supplierName={selectedSupplierName}
        tenantId={tenantId}
      />

      <SupplierScorecardsModal
        isOpen={scorecardsModalOpen}
        onClose={() => setScorecardsModalOpen(false)}
        supplierId={selectedSupplierId}
        supplierName={selectedSupplierName}
        tenantId={tenantId}
      />
    </div>
  );
};
