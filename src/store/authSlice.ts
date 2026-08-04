import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { authService, type LoginRequest, type LoginResponse, type LoginError, type GeneralError, type Permission, type RefreshTokenResponse, type Tenant } from '@/services/auth-service';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthState {
  user: User | null;
  tenantId: string | null;
  tenant: Tenant | null; 
  roles: string[];
  permissions: Permission[];
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  expiresIn: number | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  tenantId: null,
  tenant: null,
  roles: [],
  permissions: [],
  accessToken: null,
  refreshToken: null,
  tokenType: null,
  expiresIn: null,
  expiresAt: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunk for login
export const loginAsync = createAsyncThunk<
  { data: LoginResponse['data']; message?: string },
  LoginRequest,
  { rejectValue: LoginError }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await authService.login(credentials);
    if (response.success) {
      return { data: response.data, message: response.message };
    }
    return rejectWithValue(response as unknown as LoginError);
  } catch (error: any) {
    if (error.response?.data) {
      return rejectWithValue(error.response.data as LoginError);
    }
    return rejectWithValue({
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    } as GeneralError);
  }
});

// Async thunk for logout
export const logoutAsync = createAsyncThunk<{ message?: string }, void, { rejectValue: { message?: string } }>('auth/logout', async (_, { rejectWithValue }) => {
  try {
    const response = await authService.logout();
    return { message: response.message };
  } catch (error: any) {
    // Even if API call fails, we should still logout locally
    const errorData = error?.response?.data || { message: 'Logout failed' };
    return rejectWithValue({ message: errorData.message });
  }
});

// Async thunk for logout all
export const logoutAllAsync = createAsyncThunk<{ message?: string }, void, { rejectValue: { message?: string } }>('auth/logoutAll', async (_, { rejectWithValue }) => {
  try {
    const response = await authService.logoutAll();
    return { message: response.message };
  } catch (error: any) {
    const errorData = error?.response?.data || { message: 'Logout all failed' };
    return rejectWithValue({ message: errorData.message });
  }
});

// Async thunk for refresh token
export const refreshTokenAsync = createAsyncThunk<
  RefreshTokenResponse['data'],
  string,
  { rejectValue: string }
>('auth/refreshToken', async (refreshToken, { rejectWithValue }) => {
  try {
    const response = await authService.refreshToken({ refresh_token: refreshToken });
    if (response.success) {
      return response.data;
    }
    return rejectWithValue('Token refresh failed');
  } catch (error: any) {
    return rejectWithValue(error.message || 'Token refresh failed');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.tenantId = null;
      state.tenant = null;
      state.roles = [];
      state.permissions = [];
      state.accessToken = null;
      state.refreshToken = null;
      state.tokenType = null;
      state.expiresIn = null;
      state.expiresAt = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setTokens: (state, action: PayloadAction<{ access_token: string; refresh_token: string; expires_in: number; expires_at: string; token_type: string }>) => {
      state.accessToken = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      state.tokenType = action.payload.token_type;
      state.expiresIn = action.payload.expires_in;
      state.expiresAt = action.payload.expires_at;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action: PayloadAction<{ data: LoginResponse['data']; message?: string }>) => {
        state.isLoading = false;
        
        // If password reset is required, don't set isAuthenticated yet
        if (action.payload.data.requirePasswordReset) {
          state.isAuthenticated = false;
          state.user = action.payload.data.user;
          state.tenantId = action.payload.data.tenant_id;
          state.tenant = action.payload.data.tenant || null;
          state.error = null;
          return;
        }

        state.user = action.payload.data.user;
        state.tenantId = action.payload.data.tenant_id;
        state.tenant = action.payload.data.tenant || null;
        state.roles = action.payload.data.roles;
        state.permissions = action.payload.data.permissions || [];
        state.accessToken = action.payload.data.access_token;
        state.refreshToken = action.payload.data.refresh_token;
        state.tokenType = action.payload.data.token_type;
        state.expiresIn = action.payload.data.expires_in;
        state.expiresAt = action.payload.data.expires_at;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        if (action.payload) {
          const error = action.payload;
          if ('error' in error && typeof error.error === 'object' && 'message' in error.error) {
            // General error
            state.error = error.error.message;
          } else {
            // Validation error or other
            state.error = 'Validation failed';
          }
        } else {
          state.error = action.error.message || 'Login failed';
        }
      })
      .addCase(logoutAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        // Reset to initial state
        state.user = null;
        state.tenantId = null;
        // state.tenant = null;
        state.roles = [];
        state.permissions = [];
        state.accessToken = null;
        state.refreshToken = null;
        state.tokenType = null;
        state.expiresIn = null;
        state.expiresAt = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logoutAsync.rejected, (state) => {
        // Even if API call fails, clear local state
        state.user = null;
        state.tenantId = null;
        // state.tenant = null;
        state.roles = [];
        state.permissions = [];
        state.accessToken = null;
        state.refreshToken = null;
        state.tokenType = null;
        state.expiresIn = null;
        state.expiresAt = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logoutAllAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutAllAsync.fulfilled, (state) => {
        state.user = null;
        state.tenantId = null;
        state.roles = [];
        state.permissions = [];
        state.accessToken = null;
        state.refreshToken = null;
        state.tokenType = null;
        state.expiresIn = null;
        state.expiresAt = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logoutAllAsync.rejected, (state) => {
        state.user = null;
        state.tenantId = null;
        state.roles = [];
        state.permissions = [];
        state.accessToken = null;
        state.refreshToken = null;
        state.tokenType = null;
        state.expiresIn = null;
        state.expiresAt = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(refreshTokenAsync.fulfilled, (state, action: PayloadAction<RefreshTokenResponse['data']>) => {
        state.accessToken = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.tokenType = action.payload.token_type;
        state.expiresIn = action.payload.expires_in;
        state.expiresAt = action.payload.expires_at;
      })
      .addCase(refreshTokenAsync.rejected, (state) => {
        // If refresh fails, we should logout
        state.user = null;
        state.tenantId = null;
        state.roles = [];
        state.permissions = [];
        state.accessToken = null;
        state.refreshToken = null;
        state.tokenType = null;
        state.expiresIn = null;
        state.expiresAt = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      });
  },
});

export const { logout, clearError, setTokens } = authSlice.actions;
export default authSlice.reducer;
