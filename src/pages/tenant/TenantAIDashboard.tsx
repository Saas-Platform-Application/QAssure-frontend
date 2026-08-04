import { useEffect, useState, type ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  type Column,
  FilterDropdown,
  GradientStatCard,
} from "@/components/shared";
import { aiService } from "@/services/ai-service";
import type { AICostSummary } from "@/types/ai";
import { showToast } from "@/utils/toast";
import {
  Calendar,
  // RefreshCw,
  MessageSquare,
  Coins,
  DollarSign,
  Timer,
} from "lucide-react";
import { formatDate } from "@/utils/format-date";

type GroupBy = "day" | "week" | "month";

interface TenantAIDashboardProps {
  customTenantId?: string;
  hideLayout?: boolean;
}

export const TenantAIDashboard = ({
  customTenantId,
  hideLayout = false,
}: TenantAIDashboardProps): ReactElement => {
  const [groupBy, setGroupBy] = useState<GroupBy | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [costs, setCosts] = useState<AICostSummary | null>(null);

  useEffect(() => {
    if (!groupBy) {
      setStartDate("");
      setEndDate("");
      return;
    }
    const now = new Date();
    const start = new Date();
    if (groupBy === "day") {
      start.setDate(now.getDate() - 1);
    } else if (groupBy === "week") {
      start.setDate(now.getDate() - 7);
    } else if (groupBy === "month") {
      start.setDate(now.getDate() - 30);
    }
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(now.toISOString().split("T")[0]);
  }, [groupBy]);

  const fetchCostSummary = async (
    group: GroupBy | null = groupBy,
    start: string = startDate,
    end: string = endDate,
  ) => {
    setIsLoading(true);
    try {
      const data = await aiService.getCostSummary(
        {
          group_by: group || undefined,
          start_date: group && start ? `${start}T00:00:00.000Z` : undefined,
          end_date: group && end ? `${end}T23:59:59.999Z` : undefined,
        },
        customTenantId
      );
      setCosts(data);
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.message || "Failed to fetch cost summary",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!groupBy || (startDate && endDate)) {
      void fetchCostSummary(groupBy, startDate, endDate);
    }
  }, [groupBy, startDate, endDate, customTenantId]);

  const providerColumns: Column<any>[] = [
    {
      key: "provider",
      label: "Provider",
      render: (row) => (
        <span className="font-semibold text-slate-900 select-all">
          {row.provider}
        </span>
      ),
    },
    {
      key: "completions",
      label: "Requests",
      align: "right",
      render: (row) => (
        <span className="font-medium text-slate-700">{row.completions}</span>
      ),
    },
    {
      key: "tokens",
      label: "Tokens",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">{row.tokens}</span>
      ),
    },
    {
      key: "cost",
      label: "Cost (USD)",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-emerald-600 font-bold">
          ${(row.cost || 0).toFixed(6)}
        </span>
      ),
    },
  ];

  const modelColumns: Column<any>[] = [
    {
      key: "model",
      label: "Model",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 select-all">
            {row.model}
          </span>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {row.provider}
          </span>
        </div>
      ),
    },
    {
      key: "completions",
      label: "Requests",
      align: "right",
      render: (row) => (
        <span className="font-medium text-slate-700">{row.completions}</span>
      ),
    },
    {
      key: "tokens",
      label: "Tokens",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">{row.tokens}</span>
      ),
    },
    {
      key: "cost",
      label: "Cost (USD)",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-emerald-600 font-bold">
          ${(row.cost || 0).toFixed(6)}
        </span>
      ),
    },
  ];

  // Formatting helpers
  const formatTokens = (t: number) => {
    if (!t) return "0";
    if (t >= 1000000) return `${(t / 1000000).toFixed(2)}M`;
    if (t >= 1000) return `${(t / 1000).toFixed(1)}K`;
    return t.toString();
  };

  const formatLatency = (ms: number) => {
    if (!ms) return "0ms";
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
  };

  const content = (
    <div className="space-y-6">
      {/* Top Controls Row */}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start gap-3">
        {/* Date Range */}
        <div className="relative">
          <input
            type="text"
            readOnly
            value={
              startDate && endDate
                ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                : "All time"
            }
            className="w-full sm:w-[220px] h-11 px-4 pr-10 rounded-[8px] border border-[#D1D5DB] bg-white text-[14px] font-medium text-[#334155] outline-none cursor-pointer"
          />
          <Calendar className="w-4 h-4 text-[#475569] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Group By */}
        <div className="w-full sm:w-[240px]">
          <FilterDropdown
            label="Group by"
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
            value={groupBy}
            onChange={(val) => {
              setGroupBy(val as GroupBy | null);
            }}
            placeholder="All"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 select-none">
        <GradientStatCard
          icon={MessageSquare}
          value={costs?.summary?.total_completions || 0}
          label="Total Completions"
        />

        <GradientStatCard
          icon={Coins}
          value={formatTokens(costs?.summary?.total_tokens || 0)}
          label="Total Tokens"
        />

        <GradientStatCard
          icon={DollarSign}
          value={`$${(costs?.summary?.total_cost || 0).toFixed(2)}`}
          label="Total Cost (USD)"
        />

        <GradientStatCard
          icon={Timer}
          value={formatLatency(costs?.summary?.avg_latency_ms || 0)}
          label="Avg Latency (ms)"
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Usage by Provider Section */}
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 select-none">
              Usage by Provider
            </h3>
            <p className="text-xs text-slate-400 select-none">
              Breakdown of requests, tokens and usage costs for each distinct
              provider.
            </p>
          </div>

          <div className="border border-slate-50 rounded-xl overflow-hidden">
            <DataTable
              data={costs?.by_provider || []}
              columns={providerColumns}
              keyExtractor={(item) =>
                item.provider || Math.random().toString()
              }
              isLoading={isLoading}
              emptyMessage="No provider metrics available for this period."
            />
          </div>
        </div>

        {/* Cost by Model Section */}
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 select-none">
              Cost by Model
            </h3>
            <p className="text-xs text-slate-400 select-none">
              Breakdown of requests and costs grouped at the AI model level.
            </p>
          </div>

          <div className="border border-slate-50 rounded-xl overflow-hidden">
            <DataTable
              data={costs?.by_model || []}
              columns={modelColumns}
              keyExtractor={(item) =>
                `${item.model}-${item.provider}` || Math.random().toString()
              }
              isLoading={isLoading}
              emptyMessage="No model metrics available for this period."
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <Layout
      currentPage="AI Services"
      pageHeader={{
        title: "AI Usage & Cost Dashboard",
        description:
          "Monitor AI completions, tokens, and billing analytics across all providers.",
      }}
    >
      {content}
    </Layout>
  );
};

export default TenantAIDashboard;
