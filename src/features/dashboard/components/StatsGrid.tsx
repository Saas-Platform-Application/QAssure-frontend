import { useState, useEffect } from "react";
import {
  Building2,
  CheckCircle2,
  Package,
  Heart,
} from "lucide-react";
import { GradientStatCard } from "@/components/shared";
import type { StatCardData } from "@/types/dashboard";
import { dashboardService } from "@/services/dashboard-service";

export const StatsGrid = () => {
  const [statsData, setStatsData] = useState<StatCardData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await dashboardService.getStatistics();
        const { data } = response;

        const mappedStats: StatCardData[] = [
          {
            icon: Building2,
            value: data.totalTenants,
            label: "Total Tenants",
            badge: { text: `${data.activeTenants} active`, variant: "success" },
          },
          {
            icon: CheckCircle2,
            value: data.activeTenants,
            label: "Active Tenants",
            badge: {
              text:
                data.totalTenants > 0
                  ? `${Math.round((data.activeTenants / data.totalTenants) * 100)}% Rate`
                  : "0% Rate",
              variant: "success",
            },
          },
          {
            icon: Package,
            value: data.registeredModules,
            label: "Registered Modules",
            badge: { text: "Total", variant: "info" },
          },
          {
            icon: Heart,
            value: data.healthyModules,
            label: "Healthy Modules",
            badge: {
              text:
                data.registeredModules > 0
                  ? `${Math.round((data.healthyModules / data.registeredModules) * 100)}% Uptime`
                  : "0% Uptime",
              variant:
                data.healthyModules === data.registeredModules &&
                data.registeredModules > 0
                  ? "success"
                  : "info",
            },
          },
        ];

        setStatsData(mappedStats);
      } catch (err) {
        console.error("Failed to fetch dashboard statistics:", err);
        setError("Failed to load statistics. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6 auto-rows-fr">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[8px] p-[1px] h-[108px] bg-gray-100 animate-pulse"
          >
            <div className="w-full h-full rounded-[7px] bg-white p-4 space-y-3">
               <div className="h-4 bg-gray-50 rounded w-1/4"></div>
               <div className="h-8 bg-gray-50 rounded w-1/2"></div>
               <div className="h-3 bg-gray-50 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 md:mb-6">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6 auto-rows-fr">
      {statsData.map((stat, index) => (
        <GradientStatCard key={index} {...stat} />
      ))}
    </div>
  );
};
