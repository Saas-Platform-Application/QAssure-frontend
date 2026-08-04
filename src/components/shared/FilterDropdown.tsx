import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactElement } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTheme } from '@/hooks/useAppTheme';

interface FilterOption {
  value: string | string[];
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  placeholder?: string;
  showIcon?: boolean;
  icon?: ReactElement;
  isSearchable?: boolean;
}

export const FilterDropdown = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'All',
  showIcon = false,
  icon,
  isSearchable = false,
}: FilterDropdownProps): ReactElement => {
  const { primaryColor } = useAppTheme();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [localSearch, setLocalSearch] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top?: string;
    bottom?: string;
    left: string;
    width: string;
    minWidth?: string;
  }>({ left: '0', width: '0' });

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isDropdownClick = target.closest('[data-filter-dropdown="true"]');
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !isDropdownClick &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      // Don't close if scrolling inside the dropdown menu itself
      const target = event.target as HTMLElement;
      if (dropdownMenuRef.current && (dropdownMenuRef.current === target || dropdownMenuRef.current.contains(target))) {
        return;
      }
      setIsOpen(false);
      setLocalSearch(''); 
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = Math.min(options.length * 40 + 12, 240);

        const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
        const left = rect.left;
        const width = rect.width;

        if (shouldOpenUp) {
          const bottom = window.innerHeight - rect.top;
          setDropdownStyle({
            bottom: `${bottom}px`,
            left: `${left}px`,
            minWidth: `${width}px`,
            width: 'auto',
          });
        } else {
          const top = rect.bottom;
          setDropdownStyle({
            top: `${top}px`,
            left: `${left}px`,
            minWidth: `${width}px`,
            width: 'auto',
          });
        }
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, options.length]);

  // Helper to compare values (handles both string and array)
  const compareValues = (val1: string | string[], val2: string | string[]): boolean => {
    if (Array.isArray(val1) && Array.isArray(val2)) {
      return val1.length === val2.length && val1.every((v, i) => v === val2[i]);
    }
    return val1 === val2;
  };

  const selectedOption = value
    ? options.find((opt) => compareValues(opt.value, value))
    : null;
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = isSearchable 
    ? options.filter(opt => opt.label.toLowerCase().includes(localSearch.toLowerCase()))
    : options;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-md text-sm transition-all min-h-[40px] hover:bg-gray-50",
          !value && "text-[#475569]"
        )}
        style={value ? { borderColor: `${primaryColor}33`, backgroundColor: `${primaryColor}0D` } : {}}
      >
        {showIcon && icon && <span className="flex-shrink-0 text-[#94a3b8]">{icon}</span>}
        <span className="font-medium" style={value ? { color: primaryColor } : {}}>{label}</span>
        {value && (
          <span 
            className="font-bold text-xs bg-white px-1.5 py-0.5 rounded border ml-0.5"
            style={{ color: primaryColor, borderColor: `${primaryColor}1A` }}
          >
            {displayText}
          </span>
        )}
        <ChevronDown
          className={cn('w-3.5 h-3.5 text-[#94a3b8] transition-transform ml-0.5', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen &&
        buttonRef.current &&
        createPortal(
          <div
            ref={dropdownMenuRef}
            data-filter-dropdown="true"
            className="fixed bg-white border border-[rgba(0,0,0,0.2)] rounded-md shadow-lg z-[250] max-h-60 overflow-y-auto"
            style={dropdownStyle}
          >
            {isSearchable && (
              <div className="p-2 border-b border-[rgba(0,0,0,0.08)] sticky top-0 bg-white z-10">
                <input
                  type="text"
                  placeholder="Search..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-[rgba(0,0,0,0.08)] rounded focus:outline-none focus:ring-1 bg-gray-50/50"
                  style={{ 
                    // @ts-ignore
                    '--tw-ring-color': `${primaryColor}33`
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = primaryColor;
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${primaryColor}4D`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  autoFocus
                />
              </div>
            )}
            <ul className="py-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm text-[#0e1b2a] hover:bg-gray-50 transition-colors whitespace-nowrap',
                    !value && 'bg-gray-50'
                  )}
                >
                  {placeholder}
                </button>
              </li>
              {filteredOptions.length === 0 && localSearch && (
                <li className="px-3 py-4 text-center text-xs text-gray-400">
                  No results found for "{localSearch}"
                </li>
              )}
              {filteredOptions.map((option, index) => {
                const optionKey = Array.isArray(option.value)
                  ? option.value.join(':')
                  : option.value;
                const isSelected = value ? compareValues(option.value, value) : false;
                return (
                  <li key={optionKey || index}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm text-[#0e1b2a] hover:bg-gray-50 transition-colors whitespace-nowrap',
                        isSelected && 'bg-gray-50'
                      )}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
};
