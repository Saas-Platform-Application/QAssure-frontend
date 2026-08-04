import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  FileText,
  Settings,
  HelpCircle,
  X,
  Shield,
  BadgeCheck,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Bell,
  Paperclip,
  Bot,
  ShieldCheck,
  Lock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppSelector } from "@/hooks/redux-hooks";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useEnabledServices } from "@/hooks/useEnabledServices";
import { AuthenticatedImage } from "@/components/shared";

interface MenuItem {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  path?: string;
  isGroup?: boolean;
  serviceKey?: string;
  children?: Array<{
    label: string;
    path: string;
    serviceKey?: string;
    requiredPermission?: {
      resource: string;
      action?: string;
    };
  }>;
  requiredPermission?: {
    resource: string;
    action?: string; // If not provided, checks for '*' or 'read'
  };
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Super Admin menu items
const superAdminPlatformMenu: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  {
    icon: Building2,
    label: "Tenants",
    path: "/tenants",
    requiredPermission: { resource: "tenants", action: "read" },
  },
  // Platform Users & Roles — no requiredPermission: super_admin always sees it;
  // platform users do NOT see it (cannot manage other platform users)
  {
    icon: Users,
    label: "Platform Users",
    isGroup: true,
    children: [
      { label: "Users",               path: "/platform-users" },
      { label: "Roles & Permissions", path: "/platform-roles" },
    ],
  },
  {
    icon: ShieldCheck,
    label: "Tenant Admin Role",
    path: "/tenant-admin-role",
  },
  {
    icon: Package,
    label: "Modules",
    path: "/modules",
    requiredPermission: { resource: "modules", action: "read" },
  },
];

const superAdminSystemMenu: MenuItem[] = [
  {
    icon: Bell,
    label: "Notifications",
    isGroup: true,
    children: [
      { label: "Notifications List", path: "/notifications" },
      { label: "Master Management",  path: "/notification-master" },
      { label: "Global Templates",   path: "/notification-templates" },
    ],
    requiredPermission: { resource: "notifications", action: "read" },
  },
  {
    icon: FileText,
    label: "Audit Logs",
    path: "/audit-logs",
    requiredPermission: { resource: "audit_logs", action: "read" },
  },
  {
    icon: Shield,
    label: "Audit Resources",
    path: "/audit-resource-types",
    requiredPermission: { resource: "audit_resources", action: "read" },
  },
  {
    icon: Settings,
    label: "Settings",
    isGroup: true,
    children: [
      { label: "SMTP Config",           path: "/settings/smtp" },
      { label: "Failed Emails",         path: "/settings/failed-emails" },
      { label: "AI Fallback Monitoring",path: "/settings/ai-fallbacks" },
      { label: "Storage Buckets",       path: "/settings/storage-buckets" },
    ],
    requiredPermission: { resource: "settings", action: "read" },
  },
];

// Tenant Admin menu items
const tenantAdminPlatformMenu: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/tenant" },
  {
    icon: Shield,
    label: "Roles",
    path: "/tenant/roles",
    requiredPermission: { resource: "roles" },
  },
  {
    icon: Building2,
    label: "Departments",
    path: "/tenant/departments",
    requiredPermission: { resource: "departments" },
  },
  {
    icon: BadgeCheck,
    label: "Designations",
    path: "/tenant/designations",
    requiredPermission: { resource: "designations" },
  },
  {
    icon: Users,
    label: "Suppliers",
    path: "/tenant/suppliers",
    serviceKey: "supplier",
    requiredPermission: { resource: "supplier" },
  },
  {
    icon: Users,
    label: "Users",
    path: "/tenant/users",
    requiredPermission: { resource: "users" },
  },
];

const tenantAdminPlatformServiceMenu: MenuItem[] = [
  {
    icon: Paperclip,
    label: "File Attachments",
    isGroup: true,
    serviceKey: "file_attachment",
    children: [
      {
        label: "Files List",
        path: "/tenant/files",
        serviceKey: "file_attachment",
        requiredPermission: { resource: "files" },
      },
      {
        label: "Storage Dashboard",
        path: "/tenant/files/storage-dashboard",
        serviceKey: "file_attachment",
        requiredPermission: { resource: "files" },
      },
    ],
    requiredPermission: { resource: "files" },
  },
  {
    icon: GitBranch,
    label: "Workflows",
    isGroup: true,
    serviceKey: "workflow",
    children: [
      {
        label: "Definitions",
        path: "/tenant/workflows/definitions",
        serviceKey: "workflow",
        requiredPermission: { resource: "workflow" },
      },
      {
        label: "Tasks",
        path: "/tenant/workflows/tasks",
        serviceKey: "workflow",
        requiredPermission: { resource: "workflow" },
      },
    ],
    requiredPermission: { resource: "workflow" },
  },
  {
    icon: FileText,
    label: "Documents",
    isGroup: true,
    serviceKey: "document",
    children: [
      {
        label: "Document Lists",
        path: "/tenant/documents",
        serviceKey: "document",
        requiredPermission: { resource: "document" },
      },
      {
        label: "Create Document",
        path: "/tenant/documents/create",
        serviceKey: "document",
        requiredPermission: { resource: "document", action: "create" },
      },
      {
        label: "Categories",
        path: "/tenant/documents/categories",
        serviceKey: "document",
        requiredPermission: { resource: "document" },
      },
      {
        label: "Due for Review",
        path: "/tenant/documents/due-for-review",
        serviceKey: "document",
        requiredPermission: { resource: "document" },
      },
    ],
    requiredPermission: { resource: "document" },
  },
  {
    icon: Bot,
    label: "AI Services",
    isGroup: true,
    serviceKey: "ai",
    children: [
      {
        label: "Completion History",
        path: "/tenant/ai/completions",
        serviceKey: "ai",
        requiredPermission: { resource: "ai" },
      },
      {
        label: "Prompt Management",
        path: "/tenant/ai/prompts",
        serviceKey: "ai",
        requiredPermission: { resource: "ai" },
      },
      {
        label: "Tenant AI Providers",
        path: "/tenant/ai/providers",
        serviceKey: "ai",
        requiredPermission: { resource: "ai" },
      },
      {
        label: "AI Usage & Cost Dashboard",
        path: "/tenant/ai/dashboard",
        serviceKey: "ai",
        requiredPermission: { resource: "ai" },
      },
    ],
    requiredPermission: { resource: "ai" },
  },
  { icon: Package, label: "Modules", path: "/tenant/modules" },
];

const tenantAdminSystemMenu: MenuItem[] = [
  {
    icon: Bell,
    label: "Notifications",
    path: "/tenant/notifications",
    requiredPermission: { resource: "notifications" },
  },
  {
    icon: FileText,
    label: "Audit Logs",
    path: "/tenant/audit-logs",
  },
  {
    icon: ShieldCheck,
    label: "E-Signatures",
    path: "/tenant/electronic-signatures",
    serviceKey: "electronic_signature",
  },
  {
    icon: Settings,
    label: "Settings",
    isGroup: true,
    children: [
      {
        label: "General Settings",
        path: "/tenant/settings",
      },
      {
        label: "Security Policy",
        path: "/tenant/settings/security-policy",
        serviceKey: "security",
      },
      {
        label: "Notification Settings",
        path: "/tenant/settings/notifications",
      },
      {
        label: "Notification Templates",
        path: "/tenant/settings/notification-templates",
      },
      {
        label: "SMTP Settings",
        path: "/tenant/settings/smtp",
      },
      {
        label: "Failed Emails",
        path: "/tenant/settings/failed-emails",
      },
      {
        label: "Storage Config",
        path: "/tenant/settings/storage",
        serviceKey: "storage",
      },
    ],
    requiredPermission: { resource: "tenants" },
  },
];

const GroupMenuItem = ({
  item,
  childrenItems,
  location,
  primaryColor,
  secondaryColor,
  onClose,
}: {
  item: MenuItem;
  childrenItems: any[];
  location: any;
  primaryColor: string;
  secondaryColor: string;
  onClose: () => void;
}) => {
  const isChildActive = (path: string) => {
    // Basic exact match check
    if (location.pathname === path) return true;

    // Special handling for paths that are prefixes of other siblings
    // Example: /tenant/settings is a prefix of /tenant/settings/notifications
    if (location.pathname.startsWith(`${path}/`)) {
      // If there's another sibling that is a more specific match for the current path,
      // then this prefix path should not be considered "active"
      const hasMoreSpecificSibling = childrenItems.some(
        (sibling) =>
          sibling.path !== path &&
          sibling.path.startsWith(path) &&
          (location.pathname === sibling.path ||
            location.pathname.startsWith(`${sibling.path}/`)),
      );

      if (hasMoreSpecificSibling) return false;

      // Also keep existing special cases if they don't fit the generic rule above
      // (Though the generic rule above should cover most of these)

      // Special handling for Document Lists to NOT show as active when sub-actions are active
      if (path === "/tenant/documents") {
        const subActions = [
          "/create",
          "/categories",
          "/due-for-review",
          "/edit",
        ];
        const isSubActionActive = subActions.some((sub) =>
          location.pathname.startsWith(path + sub),
        );
        if (isSubActionActive) return false;
      }

      // Special handling for Files List to NOT show as active when Storage Dashboard is active
      if (path === "/tenant/files") {
        if (location.pathname.startsWith("/tenant/files/storage-dashboard")) {
          return false;
        }
      }

      return true;
    }

    return false;
  };
  const isAnyChildActive = childrenItems.some((child) =>
    isChildActive(child.path),
  );
  const [isExpanded, setIsExpanded] = useState(isAnyChildActive);

  useEffect(() => {
    if (isAnyChildActive) setIsExpanded(true);
  }, [isAnyChildActive]);

  const Icon = item.icon;
  const { isServiceEnabled } = useEnabledServices();
  const isLocked = item.serviceKey ? !isServiceEnabled(item.serviceKey) : false;

  return (
    <div className="flex flex-col">
      <button
        onClick={isLocked ? undefined : () => setIsExpanded(!isExpanded)}
        title={isLocked ? "This service has been disabled by the Super Admin" : undefined}
        className={cn(
          "flex items-center justify-between gap-2.5 px-3 py-2 rounded-md transition-all min-h-[44px]",
          isLocked
            ? "text-gray-400 cursor-not-allowed opacity-60 bg-white"
            : isAnyChildActive
              ? "shadow-[0px_2px_8px_0px_rgba(15,23,42,0.15)]"
              : "text-[#0f1724] hover:bg-gray-50",
        )}
        style={
          !isLocked && isAnyChildActive
            ? {
                backgroundColor: primaryColor,
                color: secondaryColor,
              }
            : undefined
        }
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 shrink-0" />
          <span
            className="text-xs md:text-xs lg:text-[13px] font-medium truncate"
            title={item.label}
          >
            {item.label}
          </span>
        </div>
        {isLocked ? (
          <Lock className="w-3.5 h-3.5 text-gray-400" />
        ) : isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {isExpanded && !isLocked && (
        <div className="flex flex-col mt-1 mb-1 border-l-2 border-[rgba(0,0,0,0.08)] ml-5 py-1 gap-0.5">
          {childrenItems.map((child) => {
            const isChildLocked = child.serviceKey ? !isServiceEnabled(child.serviceKey) : false;
            const isActive = !isChildLocked && isChildActive(child.path);

            if (isChildLocked) {
              return (
                <div
                  key={child.path}
                  title="This service has been disabled by the Super Admin"
                  className="flex items-center justify-between px-4 py-2 rounded-r-md text-[13px] font-medium text-gray-400 cursor-not-allowed opacity-60 bg-white"
                >
                  <span className="truncate mr-2" title={child.label}>
                    {child.label}
                  </span>
                  <Lock className="w-3 h-3 text-gray-400 shrink-0" />
                </div>
              );
            }

            return (
              <Link
                key={child.path}
                to={child.path}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    onClose();
                  }
                }}
                className={cn(
                  "flex items-center px-4 py-2 rounded-r-md text-[13px] font-medium transition-all",
                  isActive
                    ? "text-[#112868] font-bold bg-gray-50"
                    : "text-[#475569] hover:text-[#0f1724] hover:bg-gray-50",
                )}
                style={
                  isActive
                    ? {
                        color: primaryColor,
                      }
                    : undefined
                }
              >
                <span className="truncate" title={child.label}>
                  {child.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { primaryColor, secondaryColor, accentColor, logoUrl } = useAppTheme();
  const location = useLocation();
  const { roles, permissions, tenantId } = useAppSelector((state) => state.auth);

  // Fetch theme for tenant admin
  const isSuperAdminCheck = () => {
    let rolesArray: string[] = [];
    if (Array.isArray(roles)) {
      rolesArray = roles;
    } else if (typeof roles === "string") {
      try {
        rolesArray = JSON.parse(roles);
      } catch {
        rolesArray = [];
      }
    }
    return rolesArray.includes("super_admin");
  };

  const isSuperAdmin = isSuperAdminCheck();

  /**
   * Is this user a platform user (non-super-admin with a platform-scoped role)?
   * Platform users see a filtered super-admin sidebar — only the tabs they have
   * permission for. The sidebar check re-uses the existing hasPermission() +
   * filterMenuItems() logic that already works for tenant users.
   */
  const isPlatformUser = !isSuperAdmin && (
    tenantId === "00000000-0000-0000-0000-000000000001" ||
    (!tenantId && (() => {
      let rolesArray: string[] = [];
      if (Array.isArray(roles)) {
        rolesArray = roles;
      } else if (typeof roles === "string") {
        try { rolesArray = JSON.parse(roles); } catch { rolesArray = []; }
      }
      // A platform user is NOT super_admin and NOT a tenant_admin / viewer / etc.
      // The server already embeds platform-scoped roles in the JWT.
      // We detect it by: the user has no tenantId but has roles (or has any role
      // that is not one of the known tenant roles). Simplest: if not super_admin
      // and the user ended up on the super-admin layout, treat them as platform user.
      const knownTenantRoles = ["tenant_admin", "quality_manager", "viewer"];
      return rolesArray.some(r => !knownTenantRoles.includes(r) && r !== "super_admin");
    })())
  );

  // Get role name for display
  const getRoleName = (): string => {
    if (isSuperAdmin) {
      return "Super Admin";
    }
    if (isPlatformUser) {
      // Format the platform role name nicely
      let rolesArray: string[] = [];
      if (Array.isArray(roles)) rolesArray = roles;
      else if (typeof roles === "string") {
        try { rolesArray = JSON.parse(roles); } catch { rolesArray = []; }
      }
      if (rolesArray.length > 0) {
        return rolesArray[0]
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      }
    }
    let rolesArray: string[] = [];
    if (Array.isArray(roles)) {
      rolesArray = roles;
    } else if (typeof roles === "string") {
      try {
        rolesArray = JSON.parse(roles);
      } catch {
        rolesArray = [];
      }
    }
    // Get the first role and format it
    if (rolesArray.length > 0) {
      const role = rolesArray[0];
      // Convert snake_case to Title Case
      return role
        .split("_")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" ");
    }
    return "User";
  };

  const roleName = getRoleName();

  // Fetch theme if tenant admin
  // if (!isSuperAdmin) {
  //   useTenantTheme();
  // }

  // Helper function to check if user has permission for a resource
  const hasPermission = (
    resource: string,
    requiredAction?: string,
  ): boolean => {
    if (isSuperAdmin) {
      return true; // Super admin has all permissions
    }

    const allowedActions = requiredAction ? [requiredAction] : ["*", "read"];

    return permissions.some((perm) => {
      // Check if resource matches (exact match or wildcard)
      const resourceMatches =
        perm.resource === resource || perm.resource === "*";

      // Check if action matches (exact match or wildcard)
      const actionMatches = allowedActions.some(
        (allowedAction) => perm.action === allowedAction || perm.action === "*",
      );

      return resourceMatches && actionMatches;
    });
  };

  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    if (isSuperAdmin) {
      return items;
    }

    return items.filter((item) => {
      if (!item.requiredPermission) {
        return true;
      }

      const hasParentPermission = hasPermission(
        item.requiredPermission.resource,
        item.requiredPermission.action,
      );

      if (!hasParentPermission) return false;

      if (item.isGroup && item.children) {
        // Deep copy children to avoid mutating original menu arrays
        const filteredChildren = item.children.filter((child) => {
          if (!child.requiredPermission) return true;
          return hasPermission(
            child.requiredPermission.resource,
            child.requiredPermission.action,
          );
        });

        // We need to return a new object to avoid issues
        if (filteredChildren.length > 0) {
          (item as any)._filteredChildren = filteredChildren;
          return true;
        }
        return false;
      }

      return true;
    });
  };

  // Select and filter menu items based on role and permissions
  // Platform users reuse the super-admin menu arrays but filterMenuItems() hides
  // tabs they don't have permission for (same as tenant sidebar logic).
  const platformMenu = filterMenuItems(
    isSuperAdmin || isPlatformUser ? superAdminPlatformMenu : tenantAdminPlatformMenu,
  );
  const platformServiceMenu = filterMenuItems(
    isSuperAdmin || isPlatformUser ? [] : tenantAdminPlatformServiceMenu,
  );
  const systemMenu = filterMenuItems(
    isSuperAdmin || isPlatformUser ? superAdminSystemMenu : tenantAdminSystemMenu,
  );

  const MenuSection = ({
    title,
    items,
  }: {
    title: string;
    items: MenuItem[];
  }) => {
    const { isServiceEnabled } = useEnabledServices();

    return (
      <div className="w-full">
        <div className="flex flex-col gap-1">
          <div className="pb-1 px-2 md:px-2 lg:px-3">
            <div className="text-[10px] md:text-[10px] lg:text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.88px]">
              {title}
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {items.map((item) => {
              if (item.isGroup) {
                const children =
                  (item as any)._filteredChildren || item.children || [];
                return (
                  <GroupMenuItem
                    key={item.label}
                    item={item}
                    childrenItems={children}
                    location={location}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    onClose={onClose}
                  />
                );
              }

              const Icon = item.icon;
              const isLocked = item.serviceKey ? !isServiceEnabled(item.serviceKey) : false;
              const isTenantDashboardPath = item.path === "/tenant";
              const isActive = !isLocked && (isTenantDashboardPath
                ? location.pathname === "/tenant"
                : item.path &&
                  (location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`)));

              if (isLocked) {
                return (
                  <div
                    key={item.path}
                    title="This service has been disabled by the Super Admin"
                    className="flex items-center gap-2 md:gap-2 lg:gap-2.5 px-2 md:px-2 lg:px-3 py-2 rounded-md transition-colors min-h-[44px] text-gray-400 cursor-not-allowed opacity-60 bg-white justify-between"
                  >
                    <div className="flex items-center gap-2 md:gap-2 lg:gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span
                        className="text-xs md:text-xs lg:text-[13px] font-medium truncate"
                        title={item.label}
                      >
                        {item.label}
                      </span>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path || "#"}
                  onClick={() => {
                    // Close sidebar on mobile when navigating
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 md:gap-2 lg:gap-2.5 px-2 md:px-2 lg:px-3 py-2 rounded-md transition-colors min-h-[44px]",
                    isActive
                      ? "shadow-[0px_2px_8px_0px_rgba(15,23,42,0.15)]"
                      : "text-[#0f1724] hover:bg-gray-50",
                  )}
                  style={
                    isActive
                      ? {
                          backgroundColor: primaryColor,
                          color: secondaryColor,
                        }
                      : undefined
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span
                    className="text-xs md:text-xs lg:text-[13px] font-medium truncate"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-white border-r border-[rgba(0,0,0,0.08)] z-50 flex flex-col gap-6 p-4 transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ width: "280px" }}
      >
        {/* Mobile Header with Close Button */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-3 items-center">
            {!isSuperAdmin && logoUrl ? (
              <AuthenticatedImage
                src={logoUrl}
                alt="Logo"
                className="h-9 w-auto max-w-[180px] object-contain"
              />
            ) : null}
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shadow-[0px_4px_12px_0px_rgba(15,23,42,0.1)] shrink-0"
              style={{
                display: !isSuperAdmin && logoUrl ? "none" : "flex",
                backgroundColor: primaryColor,
              }}
            >
              <Shield className="w-6 h-6 text-white" strokeWidth={1.67} />
            </div>
            <div className="flex flex-col">
              <div className="text-[18px] font-bold text-[#0f1724] tracking-[-0.36px]">
                {!isSuperAdmin && logoUrl ? "" : "QAssure"}
              </div>
              {!isSuperAdmin && logoUrl ? null : (
                <div
                  className="text-[12px] font-semibold capitalize mt-[7px] -translate-y-1/2"
                  style={{
                    color: accentColor,
                  }}
                >
                  {roleName}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-[#0f1724]" />
          </button>
        </div>

        {/* Menu Sections (Only this part should scroll) */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6 custom-scrollbar">
          {/* Platform Menu */}
          <MenuSection title="Platform" items={platformMenu} />
          <MenuSection title="Platform Services" items={platformServiceMenu} />

          {/* System Menu */}
          <MenuSection title="System" items={systemMenu} />
        </div>

        {/* Support Center */}
        <div className="mt-auto">
          <button className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-md px-[13px] py-[9px] flex gap-2.5 items-center hover:bg-gray-50 transition-colors min-h-[44px]">
            <HelpCircle className="w-4 h-4 shrink-0 text-[#0f1724]" />
            <span className="text-[13px] font-medium text-[#0f1724]">
              Support Center
            </span>
          </button>
        </div>

        {/* Powered by LTTS */}
        <div className="w-full flex flex-col items-center justify-center gap-0 px-2">
          <p className="text-[10px] font-medium text-[#9ca3af] capitalize leading-normal">
            Powered by
          </p>
          <img
            src="/LTTS.svg"
            alt="L&T Technology Services"
            className="h-6 w-auto max-w-[150px] object-contain"
          />
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-2 md:p-2.5 lg:p-3 xl:p-[17px] w-[160px] md:w-[160px] lg:w-[180px] xl:w-[240px] h-full max-h-screen flex-col gap-3 md:gap-3.5 lg:gap-4 xl:gap-6 shrink-0 overflow-hidden">
        {/* Logo */}
        <div className="w-full md:w-[140px] lg:w-[160px] xl:w-[206px] shrink-0">
          <div className="flex gap-3 items-center px-2">
            {!isSuperAdmin && logoUrl ? (
              <AuthenticatedImage
                src={logoUrl}
                alt="Logo"
                className="h-9 w-auto max-w-[180px] object-contain"
                fallback={
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shadow-[0px_4px_12px_0px_rgba(15,23,42,0.1)] shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Shield className="w-6 h-6 text-white" strokeWidth={1.67} />
                  </div>
                }
              />
            ) : null}
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shadow-[0px_4px_12px_0px_rgba(15,23,42,0.1)] shrink-0"
              style={{
                display: !isSuperAdmin && logoUrl ? "none" : "flex",
                backgroundColor: primaryColor,
              }}
            >
              <Shield className="w-6 h-6 text-white" strokeWidth={1.67} />
            </div>
            <div className="flex flex-col">
              <div className="text-base md:text-base lg:text-base xl:text-[18px] font-bold text-[#0f1724] tracking-[-0.36px]">
                {!isSuperAdmin && logoUrl ? "" : "QAssure"}
              </div>
              {!isSuperAdmin && logoUrl ? null : (
                <div
                  className="text-[12px] font-semibold capitalize mt-[7px] -translate-y-1/2"
                  style={{
                    color: accentColor,
                  }}
                >
                  {roleName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu Sections (Only this part should scroll) */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3.5 md:gap-3.5 lg:gap-4 xl:gap-6 custom-scrollbar">
          {/* Platform Menu */}
          {platformMenu.length > 0 && (
            <MenuSection title="Platform" items={platformMenu} />
          )}
          {platformServiceMenu.length > 0 && (
            <MenuSection
              title="Platform Services"
              items={platformServiceMenu}
            />
          )}

          {/* System Menu */}
          {systemMenu.length > 0 && (
            <MenuSection title="System" items={systemMenu} />
          )}
        </div>

        {/* Support Center */}
        <div className="mt-auto w-full">
          <button className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-md px-2 md:px-2.5 lg:px-[13px] py-[9px] flex gap-2 md:gap-2 lg:gap-2.5 items-center hover:bg-gray-50 transition-colors">
            <HelpCircle className="w-4 h-4 shrink-0 text-[#0f1724]" />
            <span className="text-xs md:text-xs lg:text-[13px] font-medium text-[#0f1724]">
              Support Center
            </span>
          </button>
        </div>

        {/* Powered by LTTS */}
        <div className="w-full flex flex-col items-center justify-center gap-0 px-2">
          <p className="text-[10px] font-medium text-[#9ca3af] capitalize leading-normal">
            Powered by
          </p>
          <img
            src="/LTTS.svg"
            alt="L&T Technology Services"
            className="h-6 w-auto max-w-[150px] object-contain"
          />
        </div>
      </aside>
    </>
  );
};
