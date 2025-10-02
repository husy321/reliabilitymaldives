import { toast } from 'sonner';

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export const useToast = () => {
  const showSuccess = (message: string, options?: ToastOptions) => {
    toast.success(options?.title || 'Success', {
      description: options?.description || message,
      duration: options?.duration || 4000,
    });
  };

  const showError = (message: string, options?: ToastOptions) => {
    toast.error(options?.title || 'Error', {
      description: options?.description || message,
      duration: options?.duration || 6000,
    });
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    toast.info(options?.title || 'Info', {
      description: options?.description || message,
      duration: options?.duration || 4000,
    });
  };

  const showWarning = (message: string, options?: ToastOptions) => {
    toast.warning(options?.title || 'Warning', {
      description: options?.description || message,
      duration: options?.duration || 5000,
    });
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning
  };
};