import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  Pagination,
  FilterDropdown,
  type Column,
  GradientStatCard,
} from "@/components/shared";
import { workflowService } from "@/services/workflow-service";
import { moduleService } from "@/services/module-service";
import type { WorkflowTask, WorkflowTaskCounts } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Inbox, Clock, Calendar, CheckCircle2, RotateCcw } from "lucide-react";

const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};



const Tasks = (): ReactElement => {
  const { primaryColor } = useAppTheme();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [counts, setCounts] = useState<WorkflowTaskCounts | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | null>("pending");
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);
  const [modules, setModules] = useState<{ id: string; name: string }[]>([]);

  const offset = (currentPage - 1) * limit;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await moduleService.getMyModules();
        if (res.success) {
          setModules(res.data.map((m) => ({ id: m.id, name: m.name })));
        }
      } catch (err) {
        console.error("Failed to load modules", err);
      }
    };
    fetchModules();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [tasksRes, countsRes] = await Promise.all([
          workflowService.listTasks({
            limit,
            offset,
            status: statusFilter,
            module_id: moduleFilter,
          }),
          workflowService.getTaskCounts({ module_id: moduleFilter }),
        ]);

        if (tasksRes.success) {
          setTasks(tasksRes.data);
          setTotal(tasksRes.pagination.total);
        }

        if (countsRes.success) {
          setCounts(countsRes.data);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || "Failed to load tasks");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [limit, offset, statusFilter, moduleFilter]);

  const columns: Column<WorkflowTask>[] = useMemo(
    () => [
      {
        key: "entity_name",
        label: "Entity",
        render: (task) => (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">
              {task.entity.name}
            </span>
            <span className="text-[11px] text-gray-500 uppercase tracking-tight">
              {task.entity.type}
            </span>
          </div>
        ),
      },
      {
        key: "workflow_name",
        label: "Workflow",
        render: (task) => (
          <span className="">{task.workflow.name}</span>
        ),
      },
      {
        key: "step_name",
        label: "Step",
        render: (task) => (
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium"
              style={{
                backgroundColor: `${primaryColor}1A`,
                color: primaryColor,
              }}
            >
              {task.step.name}
            </span>
          </div>
        ),
      },
      {
        key: "assignment",
        label: "Assigned To",
        render: (task) => {
          const assignedUsers = task.assignment.assigned_users || [];
          const roleIds = task.assignment.assigned_role_ids;

          if (assignedUsers.length > 0) {
            if (assignedUsers.length === 1) {
              const u = assignedUsers[0];
              const text = u.name ? `${u.email} (${u.name})` : u.email;
              return <span className="text-gray-900 font-medium">{text}</span>;
            } else {
              const firstUser = assignedUsers[0];
              const displayText = firstUser.name 
                ? `${firstUser.email} (${firstUser.name}) ...` 
                : `${firstUser.email} ...`;
              const allUsersTooltip = assignedUsers.map((u) => u.name ? `${u.email} (${u.name})` : u.email).join("\n");
              return (
                <span 
                  className="text-gray-900 font-medium cursor-help border-b border-dashed border-gray-400"
                  title={allUsersTooltip}
                >
                  {displayText}
                </span>
              );
            }
          }

          return (
            <span className="">
              {roleIds && roleIds.length > 0
                ? `${roleIds.length} roles`
                : "-"}
            </span>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (task) => {
          const isOverdueActive =
            task.is_overdue &&
            !["completed", "rejected", "cancelled"].includes(
              task.status.toLowerCase(),
            );
          return (
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium ring-1 ring-inset",
                isOverdueActive
                  ? "bg-red-50 text-red-700 ring-red-600/10"
                  : "bg-green-50 text-green-700 ring-green-600/10",
              )}
            >
              {isOverdueActive
                ? "Overdue"
                : task.status
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          );
        },
      },
      {
        key: "due_at",
        label: "Due Date",
        render: (task) => {
          const isOverdueActive =
            task.is_overdue &&
            !["completed", "rejected", "cancelled"].includes(
              task.status.toLowerCase(),
            );
          return (
            <span
              className={cn(
                isOverdueActive ? "text-red-600 font-medium" : "text-gray-600",
              )}
            >
              {formatDate(task.due_at)}
            </span>
          );
        },
      },
      {
        key: "actions",
        label: "",
        render: (task) => {
          const isDocument = task.entity?.type?.toLowerCase() === "document";
          if (!isDocument) return null;
          return (
            <button
              onClick={() => navigate(`/tenant/documents/${task.entity.id}`)}
              className="font-semibold text-sm transition-colors hover:opacity-80"
              style={{ color: primaryColor }}
            >
              View
            </button>
          );
        },
      },
    ],
    [navigate],
  );

  return (
    <Layout
      currentPage="Workflow Tasks"
      pageHeader={{
        title: "Workflows & Tasks",
        description: "Manage your pending workflow tasks and approvals.",
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GradientStatCard
            icon={Inbox}
            label="Pending Tasks"
            value={counts?.pending || 0}
          />
          
          <GradientStatCard
            icon={Clock}
            label="Overdue"
            value={counts?.overdue || 0}
          />
          <GradientStatCard
            icon={Calendar}
            label="Due Soon"
            value={counts?.due_soon || 0}
          />
          <GradientStatCard
            icon={CheckCircle2}
            label="Completed (Week)"
            value={counts?.completed_this_week || 0}
          />
        </div>

        {/* Task Table Area */}
        <div className="overflow-hidden">
          <div className="pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-gray-900">
              {statusFilter
                ? `${statusFilter.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} Tasks`
                : "All Tasks"}
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <FilterDropdown
                label="Module"
                options={modules.map((m) => ({ value: m.id, label: m.name }))}
                value={moduleFilter}
                onChange={(val) => {
                  setModuleFilter(val as string | null);
                  setCurrentPage(1);
                }}
                placeholder="All Modules"
              />

              <FilterDropdown
                label="Status"
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "completed", label: "Completed" },
                  { value: "rejected", label: "Rejected" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val as string | null);
                  setCurrentPage(1);
                }}
                placeholder="All Status"
              />

              {(statusFilter !== "pending" || moduleFilter) && (
                <button
                  onClick={() => {
                    setStatusFilter("pending");
                    setModuleFilter(null);
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-600 font-medium hover:text-red-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          <DataTable
            data={tasks}
            columns={columns}
            keyExtractor={(task) => task.id}
            emptyMessage="No tasks currently assigned to you"
            isLoading={isLoading}
            error={error}
          />

          {total > 0 && (
            <div className="px-6 py-4 border-t border-gray-100">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={total}
                limit={limit}
                onPageChange={setCurrentPage}
                onLimitChange={(value) => {
                  setLimit(value);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Tasks;
