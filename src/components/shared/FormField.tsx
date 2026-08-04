import { useState, type ReactNode } from 'react';
import type { ReactElement, InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: ReactNode;
}

export const FormField = ({
  label,
  required = false,
  error,
  helperText,
  className,
  id,
  type,
  ...props
}: FormFieldProps): ReactElement => {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = Boolean(error);
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-0.5 pb-4">
      <label
        htmlFor={fieldId}
        className="flex items-center gap-1 text-[13px] font-medium text-[#0e1b2a]"
      >
        <span>{label}</span>
        {required && <span className="text-[#e02424]">*</span>}
      </label>
      <div className="relative">
      <input
        id={fieldId}
          type={isPassword && showPassword ? 'text' : type}
        className={cn(
          'h-10 w-full px-3.5 py-1 bg-white border rounded-md text-sm transition-colors',
          'placeholder:text-[#9aa6b2] text-[#0e1b2a]',
          hasError
            ? 'border-[#ef4444] focus-visible:border-[#ef4444] focus-visible:ring-[#ef4444]/20'
            : 'border-[rgba(0,0,0,0.08)] focus-visible:border-[#112868] focus-visible:ring-[#112868]/20',
          'focus-visible:outline-none focus-visible:ring-2',
            props.disabled && 'bg-[#f3f4f6] cursor-not-allowed opacity-60',
            isPassword && 'pr-10',
          className
        )}
        aria-invalid={hasError}
        aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
        {...props}
      />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#0e1b2a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#112868]/20 rounded p-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
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
