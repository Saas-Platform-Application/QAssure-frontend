import type { ReactElement, TextareaHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: ReactNode;
}

export const FormTextArea = ({
  label,
  required = false,
  error,
  helperText,
  className,
  id,
  ...props
}: FormTextAreaProps): ReactElement => {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-0.5 pb-4">
      <label
        htmlFor={fieldId}
        className="flex items-center gap-1 text-[13px] font-medium text-[#0e1b2a]"
      >
        <span>{label}</span>
        {required && <span className="text-[#e02424]">*</span>}
      </label>
      <textarea
        id={fieldId}
        className={cn(
          'w-full px-3.5 py-2 bg-white border rounded-md text-sm transition-colors min-h-[100px]',
          'placeholder:text-[#9aa6b2] text-[#0e1b2a]',
          hasError
            ? 'border-[#ef4444] focus-visible:border-[#ef4444] focus-visible:ring-[#ef4444]/20'
            : 'border-[rgba(0,0,0,0.08)] focus-visible:border-[#112868] focus-visible:ring-[#112868]/20',
          'focus-visible:outline-none focus-visible:ring-2',
          props.disabled && 'bg-[#f3f4f6] cursor-not-allowed opacity-60',
          className
        )}
        aria-invalid={hasError}
        aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-[#ef4444]" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${fieldId}-helper`} className="text-sm text-[#6b7280]">
          {helperText}
        </p>
      )}
    </div>
  );
};
