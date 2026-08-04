import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, type WebStorage } from 'redux-persist';
import authReducer from './authSlice';
import themeReducer from './themeSlice';
import notificationReducer from './notificationSlice';

// Dynamic storage engine supporting Remember Me (localStorage vs sessionStorage)
const dynamicStorage: WebStorage = {
  getItem: (key: string) => {
    try {
      const sessionData = sessionStorage.getItem(key);
      if (sessionData !== null) {
        return Promise.resolve(sessionData);
      }
      return Promise.resolve(localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string) => {
    try {
      const isRememberMe = sessionStorage.getItem('remember_me') === 'true';
      if (isRememberMe) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('Failed to write auth persistence:', e);
    }
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      sessionStorage.removeItem('remember_me');
    } catch (e) {
      console.warn('Failed to remove auth persistence:', e);
    }
    return Promise.resolve();
  },
};

// Persist config for auth slice only
const authPersistConfig = {
  key: 'auth',
  storage: dynamicStorage,
  whitelist: ['user', 'tenantId', 'tenant', 'roles', 'permissions', 'accessToken', 'refreshToken', 'tokenType', 'expiresIn', 'expiresAt', 'isAuthenticated'],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    theme: themeReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PAUSE', 'persist/PURGE', 'persist/REGISTER', 'persist/FLUSH'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Make store available globally for axios interceptor
if (typeof window !== 'undefined') {
  (window as any).__REDUX_STORE__ = store;
}
