import { Layout } from "@/components/layout/Layout";
import type { ReactElement } from "react";
import { FileCheck, Briefcase, FileText, Users, Bell, Lock } from "lucide-react";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { RecentActivity } from "@/features/dashboard/components/RecentActivity";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useEnabledServices } from "@/hooks/useEnabledServices";
import { workflowService } from "@/services/workflow-service";
import {
  dashboardService,
  type TenantDashboardStats,
} from "@/services/dashboard-service";
import type { WorkflowTask } from "@/types/workflow";
import { useNavigate } from "react-router-dom";
import { GradientStatCard } from "@/components/shared";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  badge?: {
    text: string;
    variant: "success" | "warning" | "info" | "error";
  };
}

const TaskCard = ({ task }: { task: WorkflowTask }) => {
  const navigate = useNavigate();
  const formatDeadline = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 0) return "Overdue";
    return `In ${diffDays} Days`;
  };

  const handleView = () => {
    if (task.entity.type.toLowerCase() === "document") {
      navigate(`/tenant/documents/${task.entity.id}`);
    }
  };

  return (
    <div className="flex flex-col items-start self-stretch p-3 gap-2.5 rounded-[6px] border border-[#D1D5DB] bg-[#F9F9F9] hover:border-[#9CA3AF] transition-colors group">
      <div className="flex justify-between items-start self-stretch">
        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.05em] leading-none">
          {task.entity.type}
        </span>
        <span
          className={cn(
            "text-[10px] font-bold leading-none",
            task.is_overdue ? "text-[#F87171]" : "text-[#94A3B8]",
          )}
        >
          {formatDeadline(task.due_at)}
        </span>
      </div>

      <div className="text-[14px] font-semibold text-[#1E293B] leading-[20px] self-stretch line-clamp-2">
        {task.entity.name}
      </div>

      <div className="flex justify-between items-center self-stretch mt-0.5">
        <div className="flex items-center gap-1.5 overflow-hidden mr-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              task.is_overdue ? "bg-[#F87171]" : "bg-[#34D399]",
            )}
          />
          <span className="text-[12px] text-[#64748B] font-medium leading-[16px] truncate">
            {task.step.name} •{" "}
            {task.assignment?.assigned_to_name || (task.assignment?.assigned_role_ids?.length ? `${task.assignment.assigned_role_ids.length} roles` : "Unassigned")}
          </span>
        </div>

        <button
          onClick={handleView}
          className="flex px-3 py-1.5 justify-center items-center rounded-[4px] border border-[#D1D5DB] bg-white text-[12px] font-bold text-[#1E293B] hover:bg-[#F9FAFB] hover:border-[#9CA3AF] transition-all shrink-0 cursor-pointer"
        >
          View
        </button>
      </div>
    </div>
  );
};

const Dashboard = (): ReactElement => {
  const navigate = useNavigate();
  const { primaryColor } = useAppTheme();
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [stats, setStats] = useState<TenantDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { isServiceEnabled } = useEnabledServices();
  const isWorkflowEnabled = isServiceEnabled("workflow");

  useEffect(() => {
    fetchDashboardData();
  }, [isWorkflowEnabled]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setTasksLoading(true);
    try {
      // Fetch tasks independently only if workflow service is enabled
      if (isWorkflowEnabled) {
        workflowService
          .listTasks({ limit: 3 })
          .then((response) => {
            if (response.success && Array.isArray(response.data)) {
              setTasks(response.data);
            }
          })
          .catch((error) => {
            console.error("Error fetching tasks:", error);
          })
          .finally(() => {
            setTasksLoading(false);
          });
      } else {
        setTasks([]);
        setTasksLoading(false);
      }

      // Fetch statistics independently
      dashboardService
        .getTenantStatistics()
        .then((response) => {
          if (response.success) {
            setStats(response.data);
          }
        })
        .catch((error) => {
          console.error("Error fetching dashboard statistics:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } catch (error) {
      console.error("Critical error in fetchDashboardData:", error);
      setLoading(false);
      setTasksLoading(false);
    }
  };

  const statCards: StatCardProps[] = [
    stats?.documentsCount !== undefined && {
      icon: FileText,
      value: stats.documentsCount,
      label: "Total Documents",
      badge: { text: "Controlled", variant: "info" },
    },
    stats?.pendingTasks !== undefined && {
      icon: FileCheck,
      value: stats.pendingTasks,
      label: "My Tasks",
      badge: { text: "Action Needed", variant: "warning" },
    },
    stats?.usersCount !== undefined && {
      icon: Users,
      value: stats.usersCount,
      label: "Total Users",
      badge: { text: "Team Members", variant: "success" },
    },
    stats?.unreadNotificationsCount !== undefined && {
      icon: Bell,
      value: stats.unreadNotificationsCount,
      label: "Notifications",
      badge: { text: "Unread", variant: "error" },
    },
    stats?.activeModulesCount !== undefined && {
      icon: Briefcase,
      value: stats.activeModulesCount,
      label: "Running Modules",
      badge: { text: "Operational", variant: "success" },
    },
  ].filter(Boolean) as StatCardProps[];

  return (
    <Layout
      currentPage="Dashboard"
      pageHeader={{
        title: "Tenant Overview",
        description: "Key quality metrics and performance indicators.",
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 pb-8">
        {/* Main Content Area (Left) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                Loading statistics...
              </div>
            ) : statCards.length > 0 ? (
              statCards.map((card, index) => (
                <GradientStatCard key={index} {...card} />
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                No statistics available
              </div>
            )}
          </div>

          {/* Recent Activity Card */}
          <RecentActivity />
        </div>

        {/* Sidebar area (Right) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* My Tasks Card */}
          <div className="flex flex-col items-start self-stretch rounded-[8px] border border-[#D1D5DB] bg-white overflow-hidden">
            <div className="flex w-full h-[48px] px-[20px] py-[16px] items-center border-b border-[#D1D5DB] justify-between">
              <h2 className="text-[16px] font-semibold text-[#111827] leading-none">
                My Tasks
              </h2>
              {isWorkflowEnabled ? (
                <button
                  onClick={() => navigate("/tenant/workflows/tasks")}
                  className="text-[11px] font-bold hover:underline cursor-pointer"
                  style={{ color: primaryColor }}
                >
                  View all
                </button>
              ) : (
                <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3 p-4 w-full">
              {!isWorkflowEnabled ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
                  <Lock className="w-8 h-8 text-gray-300" />
                  <span className="text-sm font-medium">Service locked</span>
                  <span className="text-xs text-center text-gray-400">
                    The Workflow service is disabled for your organization.
                  </span>
                </div>
              ) : tasksLoading ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  Loading tasks...
                </div>
              ) : tasks.length > 0 ? (
                tasks.map((task) => <TaskCard key={task.id} task={task} />)
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No pending tasks
                </div>
              )}
            </div>
          </div>

          <QuickActions />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
