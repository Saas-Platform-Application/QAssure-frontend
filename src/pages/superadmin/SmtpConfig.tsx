import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DataTable,
  Pagination,
  StatusBadge,
  ActionDropdown,
  PrimaryButton,
  DeleteConfirmationModal,
  type Column,
} from "@/components/shared";
import { Plus, Globe, Building } from "lucide-react";
import {
  smtpConfigService,
  type SmtpConfig,
} from "@/services/smtp-config-service";
import { SmtpConfigModal } from "@/components/superadmin/SmtpConfigModal";
import { showToast } from "@/utils/toast";

const SmtpConfigPage = () => {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [configs, setConfigs] = useState<SmtpConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SmtpConfig | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const res = await smtpConfigService.listAll({
        offset: (currentPage - 1) * limit,
        limit: limit,
      });
      if (res.success) {
        setConfigs(res.data);
        // Assuming the API would return total items if we had many,
        // for now let's just use the length or a fixed number
        setTotalItems(res.data.length);
      }
    } catch (err) {
      showToast.error("Failed to load SMTP configurations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [currentPage, limit]);

  const handleEdit = (config: SmtpConfig) => {
    setSelectedConfig(config);
    setIsModalOpen(true);
  };

  const handleDelete = (config: SmtpConfig) => {
    setSelectedConfig(config);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedConfig?.id) return;
    setIsDeleting(true);
    try {
      await smtpConfigService.deleteConfig(
        selectedConfig.id,
        selectedConfig.tenant_id,
      );
      showToast.success("Configuration deleted");
      setDeleteModalOpen(false);
      fetchConfigs();
    } catch (err) {
      showToast.error("Failed to delete configuration");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<SmtpConfig>[] = [
    {
      key: "scope",
      label: "Scope",
      render: (config) => (
        <div className="flex items-center gap-2">
          {config.scope === "super_admin" ? (
            <Globe className="w-4 h-4 text-blue-600" />
          ) : (
            <Building className="w-4 h-4 text-purple-600" />
          )}
          <span>
            {config.scope === "super_admin"
              ? "Global"
              : config.tenant_name || "Tenant"}
          </span>
        </div>
      ),
    },
    {
      key: "host",
      label: "Server",
      render: (config) => (
        <span>
          {config.host}:{config.port}
        </span>
      ),
    },
    {
      key: "from_email",
      label: "Sender",
      render: (config) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {config.from_name || "N/A"}
          </span>
          <span className="text-xs text-gray-500">
            {config.from_email || "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (config) => (
        <StatusBadge variant={config.is_active ? "success" : "failure"}>
          {config.is_active ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (config) => (
        <ActionDropdown
          onEdit={canUpdate("settings") ? () => handleEdit(config) : undefined}
          onDelete={canDelete("settings") ? () => handleDelete(config) : undefined}
        />
      ),
    },
  ];

  return (
    <Layout
      currentPage="Settings"
      pageHeader={{
        title: "SMTP Configurations",
        description:
          "Manage email delivery settings for the entire platform and individual tenants.",
        action: canCreate("settings") ? (
          <PrimaryButton
            onClick={() => {
              setSelectedConfig(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Configuration
          </PrimaryButton>
        ) : undefined,
      }}
    >
      <div className="overflow-hidden">
        <DataTable
          columns={columns}
          data={configs}
          isLoading={isLoading}
          keyExtractor={(item) => item.id!}
          emptyMessage="No SMTP configurations found"
        />

        {totalItems > limit && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / limit)}
            totalItems={totalItems}
            limit={limit}
            onPageChange={setCurrentPage}
            onLimitChange={setLimit}
          />
        )}
      </div>

      <SmtpConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={fetchConfigs}
        config={selectedConfig}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete SMTP Configuration"
        message="Are you sure you want to delete this SMTP configuration? This action cannot be undone."
        itemName={
          selectedConfig?.scope === "super_admin"
            ? "Global Config"
            : selectedConfig?.tenant_name || "Tenant Config"
        }
        isLoading={isDeleting}
      />
    </Layout>
  );
};

export default SmtpConfigPage;
