import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-ld-title">{label}</label>
      )}
      <input
        {...props}
        className={`w-full px-3 py-2 rounded-lg border border-ld-border bg-white text-ld-text placeholder-ld-muted focus:outline-none focus:ring-2 focus:ring-ld-primary focus:border-transparent transition ${error ? "border-ld-risk" : ""} ${className}`}
      />
      {error && <p className="text-xs text-ld-risk">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-ld-title">{label}</label>
      )}
      <textarea
        {...props}
        className={`w-full px-3 py-2 rounded-lg border border-ld-border bg-white text-ld-text placeholder-ld-muted focus:outline-none focus:ring-2 focus:ring-ld-primary focus:border-transparent transition resize-none ${error ? "border-ld-risk" : ""} ${className}`}
      />
      {error && <p className="text-xs text-ld-risk">{error}</p>}
    </div>
  );
}
