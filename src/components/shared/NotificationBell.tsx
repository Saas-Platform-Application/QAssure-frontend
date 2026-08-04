import { useState, useRef, useEffect } from "react";
import {
  Bell,
  Clipboard,
  FileText,
  GraduationCap,
  GitGraph,
  Building2,
  Info,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux-hooks";
import {
  markReadAsync,
  readAllAsync,
  fetchNotifications,
} from "@/store/notificationSlice";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type {
  Notification,
  NotificationType,
  NotificationCategory,
} from "@/types/notification";
import { notificationService } from "@/services/notification-service";
import { moduleService } from "@/services/module-service";
import { showToast } from "@/utils/toast";

const getNotificationIcon = (
  category?: NotificationCategory,
  type?: NotificationType,
) => {
  switch (category) {
    case "capa":
      return <Clipboard className="w-4 h-4" />;
    case "document":
      return <FileText className="w-4 h-4" />;
    case "training":
      return <GraduationCap className="w-4 h-4" />;
    case "workflow":
      return <GitGraph className="w-4 h-4" />;
    case "supplier":
      return <Building2 className="w-4 h-4" />;
    case "system":
      return <Bell className="w-4 h-4" />;
    default:
      switch (type) {
        case "success":
          return <CheckCircle2 className="w-4 h-4" />;
        case "warning":
          return <AlertTriangle className="w-4 h-4" />;
        case "action_required":
          return <AlertCircle className="w-4 h-4" />;
        default:
          return <Info className="w-4 h-4" />;
      }
  }
};

const getTypeColor = (type: NotificationType) => {
  switch (type) {
    case "success":
      return "text-green-500 bg-green-50";
    case "warning":
      return "text-orange-500 bg-orange-50";
    case "action_required":
      return "text-amber-500 bg-amber-50";
    case "escalation":
      return "text-red-500 bg-red-50";
    default:
      return "text-blue-500 bg-blue-50";
  }
};

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { notifications, unread_count } = useAppSelector(
    (state) => state.notifications,
  );
  const { roles, tenantId } = useAppSelector((state) => state.auth);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fetch notifications when opened
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchNotifications({ limit: 20 }));
    }
  }, [isOpen, dispatch]);

  const handleMarkAllRead = () => {
    dispatch(readAllAsync());
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

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      dispatch(markReadAsync(notification.id));
    }

    // Special handling for tasks as requested - redirect to My Tasks tab
    if (["workflow_task"].includes(notification.entity_type || "")) {
      navigate("/tenant/workflows/tasks");
      setIsOpen(false);
      return;
    }

    // Special handling for system as requested - redirect to Dashboard
    // if (['system'].includes(notification.category || '')) {
    //   navigate('/tenant');
    //   setIsOpen(false);
    //   return;
    // }

    if (notification.action_url) {
      const match = notification.action_url.match(
        /^\/?modules\/([a-fA-F0-9-]+)\/launch\/?$/,
      );
      if (match) {
        const moduleId = match[1];
        handleLaunchModule(moduleId);
        setIsOpen(false);
        return;
      }

      const targetUrl = notification.action_url.startsWith("/tenant")
        ? notification.action_url
        : `/tenant${notification.action_url.startsWith("/") ? "" : "/"}${notification.action_url}`;
      navigate(targetUrl);
    }
    setIsOpen(false);
  };

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationService.dismiss(id);
      dispatch(fetchNotifications({ limit: 20 }));
      showToast.success("Notification dismissed");
    } catch (error) {
      showToast.error("Failed to dismiss notification");
    }
  };

  const handleDismissAll = async () => {
    try {
      await notificationService.dismissAll();
      dispatch(fetchNotifications({ limit: 20 }));
      showToast.success("All notifications dismissed");
    } catch (error) {
      showToast.error("Failed to dismiss all notifications");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 flex items-center justify-center rounded-full border border-[rgba(0,0,0,0.08)] hover:bg-gray-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
            {unread_count > 99 ? "99+" : unread_count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[320px] sm:w-[380px] md:w-[400px] max-w-[95vw] max-h-[80vh] md:max-h-[60vh] lg:max-h-[500px] bg-white border border-gray-200 rounded-xl shadow-lg z-[100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unread_count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={handleDismissAll}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Dismiss all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  All caught up!
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  No notifications to show right now.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "group relative px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3",
                      !notification.is_read && "bg-blue-50/30",
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                        getTypeColor(notification.notification_type),
                      )}
                    >
                      {getNotificationIcon(
                        notification.category,
                        notification.notification_type,
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-start justify-between mb-0.5">
                        <p
                          className={cn(
                            "text-sm font-medium text-gray-900 truncate pr-2",
                            !notification.is_read && "font-bold",
                          )}
                        >
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            { addSuffix: true },
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      {notification.entity_name && (
                        <div className="mt-2 text-[10px] font-medium text-gray-400 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 uppercase tracking-wider">
                            {notification.entity_type?.replace("_", " ")}
                          </span>
                          <span className="truncate">
                            {notification.entity_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDismiss(e, notification.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Unread indicator dot */}
                    {!notification.is_read && (
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => {
                const isSuperAdmin = roles.includes("super_admin");
                navigate(
                  isSuperAdmin ? "/notifications" : "/tenant/notifications",
                );
                setIsOpen(false);
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All Notifications
            </button>
            <button
              onClick={() => {
                const isSuperAdmin = roles.includes("super_admin");
                navigate(
                  isSuperAdmin
                    ? "/settings/notifications"
                    : "/tenant/settings/notifications",
                );
                setIsOpen(false);
              }}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
