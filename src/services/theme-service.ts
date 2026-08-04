import apiClient from './api-client';

export interface ThemeResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    logo_file_path: string | null; // This will be a full URL from the API
    favicon_file_path: string | null; // This will be a full URL from the API
    primary_color: string | null;
    secondary_color: string | null;
    accent_color: string | null;
  };
}

export const themeService = {
  getTheme: async (domain: string): Promise<ThemeResponse> => {
    const response = await apiClient.get<ThemeResponse>(`/tenants/theme?domain=${encodeURIComponent(domain)}`);
    return response.data;
  },
  getAuthTenantTheme: async (): Promise<ThemeResponse> => {
    const response = await apiClient.get<ThemeResponse>(`/tenants/tenant-theme`);
    return response.data;
  },
};
