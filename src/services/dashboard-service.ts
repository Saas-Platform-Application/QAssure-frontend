import apiClient from './api-client';

export interface DashboardStatistics {
  totalTenants: number;
  activeTenants: number;
  // totalUsers: number;
  // activeSessions: number;
  registeredModules: number;
  healthyModules: number;
}

export interface DashboardStatisticsResponse {
  success: boolean;
  data: DashboardStatistics;
}

export interface TenantDashboardStats {
  documentsCount?: number;
  pendingTasks?: number;
  usersCount?: number;
  unreadNotificationsCount?: number;
  activeModulesCount?: number;
  permissions: string[];
}

export interface TenantDashboardResponse {
  success: boolean;
  data: TenantDashboardStats;
}

export const dashboardService = {
  getStatistics: async (): Promise<DashboardStatisticsResponse> => {
    const response = await apiClient.get<DashboardStatisticsResponse>('/dashboard/statistics');
    return response.data;
  },
  
  getTenantStatistics: async (): Promise<TenantDashboardResponse> => {
    const response = await apiClient.get<TenantDashboardResponse>('/dashboard/tenant');
    return response.data;
  }
};

