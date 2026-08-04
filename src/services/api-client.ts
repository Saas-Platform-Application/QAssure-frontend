import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { RootState } from '@/store/store';
import { navigate } from '@/utils/navigation';
import { showToast } from '@/utils/toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to ALL requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // For FormData requests, let axios automatically set Content-Type with boundary
    // Remove the default application/json Content-Type if FormData is detected
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }

    // Always try to get token from Redux store and add to Authorization header
    try {
      const store = (window as any).__REDUX_STORE__;
      if (store) {
        const state = store.getState() as RootState;
        const token = state?.auth?.accessToken;

        // Add Bearer token to all requests if token exists
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      // Silently fail if store is not available
      console.warn('Redux store not available for token injection');
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Queue to store requests while token is being refreshed
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      const requestUrl = originalRequest.url || '';
      
      // Skip refresh for auth endpoints to avoid loops
      const isAuthEndpoint = 
        requestUrl.includes('/auth/login') || 
        requestUrl.includes('/auth/logout') || 
        requestUrl.includes('/auth/refresh');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const store = (window as any).__REDUX_STORE__;
        if (store) {
          const state = store.getState() as RootState;
          const refreshToken = state?.auth?.refreshToken;

          if (refreshToken) {
            // Call refresh API directly using axios to avoid cycles and interceptors
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            });

            if (response.data?.success) {
              const { access_token } = response.data.data;
              
              // Update store with new tokens
              // We use action type string to avoid circular dependency with authSlice
              store.dispatch({
                type: 'auth/setTokens',
                payload: response.data.data
              });

              processQueue(null, access_token);
              
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
              }
              
              isRefreshing = false;
              return apiClient(originalRequest);
            }
          }
        }
      } catch (refreshError: any) {
        processQueue(refreshError, null);

        // Check if the backend rejected the refresh due to idle inactivity
        const errorCode = refreshError?.response?.data?.error?.code;
        const errorMessage = refreshError?.response?.data?.error?.message;

        if (errorCode === 'SESSION_IDLE_TIMEOUT') {
          // Show the backend's inactivity message as a warning toast
          showToast.warning(
            'Session Expired',
            errorMessage || 'You were automatically logged out due to inactivity.'
          );
        }
      } finally {
        isRefreshing = false;
      }

      // If we reach here, refresh failed or was not possible - redirect to login
      const isTenantRoute = window.location.pathname.startsWith('/tenant/') || window.location.pathname === '/tenant';
      
      let redirectPath = '/';
      try {
        const store = (window as any).__REDUX_STORE__;
        if (store) {
          const state = store.getState() as RootState;
          const isSuperAdmin = state.auth.roles.includes('super_admin');
          redirectPath = isSuperAdmin ? '/' : (isTenantRoute ? '/tenant/login' : '/');
          store.dispatch({ type: 'auth/logout' });
        }
      } catch (e) {
        redirectPath = isTenantRoute ? '/tenant/login' : '/';
      }
      
      navigate(redirectPath, { replace: true });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
