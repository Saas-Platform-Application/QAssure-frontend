import { useNavigate } from "react-router-dom";
import {
  Plus,
  UserPlus,
  Shield,
  Settings,
  Building2,
  BadgeCheck,
  AppWindow,
} from "lucide-react";
import { useAppSelector } from "@/hooks/redux-hooks";
import type { QuickAction } from "@/types/dashboard";
// import { useAppTheme } from "@/hooks/useAppTheme";

export const QuickActions = () => {
  // const { primaryColor } = useAppTheme();
  const navigate = useNavigate();
  const { roles, permissions } = useAppSelector((state) => state.auth);

  // Helper to check permission
  const hasPermission = (resource: string, action: string) => {
    if (roles.includes("super_admin") || roles.includes("tenant_admin"))
      return true;
    return permissions.some(
      (p) => p.resource === resource && p.action === action,
    );
  };

  const isSuperAdmin = roles.includes("super_admin");

  // Define actions based on role
  const superAdminActions: QuickAction[] = [
    {
      icon: Plus,
      label: "New Tenant",
      btncolor: "#4C89FA",
      onClick: () => navigate("/tenants/create-wizard"),
    },
    { icon: AppWindow, label: "Module", btncolor: "#16C784", onClick: () => navigate("/modules") },
    {
      icon: Shield,
      label: "Notification",
      btncolor: "#FCA004",
      onClick: () => navigate("/notifications"),
    },
    {
      icon: Settings,
      label: "Audit Logs",
      btncolor: "#6B7280",
      onClick: () => navigate("/audit-logs"),
    },
  ];

  const tenantAdminActions: QuickAction[] = [
    hasPermission("users", "create") && {
      icon: UserPlus,
      label: "New User",
      btncolor: "#4C89FA",
      onClick: () => navigate("/tenant/users", { state: { openCreateModal: true } }),
    },
    hasPermission("roles", "create") && {
      icon: Shield,
      label: "New Role",
      btncolor: "#16C784",
      onClick: () => navigate("/tenant/roles", { state: { openCreateModal: true } }),
    },
    hasPermission("departments", "create") && {
      icon: Building2,
      label: "New Dept",
      btncolor: "#FCA004",
      onClick: () => navigate("/tenant/departments", { state: { openCreateModal: true } }),
    },
    hasPermission("designations", "create") && {
      icon: BadgeCheck,
      label: "New Desig",
      btncolor: "#6B7280",
      onClick: () => navigate("/tenant/designations", { state: { openCreateModal: true } }),
    },
  ].filter(Boolean) as QuickAction[];

  const actions = isSuperAdmin ? superAdminActions : tenantAdminActions;

  return (
    <div className="flex flex-col items-start self-stretch rounded-[8px] border border-[#D1D5DB] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex w-full h-[48px] px-[20px] py-[16px] items-center border-b border-[#D1D5DB]">
        <h2 className="text-[16px] font-semibold text-[#111827] leading-none">
          Quick Actions
        </h2>
      </div>

      {/* Actions Grid */}
      <div className="inline-grid grid-cols-2 gap-[10px] p-[16px] w-full">
        {actions.map((action, index) => {
          const Icon = action.icon;

          return (
            <button
              key={index}
              onClick={action.onClick}
              className="
            flex flex-col justify-center items-center
            w-full min-h-[100px]
            p-[16px]
            gap-[8px]
            rounded-[6px]
            border border-dashed border-[#D1D5DB]
            bg-white
            transition-all duration-200
            hover:bg-[#F9FAFB]
            hover:border-[#9CA3AF]
          "
            >
              {/* Icon */}
              <div className="flex items-center justify-center">
                <Icon
                  className="w-[20px] h-[20px]"
                  color={action.btncolor}
                  strokeWidth={2}
                />
              </div>

              {/* Label */}
              <span className="text-[14px] font-medium text-[#111827] text-center leading-[20px]">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
