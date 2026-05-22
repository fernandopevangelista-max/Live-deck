import React from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "pending";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-ld-soft text-ld-muted",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  pending: "bg-purple-100 text-purple-700",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function slideStatusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    ready: "success",
    generating: "pending",
    error: "error",
    pending: "warning",
  };
  return map[status] || "default";
}
