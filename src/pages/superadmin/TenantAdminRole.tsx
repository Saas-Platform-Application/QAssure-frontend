import { useState, useEffect, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout/Layout";
import {
  PrimaryButton,
  SecondaryButton,
  Modal,
  FormField,
  FormSelect,
  StatusBadge,
  DataTable,
  Pagination,
  DeleteConfirmationModal,
  type Column,
} from "@/components/shared";
import { roleService } from "@/services/role-service";
import { permissionService } from "@/services/permission-service";
import type { Role, Permission } from "@/types/role";
import { showToast } from "@/utils/toast";
import {
  Shield,
  Plus,
  Trash2,
  Loader2,
  ShieldAlert,
} from "lucide-react";

// Zod Schema for custom permissions
const customPermissionSchema = z.object({
  resource: z
    .string()
    .min(1, "Resource name is required")
    .regex(
      /^[a-z0-9_]+$/,
      "Resource name must be lowercase alphanumeric and can contain underscores"
    ),
  action: z.string().min(1, "Action is required"),
});

type CustomPermissionFormData = z.infer<typeof customPermissionSchema>;

export default function TenantAdminRole(): ReactElement {
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // All permissions list for tenant_admin
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Pagination state for permissions table
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Add Custom Permission Modal state
  const [isAddCustomOpen, setIsAddCustomOpen] = useState<boolean>(false);
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);

  // Delete/Revoke Permission state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CustomPermissionFormData>({
    resolver: zodResolver(customPermissionSchema),
    defaultValues: {
      resource: "",
      action: "read",
    },
  });
  const loadPermissions = async (roleId: string, pageNum: number, limitNum: number) => {
    try {
      const response = await permissionService.getAll(pageNum, limitNum, { role_id: roleId });
      if (response.success) {
        setPermissions(response.data);
        if (response.pagination) {
          setTotalItems(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      }
    } catch (err: any) {
      showToast.error("Failed to load permissions list.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTenantAdminRole = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch roles to find tenant_admin
      const rolesResponse = await roleService.getAll(1, 100, null, "tenant_admin", null, true);
      if (!rolesResponse.success || rolesResponse.data.length === 0) {
        throw new Error("Tenant Admin role not found. Please verify that the system is seeded.");
      }

      const tenantAdminSummary = rolesResponse.data.find(
        (r) => r.code === "tenant_admin"
      );
      if (!tenantAdminSummary) {
        throw new Error("Tenant Admin role not found among tenant roles.");
      }

      // Keep role metadata
      setRole(tenantAdminSummary);
    } catch (err: any) {
      setError(err.message || "Failed to load Tenant Admin role data.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenantAdminRole();
  }, []);

  // When page or limit changes, load updated permissions
  useEffect(() => {
    if (role?.id) {
      loadPermissions(role.id, page, limit);
    }
  }, [page, limit, role?.id]);

  // Add custom permission directly via Permission API (Always tenant scoped)
  const handleAddCustomPermission = async (data: CustomPermissionFormData) => {
    if (!role) return;
    try {
      setIsAddingCustom(true);
      const payload = {
        role_id: role.id,
        resource: data.resource.trim().toLowerCase(),
        action: data.action.trim().toLowerCase(),
        scope: "tenant" as const, // Always tenant scoped
      };

      const response = await permissionService.create(payload);
      if (response.success) {
        showToast.success("Permission added successfully.");
        setIsAddCustomOpen(false);
        reset();
        await loadPermissions(role.id, page, limit);
      }
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to add permission."
      );
    } finally {
      setIsAddingCustom(false);
    }
  };

  // Revoke permission directly via Permission API
  const handleRevokePermission = async () => {
    if (!deleteTargetId || !role) return;
    try {
      setIsDeleting(true);
      const response = await permissionService.delete(deleteTargetId);
      if (response.success) {
        showToast.success("Permission revoked successfully.");
        setDeleteTargetId(null);
        await loadPermissions(role.id, page, limit);
      }
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to revoke permission."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // DataTable column mapping for permissions
  const columns: Column<Permission>[] = [
    {
      key: "resource",
      label: "Resource",
      width: "40%",
      render: (item) => (
        <code className="bg-slate-50 px-1.5 py-0.5 rounded font-mono text-xs text-slate-700">
          {item.resource}
        </code>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "25%",
      render: (item) => (
        <span className="px-2 py-1 bg-slate-100 text-slate-700 font-mono rounded text-xs">
          {item.action}
        </span>
      ),
    },
    {
      key: "scope",
      label: "Scope",
      width: "20%",
      render: (item) => (
        <StatusBadge variant="info">
          {item.scope || "tenant"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      label: "Action",
      width: "15%",
      align: "right",
      render: (item) => (
        <button
          onClick={() => item.id && setDeleteTargetId(item.id)}
          className="p-1.5 text-slate-400 hover:text-[#ef4444] hover:bg-red-50 rounded-md transition-colors"
          title="Revoke Permission"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Layout
        currentPage="Tenant Admin Role"
        pageHeader={{
          title: "Tenant Admin Permissions",
          description: "Manage permissions assigned to the system tenant admin role.",
        }}
      >
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-10 h-10 text-[#0F3CC9] animate-spin mb-4" />
          <p className="text-slate-500 text-sm">Loading Tenant Admin configuration...</p>
        </div>
      </Layout>
    );
  }

  if (error || !role) {
    return (
      <Layout
        currentPage="Tenant Admin Role"
        pageHeader={{
          title: "Tenant Admin Permissions",
          description: "Manage permissions assigned to the system tenant admin role.",
        }}
      >
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto my-8 text-center">
          <ShieldAlert className="w-12 h-12 text-[#ef4444] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-900 mb-2">Configuration Error</h3>
          <p className="text-red-700 text-sm mb-6">{error || "Role not found."}</p>
          <SecondaryButton onClick={loadTenantAdminRole} className="px-4 py-2">
            Retry Loading
          </SecondaryButton>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="Tenant Admin Role"
      pageHeader={{
        title: "Tenant Admin Permission Control",
        description: "Configure system-wide administrative permissions inherited by all Tenant Admins.",
      }}
    >
      <div className="flex flex-col gap-6">
        {/* Role Meta Information Card */}
        <div className="p-6 bg-white border border-[#E5E7EB] rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F3CC9]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900">{role.name}</h2>
                <StatusBadge variant="info">Tenant Scoped</StatusBadge>
                {role.is_system && (
                  <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 rounded">
                    System seeded
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Role Code: <code className="bg-slate-50 px-1.5 py-0.5 rounded font-mono text-xs text-slate-700">{role.code}</code>
              </p>
              <p className="text-xs text-slate-400 mt-2">
                This is a global system template. Changes here immediately affect the permission policies of all active tenants.
              </p>
            </div>
          </div>
        </div>

        {/* Permissions Table Section */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
            <div>
              <h3 className="text-md font-bold text-slate-900">Tenant Admin Permissions</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage granular, scope-specific system policies or actions assigned to this role.
              </p>
            </div>
            <SecondaryButton
              onClick={() => setIsAddCustomOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Permission</span>
            </SecondaryButton>
          </div>

          <div className="p-4 flex flex-col gap-4">
            <DataTable
              data={permissions}
              columns={columns}
              keyExtractor={(item) => item.id || `${item.resource}-${item.action}`}
              emptyMessage="No permissions configured for this role."
            />

            {totalItems > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                limit={limit}
                onPageChange={(p: number) => setPage(p)}
                onLimitChange={(l: number) => {
                  setLimit(l);
                  setPage(1);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Add Custom Permission Modal */}
      <Modal
        isOpen={isAddCustomOpen}
        onClose={() => {
          setIsAddCustomOpen(false);
          reset();
        }}
        title="Add Custom Permission"
        description="Define a granular resource policy mapping directly to the database permission rules."
        footer={
          <>
            <SecondaryButton
              onClick={() => {
                setIsAddCustomOpen(false);
                reset();
              }}
              disabled={isAddingCustom}
              className="px-4 py-2 text-sm"
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={handleSubmit(handleAddCustomPermission)}
              disabled={isAddingCustom}
              className="px-4 py-2 text-sm"
            >
              {isAddingCustom ? "Adding..." : "Add Permission"}
            </PrimaryButton>
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(handleAddCustomPermission)}>
          <FormField
            label="Resource Name"
            required
            placeholder="e.g. prompt_templates, audit_filters"
            {...register("resource")}
            error={errors.resource?.message}
          />

          <FormSelect
            label="Action"
            required
            options={[
              { value: "read", label: "Read" },
              { value: "create", label: "Create" },
              { value: "update", label: "Update" },
              { value: "delete", label: "Delete" },
              { value: "*", label: "All Access (*)" },
            ]}
            value={watch("action")}
            onValueChange={(val) => setValue("action", val, { shouldValidate: true })}
            error={errors.action?.message}
          />
        </form>
      </Modal>

      {/* Revoke confirmation modal */}
      <DeleteConfirmationModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleRevokePermission}
        title="Revoke Permission"
        message="Are you sure you want to revoke this advanced permission? This will take effect immediately across all tenants."
        isLoading={isDeleting}
      />
    </Layout>
  );
}
