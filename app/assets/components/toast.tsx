import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      description: options?.description,
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      action: options?.action,
      duration: 4000,
    });
  },
  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      description: options?.description,
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      action: options?.action,
      duration: 5000,
    });
  },
  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      description: options?.description,
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      action: options?.action,
      duration: 5000,
      className: "!bg-amber-50 !border-amber-200 !text-amber-900", // Custom styling for warning if needed
    });
  },
  info: (message: string, options?: ToastOptions) => {
    toast.info(message, {
      description: options?.description,
      icon: <Info className="h-5 w-5 text-blue-500" />,
      action: options?.action,
    });
  },
};
