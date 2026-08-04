import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Loader2 } from "lucide-react";
import { Modal, SecondaryButton, StatusBadge } from "@/components/shared";
import type { User } from "@/types/user";

// Helper function to get status badge variant
const getStatusVariant = (
  status: string,
): "success" | "failure" | "process" => {
  switch (status.toLowerCase()) {
    case "active":
      return "success";
    case "deleted":
      return "failure";
    case "suspended":
      return "process";
    default:
      return "success";
  }
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface ViewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onLoadUser: (id: string) => Promise<User>;
}

export const ViewUserModal = ({
  isOpen,
  onClose,
  userId,
  onLoadUser,
}: ViewUserModalProps): ReactElement | null => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      const loadUser = async (): Promise<void> => {
        try {
          setIsLoading(true);
          setError(null);
          const data = await onLoadUser(userId);
          setUser(data);
        } catch (err: any) {
          setError(
            err?.response?.data?.error?.message ||
              "Failed to load user details",
          );
        } finally {
          setIsLoading(false);
        }
      };
      loadUser();
    } else {
      setUser(null);
      setError(null);
    }
  }, [isOpen, userId, onLoadUser]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="View User Details"
      description="View user information"
      maxWidth="lg"
      footer={
        <SecondaryButton
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-sm"
        >
          Close
        </SecondaryButton>
      }
    >
      <div>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#112868] animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md">
            <p className="text-sm text-[#ef4444]">{error}</p>
          </div>
        )}

        {!isLoading && !error && user && (
          <div className="flex flex-col gap-6">
            {/* Basic Information */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">
                    Email
                  </label>
                  <p className="text-sm text-[#0e1b2a]">{user.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">
                    Full Name
                  </label>
                  <p className="text-sm text-[#0e1b2a]">
                    {user.first_name} {user.last_name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">
                    Status
                  </label>
                  <div className="mt-1">
                    <StatusBadge variant={getStatusVariant(user.status)}>
                      {user.status}
                    </StatusBadge>
                  </div>
                </div>
                {user.status === "suspended" && user.preferences?.security?.suspended_reason && (
                  <div className="md:col-span-2 p-3 bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.2)] rounded-lg">
                    <label className="text-xs font-medium text-[#ef4444] mb-1 block">
                      Suspension Reason
                    </label>
                    <p className="text-sm text-[#0e1b2a] font-medium">
                      {user.preferences.security.suspended_reason}
                    </p>
                    {user.preferences.security.suspended_at && (
                      <p className="text-xs text-[#6b7280] mt-1">
                        Suspended on: {formatDate(user.preferences.security.suspended_at)}
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">
                    Roles
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {user.role_module_combinations && user.role_module_combinations.length > 0 ? (
                      user.role_module_combinations.map((combo, idx) => (
                        <span
                          key={`${combo.role_id}-${combo.module_id || 'global'}-${idx}`}
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#112868]/10 text-[#112868]"
                          title={combo.module_name ? `Role for ${combo.module_name}` : "Global Role"}
                        >
                          {combo.role_name} {combo.module_name && `(${combo.module_name})`}
                        </span>
                      ))
                    ) : user.roles && user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <span
                          key={role.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#112868]/10 text-[#112868]"
                        >
                          {role.name}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-[#0e1b2a]">
                        {user.role?.name || "-"}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">
                    Department
                  </label>
                  <p className="text-sm text-[#0e1b2a]">
                    {user.department?.name || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">
                    Designation
                  </label>
                  <p className="text-sm text-[#0e1b2a]">
                    {user.designation?.name || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">
                    Auth Provider
                  </label>
                  <p className="text-sm text-[#0e1b2a]">{user.auth_provider}</p>
                </div>
                {user.tenant?.name && (
                  <div>
                    <label className="text-xs font-medium text-[#6b7280] mb-1 block">
                      Tenant
                    </label>
                    <p className="text-sm text-[#0e1b2a]">{user.tenant.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">
                Timestamps
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">
                    Created At
                  </label>
                  <p className="text-sm text-[#0e1b2a]">
                    {formatDate(user.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">
                    Updated At
                  </label>
                  <p className="text-sm text-[#0e1b2a]">
                    {formatDate(user.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
