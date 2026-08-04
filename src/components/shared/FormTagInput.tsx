import type { ReactElement } from "react";
import { X } from "lucide-react";

interface FormTagInputProps {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  placeholder?: string;
  className?: string;
}

export const FormTagInput = ({
  label,
  value = [],
  onChange,
  error,
  placeholder = "Type and press enter...",
}: FormTagInputProps): ReactElement => {
  return (
    <div className="flex flex-col gap-0.5 pb-1">
      {label && (
        <label className="text-[13px] font-medium text-[#0e1b2a]">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2 p-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-md min-h-[40px] focus-within:ring-1 focus-within:ring-[#112868]/20 focus-within:border-[#112868]/20 transition-all">
        {value.map((tag, tagIdx) => (
          <span
            key={tagIdx}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#112868]/5 text-[#112868] rounded text-xs font-semibold border border-[#112868]/10"
          >
            {tag}
            <button
              type="button"
              onClick={() => {
                onChange(value.filter((_, i) => i !== tagIdx));
              }}
              className="hover:text-[#e02424] transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          className="flex-1 outline-none text-sm min-w-[150px] bg-transparent"
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const val = e.currentTarget.value.trim();
              if (val && !value.includes(val)) {
                onChange([...value, val]);
                e.currentTarget.value = "";
              }
            }
          }}
        />
      </div>
      {error && (
        <p className="text-xs text-[#ef4444]">{error}</p>
      )}
    </div>
  );
};
