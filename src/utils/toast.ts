import { toast } from 'sonner';

interface ToastAction {
  label: string;
  onClick: () => void;
}

/**
 * Reusable toast utility for showing success and error messages
 */
export const showToast = {
  success: (message: string, description?: string, action?: ToastAction) => {
    toast.success(message, {
      description,
      action,
      duration: 3000,
    });
  },
  error: (
    message: string,
    // description?: string,
    action?: ToastAction
  ) => {
    toast.error(message, {
      // description,
      action,
      duration: 4000,
    });
  },
  info: (message: string, description?: string, action?: ToastAction) => {
    toast.info(message, {
      description,
      action,
      duration: 3000,
    });
  },
  warning: (message: string, description?: string, action?: ToastAction) => {
    toast.warning(message, {
      description,
      action,
      duration: 3000,
    });
  },
};
