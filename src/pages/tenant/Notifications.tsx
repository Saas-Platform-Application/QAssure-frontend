import { useState, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux-hooks";
import {
  fetchNotifications,
  markReadAsync,
  readAllAsync,
} from "@/store/notificationSlice";
import {
  Bell,
  // Search,
  Check,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Clipboard,
  FileText,
  GraduationCap,
  GitGraph,
  Building2,
  // ExternalLink,
  Clock,
} from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type {
  Notification,
  NotificationType,
  NotificationCategory,
} from "@/types/notification";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { notificationService } from "@/services/notification-service";
import { moduleService } from "@/services/module-service";
import { showToast } from "@/utils/toast";

const getNotificationIcon = (
  category?: NotificationCategory,
  type?: NotificationType,
) => {
  switch (category) {
    case "capa":
      return <Clipboard className="w-5 h-5" />;
    case "document":
      return <FileText className="w-5 h-5" />;
    case "training":
      return <GraduationCap className="w-5 h-5" />;
    case "workflow":
      return <GitGraph className="w-5 h-5" />;
    case "supplier":
      return <Building2 className="w-5 h-5" />;
    case "system":
      return <Bell className="w-5 h-5" />;
    default:
      switch (type) {
        case "success":
          return <CheckCircle2 className="w-5 h-5" />;
        case "warning":
          return <AlertTriangle className="w-5 h-5" />;
        case "action_required":
          return <AlertCircle className="w-5 h-5" />;
        default:
          return <Info className="w-5 h-5" />;
      }
  }
};

const getTypeColors = (type: NotificationType) => {
  switch (type) {
    case "success":
      return "bg-green-100 text-green-600 border-green-200";
    case "warning":
      return "bg-orange-100 text-orange-600 border-orange-200";
    case "action_required":
      return "bg-amber-100 text-amber-600 border-amber-200";
    case "escalation":
      return "bg-red-100 text-red-600 border-red-200";
    default:
      return "bg-blue-100 text-blue-600 border-blue-200";
  }
};

type FilterType = "all" | "unread" | "tasks" | "mentions" | "system";

export const Notifications = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { notifications, unread_count, isLoading } = useAppSelector(
    (state) => state.notifications,
  );
  const { roles, tenantId } = useAppSelector((state) => state.auth);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    dispatch(fetchNotifications({ limit: 100 }));
  }, [dispatch]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Filter by tab
      if (activeFilter === "unread" && n.is_read) return false;
      if (
        activeFilter === "tasks" &&
        !["workflow", "training", "capa"].includes(n.category || "")
      )
        return false;
      if (
        activeFilter === "mentions" &&
        n.notification_type !== "action_required"
      )
        return false; // Approximation
      if (activeFilter === "system" && n.category !== "system") return false;

      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  const counts = useMemo(
    () => ({
      all: notifications.length,
      unread: unread_count,
      tasks: notifications.filter((n) =>
        ["workflow", "training", "capa"].includes(n.category || ""),
      ).length,
      mentions: notifications.filter(
        (n) => n.notification_type === "action_required",
      ).length,
      system: notifications.filter((n) => n.category === "system").length,
    }),
    [notifications, unread_count],
  );

  const handleMarkRead = (id: string) => {
    dispatch(markReadAsync(id));
  };

  const handleReadAll = () => {
    dispatch(readAllAsync());
  };

  const handleDismiss = async (id: string) => {
    try {
      await notificationService.dismiss(id);
      dispatch(fetchNotifications({ limit: 100 }));
      showToast.success("Notification dismissed");
    } catch (error) {
      showToast.error("Failed to dismiss notification");
    }
  };

  const handleLaunchModule = async (moduleId: string): Promise<void> => {
    try {
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
      const isSuperAdmin = rolesArray.includes("super_admin");
      const launchTenantId = isSuperAdmin ? tenantId : null;

      const response = await moduleService.launch(moduleId, launchTenantId);
      if (response.success && response.data?.launch_url) {
        window.open(response.data.launch_url, "_blank", "noopener,noreferrer");
      } else {
        showToast.error("Failed to retrieve launch URL");
      }
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message || "Failed to launch module",
      );
    }
  };

  const handleAction = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }

    // Special handling for tasks as requested - redirect to My Tasks tab
    if (["workflow_task"].includes(notification.entity_type || "")) {
      navigate("/tenant/workflows/tasks");
      return;
    }

    // Special handling for system as requested - redirect to Dashboard
    // if (["system"].includes(notification.category || "")) {
    //   navigate("/tenant");
    //   return;
    // }

    if (notification.action_url) {
      const match = notification.action_url.match(
        /^\/?modules\/([a-fA-F0-9-]+)\/launch\/?$/,
      );
      if (match) {
        const moduleId = match[1];
        handleLaunchModule(moduleId);
        return;
      }

      const targetUrl = notification.action_url.startsWith("/tenant")
        ? notification.action_url
        : `/tenant${notification.action_url.startsWith("/") ? "" : "/"}${notification.action_url}`;
      navigate(targetUrl);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true });
    if (isYesterday(d)) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Layout
      currentPage="Notifications"
      breadcrumbs={[
        { label: "Home", path: "/tenant" },
        { label: "Notifications" },
      ]}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Notifications
          </h1>
          <p className="text-gray-500 mt-1.5 flex items-center gap-2">
            Stay on top of mentions, tasks, and system updates in one place.
          </p>
        </div>

        {/* Filters and Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(
              ["all", "unread", "tasks", "mentions", "system"] as FilterType[]
            ).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                  activeFilter === filter
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                <span className="capitalize">{filter}</span>
                {counts[filter] > 0 && (
                  <span
                    className={cn(
                      "flex items-center justify-center w-5 h-5 text-[10px] rounded-full",
                      activeFilter === filter
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {counts[filter]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pb-2 md:pb-0">
            {/* <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search notifications..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all w-full md:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div> */}
            {unread_count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReadAll}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-20 text-center text-gray-400">
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-blue-200" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                No notifications found
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                {activeFilter === "unread"
                  ? "You have caught up with all your notifications!"
                  : "We couldn't find any notifications matching your current filters."}
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setActiveFilter("all");
                  setSearchQuery("");
                }}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative bg-white border rounded-lg p-3 flex transition-all duration-200 hover:shadow-sm",
                    !notification.is_read
                      ? "border-gray-300"
                      : "border-gray-200",
                  )}
                >
                  {!notification.is_read && (
                    <div className="absolute left-[-4px] top-7 w-2 h-2 rounded-full bg-blue-500" />
                  )}

                  <div className="flex w-full gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border",
                        getTypeColors(notification.notification_type),
                      )}
                    >
                      {getNotificationIcon(
                        notification.category,
                        notification.notification_type,
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <h4
                            className={cn(
                              "text-sm md:text-base font-semibold text-gray-900 truncate",
                              !notification.is_read && "text-blue-900",
                            )}
                          >
                            {notification.title}
                          </h4>
                          {notification.priority === "urgent" && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase tracking-wider">
                              Urgent
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
                        {notification.message}
                      </p>

                      {notification.entity_name && (
                        <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-gray-400">
                          <span className="px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500">
                            {notification.entity_type?.replace(/_/g, " ")}
                          </span>
                          <span className="px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notification.entity_name}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <PrimaryButton
                            size="small"
                            onClick={() => handleAction(notification)}
                          >
                            {/* <ExternalLink className="w-3.5 h-3.5 mr-2" /> */}
                            {notification.category === "training"
                              ? "View Assignment"
                              : notification.category === "capa"
                                ? "View CAPA"
                                : notification.category === "workflow"
                                  ? "View Task"
                                  : "View Details"}
                          </PrimaryButton>
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkRead(notification.id)}
                              className="text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors flex items-center"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Mark as read
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleDismiss(notification.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;
