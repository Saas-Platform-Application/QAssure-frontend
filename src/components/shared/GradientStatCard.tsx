import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradientStatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  badge?: {
    text: string;
    variant: "success" | "warning" | "info" | "error" | "green" | "gray";
  };
}

export const GradientStatCard: React.FC<GradientStatCardProps> = ({
  icon: Icon,
  value,
  label,
  badge,
}) => {
  return (
    <div
      className="rounded-[8px] p-[1px] h-full"
      style={{
        background:
          "var(--Linear, linear-gradient(161deg, #084CC8 -1.15%, #75C044 44.29%, #FED314 89.74%))",
      }}
    >
      <div className="flex flex-col items-start gap-3 px-4 py-4 min-h-[108px] h-full w-full rounded-[7px] bg-white">
        <div className="flex items-center justify-between w-full">
          <div className="text-[#94A3B8]">
            <Icon className="w-5 h-5 stroke-[1.8]" />
          </div>
          {badge && (
            <div
              className={cn(
                "px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap capitalize leading-normal",
                badge.variant === "success" || badge.variant === "green"
                  ? "bg-[#f1fffb] text-[#16c784]"
                  : badge.variant === "warning"
                    ? "bg-[#fff5e5] text-[#fca004]"
                    : badge.variant === "info"
                      ? "bg-[#f0f9ff] text-[#0ea5e9]"
                      : badge.variant === "error"
                        ? "bg-[#fdf5f4] text-[#e0352a]"
                        : "bg-[#f3f4f6] text-[#6b7280]", // default / gray
              )}
            >
              {badge.text}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-[24px] leading-none font-bold text-[#1E293B] tracking-[-0.02em]">
            {value}
          </h4>
          <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mt-1">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
};
