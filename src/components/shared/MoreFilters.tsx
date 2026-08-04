import type { ReactElement, ReactNode } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/hooks/useAppTheme";
import { PrimaryButton } from "./PrimaryButton";
import { SecondaryButton } from "./SecondaryButton";

interface MoreFiltersProps {
  title?: string;
  isOpen: boolean;
  onOpenToggle: (isOpen: boolean) => void;
  onApply: () => void;
  onCancel: () => void;
  hasActiveFilters?: boolean;
  children: ReactNode;
}

export const MoreFilters = ({
  title = "Filter Options",
  isOpen,
  onOpenToggle,
  onApply,
  onCancel,
  hasActiveFilters = false,
  children,
}: MoreFiltersProps): ReactElement => {
  const { primaryColor } = useAppTheme();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenToggle(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-sm font-medium border bg-white transition-colors cursor-pointer select-none",
          isOpen || hasActiveFilters
            ? "border-[rgba(8,76,200,0.35)] text-[#0f1724]"
            : "border-[rgba(0,0,0,0.08)] text-[#475569] hover:border-[#084cc8]/30"
        )}
        style={
          isOpen || hasActiveFilters
            ? { borderColor: `${primaryColor}55`, color: primaryColor }
            : undefined
        }
      >
        <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
        More filters
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 shrink-0 opacity-70 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 sm:left-0 md:right-0 sm:right-auto md:left-auto top-12 flex w-[90vw] max-w-[500px] flex-col items-start gap-[16px] rounded-[12px] bg-white p-[20px] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.10),0_10px_10px_14px_rgba(135,135,135,0.04)] z-50 border border-gray-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between self-stretch">
            <h2 className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <button type="button" onClick={() => onOpenToggle(false)}>
              <X size={20} className="text-gray-500 hover:text-gray-700" />
            </button>
          </div>

          {/* Children container */}
          <div className="flex flex-col self-stretch">
            {children}
          </div>

          {/* Footer Actions */}
          <div className="flex items-start justify-end gap-[12px] self-stretch mt-2">
            <SecondaryButton
              type="button"
              onClick={onCancel}
              className="px-6 h-10 select-none cursor-pointer"
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={onApply}
              className="px-6 h-10 select-none cursor-pointer"
            >
              Apply filters
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
};
