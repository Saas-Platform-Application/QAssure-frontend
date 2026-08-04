import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ReactElement } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginatedSelectOption {
  value: string;
  label: string;
}

interface PaginatedSelectProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  onLoadOptions: (page: number, limit: number) => Promise<{
    options: PaginatedSelectOption[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }>;
  initialOption?: { value: string; label: string };
  className?: string;
  id?: string;
}

export const PaginatedSelect = ({
  label,
  required = false,
  error,
  helperText,
  placeholder = 'Select Item',
  value,
  onValueChange,
  onLoadOptions,
  initialOption,
  className,
  id,
}: PaginatedSelectProps): ReactElement => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [options, setOptions] = useState<PaginatedSelectOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  }>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLUListElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top?: string;
    bottom?: string;
    left: string;
    width: string;
  }>({ left: '0', width: '0' });

  // Load initial options
  const loadOptions = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const result = await onLoadOptions(page, pagination.limit);
        
        if (append) {
          setOptions((prev) => [...prev, ...result.options]);
        } else {
          setOptions(result.options);
        }
        
        setPagination(result.pagination);
      } catch (err) {
        console.error('Error loading options:', err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [onLoadOptions, pagination.limit]
  );

  // Load options when dropdown opens
  useEffect(() => {
    if (isOpen) {
      if (options.length === 0) {
        loadOptions(1, false);
      }
    } else {
      // Reset pagination when dropdown closes (but keep options for faster reopening)
      // Only reset if we want fresh data each time
      // setOptions([]);
      // setPagination({ page: 1, limit: 20, total: 0, totalPages: 1, hasMore: false });
    }
  }, [isOpen, options.length, loadOptions]);

  // Handle scroll for infinite loading
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !isOpen) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;

      if (isNearBottom && pagination.hasMore && !isLoadingMore && !isLoading) {
        loadOptions(pagination.page + 1, true);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen, pagination, isLoadingMore, isLoading, loadOptions]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      // Don't close if scrolling inside the dropdown's internal scroll container
      const target = event.target as HTMLElement;
      if (scrollContainerRef.current && (scrollContainerRef.current === target || scrollContainerRef.current.contains(target))) {
        return;
      }
      // Don't close if scrolling inside the dropdown menu itself
      if (dropdownMenuRef.current && (dropdownMenuRef.current === target || dropdownMenuRef.current.contains(target))) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen && buttonRef.current) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);

      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = Math.min(240, 240);

      const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      if (shouldOpenUp) {
        setDropdownStyle({
          bottom: `${window.innerHeight - rect.top + 5}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
        });
      } else {
        setDropdownStyle({
          top: `${rect.bottom + 5}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
        });
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const fieldId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = Boolean(error);
  const selectedOption = options.find((opt) => opt.value === value) || 
    (initialOption && initialOption.value === value ? initialOption : null);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
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
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'h-10 w-full px-3.5 py-1 bg-white border rounded-md text-sm transition-colors',
            'flex items-center justify-between',
            hasError
              ? 'border-[#ef4444] focus-visible:border-[#ef4444] focus-visible:ring-[#ef4444]/20'
              : 'border-[rgba(0,0,0,0.08)] focus-visible:border-[#112868] focus-visible:ring-[#112868]/20',
            'focus-visible:outline-none focus-visible:ring-2',
            value ? 'text-[#0e1b2a]' : 'text-[#9aa6b2]',
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

        {isOpen &&
          buttonRef.current &&
          createPortal(
            <div
              ref={dropdownMenuRef}
              className="fixed bg-white border border-[rgba(0,0,0,0.2)] rounded-md shadow-lg z-[250] max-h-60 overflow-hidden flex flex-col"
              style={dropdownStyle}
              data-dropdown-menu="true"
            >
              {isLoading && options.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-[#112868] animate-spin" />
                </div>
              ) : (
                <>
                  <ul
                    ref={scrollContainerRef}
                    role="listbox"
                    className="py-1.5 overflow-y-auto flex-1"
                  >
                    {options.map((option) => (
                      <li key={option.value} role="option" aria-selected={value === option.value}>
                        <button
                          type="button"
                          onClick={() => handleSelect(option.value)}
                          className={cn(
                            'w-full px-3 py-2 text-left text-sm text-[#0e1b2a] hover:bg-gray-50 transition-colors',
                            value === option.value && 'bg-gray-50'
                          )}
                        >
                          {option.label}
                        </button>
                      </li>
                    ))}
                    {isLoadingMore && (
                      <li className="flex items-center justify-center py-2">
                        <Loader2 className="w-4 h-4 text-[#112868] animate-spin" />
                      </li>
                    )}
                  </ul>
                </>
              )}
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
    </div>
  );
};
