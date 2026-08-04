import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setNavigate } from '@/utils/navigation';

/**
 * Component to initialize navigation utility for use in services/interceptors
 * This should be rendered once at the app level
 */
export const NavigationInitializer = (): null => {
  const navigate = useNavigate();

  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  return null;
};
