import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactElement, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  onValueChange?: (value: string) => void;
  isSearchable?: boolean;
}

export const FormSelect = ({
  label,
  required = false,
  error,
  helperText,
  options,
  placeholder = 'Select Item',
  className,
  id,
  value,
  onValueChange,
  isSearchable = false,
  ...props
}: FormSelectProps): ReactElement => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>(value as string || '');
  const [dropdownStyle, setDropdownStyle] = useState<{ top?: string; bottom?: string; left: string; width: string }>({ left: '0', width: '0' });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(event.target as Node)
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
    };

    if (!isOpen) {
      setSearchTerm('');
    }

    if (isOpen && buttonRef.current) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      // Calculate position when dropdown opens
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 240; // max-h-60 = 240px
      
      // Determine if should open upward or downward
      const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      // Calculate dropdown position
      const left = rect.left;
      const width = rect.width;
      
      if (shouldOpenUp) {
        // Position above the button
        const bottom = window.innerHeight - rect.top;
        setDropdownStyle({
          bottom: `${bottom}px`,
          left: `${left}px`,
          width: `${width}px`,
        });
      } else {
        // Position below the button
        const top = rect.bottom;
        setDropdownStyle({
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
        });
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value as string);
    }
  }, [value]);

  const fieldId = id || (typeof label === 'string' 
    ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` 
    : `select-${Math.random().toString(36).substring(2, 9)}`);
  const hasError = Boolean(error);
  
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    if (onValueChange) {
      onValueChange(optionValue);
    }
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-0.5 pb-4">
      <label
        htmlFor={fieldId}
        className="flex items-center gap-1 text-[13px] font-medium text-[#0e1b2a]"
      >
        <span>{label}</span>
        {required && <span className="text-[#e02424]">*</span>}
      </label>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          id={fieldId}
          onClick={() => !props.disabled && setIsOpen(!isOpen)}
          disabled={props.disabled}
          className={cn(
            'h-10 w-full px-3.5 py-1 bg-white border rounded-md text-sm transition-colors',
            'flex items-center justify-between',
            'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
            hasError
              ? 'border-[#ef4444] focus-visible:border-[#ef4444] focus-visible:ring-[#ef4444]/20'
              : 'border-[rgba(0,0,0,0.08)] focus-visible:border-[#112868] focus-visible:ring-[#112868]/20',
            'focus-visible:outline-none focus-visible:ring-2',
            selectedValue ? 'text-[#0e1b2a]' : 'text-[#9aa6b2]',
            className
          )}
          aria-invalid={hasError}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronDown
            className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
          />
        </button>

        {isOpen && buttonRef.current && createPortal(
          <div
            ref={dropdownMenuRef}
            data-dropdown-menu="true"
            className="fixed bg-white border border-[rgba(0,0,0,0.2)] rounded-md shadow-lg z-[250] max-h-60 overflow-y-auto"
            style={dropdownStyle}
          >
            {isSearchable && (
              <div className="p-2 border-b border-[rgba(0,0,0,0.05)] sticky top-0 bg-white z-10">
                <input
                  type="text"
                  className="w-full px-3 py-1.5 text-sm border border-[rgba(0,0,0,0.1)] rounded-md focus:outline-none focus:border-[#112868]"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <ul role="listbox" className="py-1.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <li key={option.value} role="option" aria-selected={selectedValue === option.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm text-[#0e1b2a] hover:bg-gray-50 transition-colors',
                        selectedValue === option.value && 'bg-gray-50'
                      )}
                    >
                      {option.label}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-4 text-center text-sm text-[#9aa6b2]">
                  No results found
                </li>
              )}
            </ul>
          </div>,
          document.body
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
      <select
        value={selectedValue}
        onChange={(e) => handleSelect(e.target.value)}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
