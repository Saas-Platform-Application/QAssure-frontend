import apiClient from './api-client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Permission {
  resource: string;
  action: string;
}

export interface TenantModule {
  id: string;
  name: string;
}

export interface Tenant {
  id: string;
  name: string;
  assignedModules?: TenantModule[];
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    tenant_id: string;
    tenant?: Tenant | null;
    roles: string[];
    permissions: Permission[];
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    expires_at: string;
    // Password reset fields
    requirePasswordReset?: boolean;
    resetReason?: 'FIRST_LOGIN' | 'EXPIRED';
    tempToken?: string;
  };
  message?: string;
}

export interface ValidationError {
  success: false;
  error: 'Validation failed';
  details: Array<{
    path: string;
    message: string;
    code: string;
  }>;
}

export interface GeneralError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type LoginError = ValidationError | GeneralError;

export interface LogoutResponse {
  success: boolean;
  message?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  data: {
    success: boolean;
    message: string;
  };
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  data?: {
    message?: string;
  };
  message?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    expires_at: string;
  };
}

export interface SessionInfo {
  id: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
  expires_at?: string;
}

export interface GetSessionsResponse {
  success: boolean;
  data: {
    sessions: SessionInfo[];
    current_session_id: string;
  };
}

export interface RevokeSessionResponse {
  success: boolean;
  message?: string;
}

export interface LogoutAllResponse {
  success: boolean;
  message?: string;
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },
  logout: async (): Promise<LogoutResponse> => {
    // Token will be automatically added by api-client interceptor
    const response = await apiClient.post<LogoutResponse>('/auth/logout', {});
    return response.data;
  },
  logoutAll: async (): Promise<LogoutAllResponse> => {
    const response = await apiClient.post<LogoutAllResponse>('/auth/logout-all', {});
    return response.data;
  },
  getSessions: async (): Promise<GetSessionsResponse> => {
    const response = await apiClient.get<GetSessionsResponse>('/auth/sessions');
    return response.data;
  },
  revokeSession: async (sessionId: string): Promise<RevokeSessionResponse> => {
    const response = await apiClient.delete<RevokeSessionResponse>(`/auth/sessions/${sessionId}`);
    return response.data;
  },
  forgotPassword: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', data);
    return response.data;
  },
  resetPassword: async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', data);
    return response.data;
  },
  refreshToken: async (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', data);
    return response.data;
  },
};

