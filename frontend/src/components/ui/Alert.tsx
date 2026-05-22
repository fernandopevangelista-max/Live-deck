import React from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

type AlertVariant = "error" | "success" | "info" | "warning";

const variantConfig: Record<AlertVariant, { bg: string; border: string; text: string; Icon: React.ElementType }> = {
  error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", Icon: AlertCircle },
  success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", Icon: CheckCircle },
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", Icon: Info },
  warning: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", Icon: AlertCircle },
};

interface AlertProps {
  variant?: AlertVariant;
  message: string;
  onClose?: () => void;
}

export function Alert({ variant = "info", message, onClose }: AlertProps) {
  const { bg, border, text, Icon } = variantConfig[variant];
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${bg} ${border}`}>
      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${text}`} />
      <p className={`text-sm flex-1 ${text}`}>{message}</p>
      {onClose && (
        <button onClick={onClose} className={`${text} hover:opacity-70`}>
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
