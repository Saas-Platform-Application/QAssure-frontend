import React from 'react';
import { cn } from '@/lib/utils';

interface FormSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  helperText?: string;
  error?: string;
  className?: string;
}

export const FormSlider: React.FC<FormSliderProps> = ({
  label,
  min,
  max,
  step = 0.1,
  value,
  onChange,
  helperText,
  error,
  className,
}) => {
  // Calculate percentage for gradient track
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("space-y-2 pb-4", className)}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[13px] font-semibold text-[#0e1b2a]">
          {label}
        </label>
        <div className="px-1.5 py-0.5 border border-gray-200 rounded text-[12px] font-medium text-gray-700 bg-white min-w-[36px] text-center shadow-sm">
          {value}
        </div>
      </div>

      <div className="relative h-6 flex flex-col justify-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="form-range-slider w-full cursor-pointer appearance-none bg-transparent"
          style={{
            background: `linear-gradient(to right, #00cfd5 0%, #00cfd5 ${percentage}%, #eff6ff ${percentage}%, #eff6ff 100%)`,
            height: '4px',
            borderRadius: '4px',
          }}
        />
        <div className="flex justify-between mt-2 px-0.5">
          <span className="text-[10px] font-medium text-gray-400">{min}</span>
          <span className="text-[10px] font-medium text-gray-400">{max}</span>
        </div>
      </div>

      {helperText && !error && (
        <p className="text-[11px] text-gray-400 leading-tight mt-1">
          {helperText}
        </p>
      )}
      {error && (
        <p className="text-[11px] text-red-500 leading-tight mt-1 font-medium">
          {error}
        </p>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .form-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #0f172a;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          transition: transform 0.1s ease;
          margin-top: 0px;
        }
        .form-range-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #0f172a;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .form-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
      `}} />
    </div>
  );
};
