import apiClient from './api-client';

export interface PasswordPolicy {
  id: string;
  tenant_id: string;
  complexity: {
    min_length: number;
    max_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    special_chars_allowed: string;
  };
  history: {
    password_history_count: number;
  };
  expiry: {
    password_expiry_days: number;
    password_expiry_warning_days: number;
  };
  lockout: {
    max_failed_attempts: number;
    lockout_duration_minutes: number;
  };
  updated_at: string;
}

export interface PasswordPolicyResponse {
  success: boolean;
  data: PasswordPolicy;
}

export interface UpdatePasswordPolicyRequest {
  min_length?: number;
  max_length?: number;
  require_uppercase?: boolean;
  require_lowercase?: boolean;
  require_numbers?: boolean;
  require_special_chars?: boolean;
  special_chars_allowed?: string;
  password_history_count?: number;
  password_expiry_days?: number;
  password_expiry_warning_days?: number;
  max_failed_attempts?: number;
  lockout_duration_minutes?: number;
}

export const securityService = {
  getPasswordPolicy: async (): Promise<PasswordPolicyResponse> => {
    const response = await apiClient.get<PasswordPolicyResponse>('/security/password-policy');
    return response.data;
  },
  updatePasswordPolicy: async (data: UpdatePasswordPolicyRequest): Promise<PasswordPolicyResponse> => {
    const response = await apiClient.put<PasswordPolicyResponse>('/security/password-policy', data);
    return response.data;
  },
};
