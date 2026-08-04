import api from './api-client';

export interface FailedEmail {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  notification_id: string | null;
  to_email: string;
  subject: string;
  body: string;
  error_message: string;
  status: string;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  user_email?: string;
}

export interface FailedEmailsResponse {
  data: FailedEmail[];
  total: number;
}

class FailedEmailsService {
  async getFailedEmails(limit = 50, offset = 0): Promise<FailedEmailsResponse> {
    const response = await api.get('/failed-emails', { params: { limit, offset } });
    return response.data;
  }

  async resendEmail(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/failed-emails/${id}/resend`);
    return response.data;
  }

  async resendAll(): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/failed-emails/resend-all');
    return response.data;
  }

  async deleteEmail(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/failed-emails/${id}`);
    return response.data;
  }
}

export const failedEmailsService = new FailedEmailsService();
