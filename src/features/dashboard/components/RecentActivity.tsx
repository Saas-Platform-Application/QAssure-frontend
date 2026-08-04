import { useState, useEffect, useMemo } from "react";
import { Loader2, User, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auditLogService } from "@/services/audit-log-service";
import type { AuditLog } from "@/types/audit-log";
import { useAppSelector } from "@/hooks/redux-hooks";
import { useAppTheme } from "@/hooks/useAppTheme";
import { cn } from "@/lib/utils";
import { StatusBadge, DataTable, type Column } from "@/components/shared";
import { Button } from "@/components/ui/button";

// Helper functions
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  return date.toLocaleDateString();
};

const getStatusColor = (status: number | null): string => {
  if (!status) return "text-[#6b7280]";
  if (status >= 200 && status < 300) return "text-[#10b981]";
  if (status >= 400) return "text-[#ef4444]";
  return "text-[#f59e0b]";
};

const getMethodVariant = (
  method: string | null,
): "success" | "failure" | "info" | "process" => {
  if (!method) return "info";
  const upperMethod = method.toUpperCase();
  if (upperMethod === "GET") return "success";
  if (upperMethod === "POST") return "info";
  if (upperMethod === "PUT" || upperMethod === "PATCH") return "process";
  if (upperMethod === "DELETE") return "failure";
  return "info";
};

export interface RecentActivityProps {
  variant?: "list" | "table";
}

export const RecentActivity = ({ variant }: RecentActivityProps) => {
  const { primaryColor } = useAppTheme();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { tenantId, roles } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const auditLogPath = roles?.includes("super_admin")
    ? "/audit-logs"
    : "/tenant/audit-logs";

  // Default to table variant for a more professional look
  const activeVariant = variant || "table";

  useEffect(() => {
    const fetchRecentActivity = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const response = await auditLogService.getMyLogs(1, 5);
        if (response.success) {
          setAuditLogs(response.data);
        }
      } catch (err: any) {
        console.error("Failed to fetch recent activity:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentActivity();
  }, [tenantId, activeVariant]);

  const columns = useMemo<Column<AuditLog>[]>(() => [
    {
      key: "created_at",
      label: "Timestamp",
      render: (log) => (
        <span className="text-[12px] font-medium text-gray-500">
          {formatRelativeTime(log.created_at)}
        </span>
      ),
    },
    {
      key: "resource_type",
      label: "Resource Type",
      render: (log) => (
        <span
          className="text-[12px] font-bold truncate max-w-[150px] inline-block"
          style={{ color: primaryColor }}
        >
          {log.resource_type}
        </span>
      ),
    },
    {
      key: "request_method",
      label: "Method",
      render: (log) => (
        <StatusBadge variant={getMethodVariant(log.request_method)}>
          {log.request_method || "N/A"}
        </StatusBadge>
      ),
    },
    {
      key: "response_status",
      label: "Status",
      render: (log) => (
        <span
          className={cn(
            "text-[12px] font-bold",
            getStatusColor(log.response_status),
          )}
        >
          {log.response_status || "---"}
        </span>
      ),
    },
    {
      key: "ip_address",
      label: "IP Address",
      render: (log) => (
        <span className="text-[12px] font-mono text-gray-500">
          {log.ip_address || "---"}
        </span>
      ),
    },
  ], [primaryColor]);

  if (activeVariant === "list") {
    return (
      <div className="flex flex-col items-start self-stretch rounded-[8px] border border-[#D1D5DB] bg-white overflow-hidden">
        <div className="flex w-full h-[48px] px-[20px] py-[16px] items-center border-b border-[#D1D5DB]">
          <h2 className="text-[15px] font-bold text-[#111827] tracking-tight">
            Recent Activity
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-[15px] font-bold gap-1 h-7 cursor-pointer"
            style={{ color: primaryColor }}
            onClick={() => navigate(auditLogPath)}
          >
            View All <ArrowRight className="w-3 h-3" />
          </Button>
        </div>

        <div className="flex-1 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: primaryColor }}
              />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center text-[12px] text-gray-400 font-medium">
              No recent activity
            </div>
          ) : (
            <div className="flex flex-col">
              {auditLogs.map((log, index) => (
                <div
                  key={log.id}
                  className={cn(
                    "px-6 py-4 flex items-center gap-4 transition-colors hover:bg-gray-50",
                    index !== auditLogs.length - 1 &&
                      "border-b border-[#f1f5f9 ]",
                  )}
                >
                  <span className="text-[11px] font-medium text-gray-400 w-20 shrink-0">
                    {formatRelativeTime(log.created_at)}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] font-bold">
                        {log.action}
                      </span>
                      <span
                        className="text-[12px] font-bold hover:underline cursor-pointer truncate"
                        style={{ color: primaryColor }}
                      >
                        {log.resource_type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // TABLE VARIANT
  return (
    <div className="flex flex-col items-start self-stretch rounded-[8px] border border-[#D1D5DB] bg-white overflow-hidden w-full">
      <div className="flex w-full h-[48px] px-[20px] py-[16px] items-center border-b border-[#D1D5DB] justify-between">
        <h2 className="text-[16px] font-semibold text-[#111827] leading-none">
          Recent Activity
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[11px] gap-1.5 border-[rgba(0,0,0,0.08)] hover:bg-gray-50 cursor-pointer"
          onClick={() => navigate(auditLogPath)}
        >
          View All <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
      
      <div className="w-full">
        <DataTable
          data={auditLogs}
          columns={columns}
          keyExtractor={(log) => log.id}
          isLoading={isLoading}
          emptyMessage="No recent activity recorded"
        />
      </div>
    </div>
  );
};
