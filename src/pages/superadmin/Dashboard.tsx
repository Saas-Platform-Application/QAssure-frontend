import type { ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import { StatsGrid } from "@/features/dashboard/components/StatsGrid";
import { RecentActivity } from "@/features/dashboard/components/RecentActivity";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
// import { SystemHealth } from '@/features/dashboard/components/SystemHealth';

const Dashboard = (): ReactElement => {
  return (
    <Layout
      currentPage="Dashboard Overview"
      pageHeader={{
        title: "Platform Overview",
        description:
          "Monitor system health, tenant activity, and user metrics in real-time.",
      }}
    >
      <StatsGrid />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 pb-8">
        {/* Main Content Area (Left) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
          <RecentActivity />
        </div>

        {/* Sidebar (Right) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          <QuickActions />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
