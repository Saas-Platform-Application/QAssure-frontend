import apiClient from './api-client';
import type { Notification, NotificationPreferences } from '@/types/notification';

export interface NotificationResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

export interface GetNotificationsParams {
  is_read?: boolean;
  category?: string;
  limit?: number;
  offset?: number;
}

export const notificationService = {
  // USER NOTIFICATIONS
  getNotifications: async (params?: GetNotificationsParams): Promise<NotificationResponse<Notification[]>> => {
    const response = await apiClient.get('/notifications/me', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<NotificationResponse<{ unread_count: number }>> => {
    const response = await apiClient.get('/notifications/me/unread-count');
    return response.data;
  },

  readAll: async (): Promise<NotificationResponse<{ marked_count: number }>> => {
    const response = await apiClient.put('/notifications/me/read-all');
    return response.data;
  },

  dismissAll: async (): Promise<NotificationResponse<{ dismissed_count: number }>> => {
    const response = await apiClient.put('/notifications/me/dismiss-all');
    return response.data;
  },

  markAsRead: async (id: string): Promise<NotificationResponse<Notification>> => {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  },

  dismiss: async (id: string): Promise<NotificationResponse<void>> => {
    const response = await apiClient.put(`/notifications/${id}/dismiss`);
    return response.data;
  },

  getPreferences: async (): Promise<NotificationResponse<NotificationPreferences>> => {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  },

  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<NotificationResponse<NotificationPreferences>> => {
    const response = await apiClient.put('/notifications/preferences', preferences);
    return response.data;
  },

  // ============================================================================
  // MASTER: CATEGORIES & CODES
  // ============================================================================

  getCategories: async (params?: any): Promise<NotificationResponse<any>> => {
    const response = await apiClient.get('/notifications/categories', { params });
    return response.data;
  },

  getCategoriesForTenant: async (): Promise<NotificationResponse<any[]>> => {
    const response = await apiClient.get('/notifications/categories/tenant');
    return response.data;
  },

  createCategory: async (data: any): Promise<NotificationResponse<any>> => {
    const response = await apiClient.post('/notifications/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: any): Promise<NotificationResponse<any>> => {
    const response = await apiClient.put(`/notifications/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<NotificationResponse<void>> => {
    const response = await apiClient.delete(`/notifications/categories/${id}`);
    return response.data;
  },

  getCodesByCategory: async (categoryId: string, params?: any): Promise<NotificationResponse<any>> => {
    const response = await apiClient.get(`/notifications/categories/${categoryId}/codes`, { params });
    return response.data;
  },

  /** Fetch variables for a specific notification code (by code slug, e.g. 'capa_assigned') */
  getVariablesForCode: async (categoryIdOrCode: string, codeSlug?: string): Promise<string[]> => {
    try {
      const response = await apiClient.get(`/notifications/categories/${categoryIdOrCode}/codes`, { params: { limit: 100 } });
      const codes: any[] = response.data?.data || [];
      if (codeSlug) {
        const found = codes.find((c: any) => c.code === codeSlug);
        return Array.isArray(found?.variables) ? found.variables : [];
      }
      return [];
    } catch {
      return [];
    }
  },

  createCode: async (categoryId: string, data: any): Promise<NotificationResponse<any>> => {
    const response = await apiClient.post(`/notifications/categories/${categoryId}/codes`, data);
    return response.data;
  },

  updateCode: async (codeId: string, data: any): Promise<NotificationResponse<any>> => {
    const response = await apiClient.put(`/notifications/codes/${codeId}`, data);
    return response.data;
  },

  deleteCode: async (codeId: string): Promise<NotificationResponse<void>> => {
    const response = await apiClient.delete(`/notifications/codes/${codeId}`);
    return response.data;
  },

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  getTemplates: async (params?: any): Promise<NotificationResponse<any>> => {
    const response = await apiClient.get('/notifications/templates', { params });
    return response.data;
  },

  getSuperAdminTemplates: async (params?: any): Promise<NotificationResponse<any>> => {
    const response = await apiClient.get('/notifications/templates/super-admin', { params });
    return response.data;
  },

  createTemplate: async (data: any): Promise<NotificationResponse<any>> => {
    const response = await apiClient.post('/notifications/templates', data);
    return response.data;
  },

  updateTemplate: async (id: string, data: any): Promise<NotificationResponse<any>> => {
    const response = await apiClient.put(`/notifications/templates/${id}`, data);
    return response.data;
  },

  overrideTemplate: async (code: string, data: any): Promise<NotificationResponse<any>> => {
    const response = await apiClient.put(`/notifications/templates/${code}/override`, data);
    return response.data;
  },

  resetTemplate: async (code: string): Promise<NotificationResponse<void>> => {
    const response = await apiClient.delete(`/notifications/templates/${code}/reset`);
    return response.data;
  },
};
