import type { RootState } from '@/store/store';

// Get store instance for checking auth state
const getStore = () => {
  if (typeof window !== 'undefined') {
    return (window as any).__REDUX_STORE__;
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  const store = getStore();
  if (store) {
    const state = store.getState() as RootState;
    return state.auth.isAuthenticated && Boolean(state.auth.accessToken);
  }
  return false;
};

// Note: logout is now handled by Redux action
// Use: dispatch(logout()) from components
