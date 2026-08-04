import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ReactElement } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showCloseButton?: boolean;
  preventCloseOnClickOutside?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-[400px]',
  md: 'max-w-[500px]',
  lg: 'max-w-[600px]',
  xl: 'max-w-[800px]',
  '2xl': 'max-w-[1000px]',
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  className,
  showCloseButton = true,
  preventCloseOnClickOutside = false,
}: ModalProps): ReactElement | null => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (preventCloseOnClickOutside) return;

      const target = event.target as HTMLElement;

      // Check if click is on dropdown menu (rendered via portal)
      const isDropdownClick = target.closest('[data-dropdown-menu="true"]');

      // Only close if click is outside modal AND not on dropdown
      if (modalRef.current && !modalRef.current.contains(target) && !isDropdownClick) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, preventCloseOnClickOutside]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !preventCloseOnClickOutside) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, preventCloseOnClickOutside]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(15,23,42,0.6)] backdrop-blur-md p-4">
      <div
        ref={modalRef}
        className={cn(
          'bg-white rounded-xl shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_10px_10px_-5px_rgba(0,0,0,0.04)] w-full max-h-[90vh] flex flex-col z-[201]',
          maxWidthClasses[maxWidth],
          className
        )}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between shrink-0 px-5 pt-5 pb-[15px]">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-[#0F1724]">{title}</h2>
            {description && (
              <p className="text-sm font-normal text-[#6B7280]">{description}</p>
            )}
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-[#0e1b2a]" />
            </button>
          )}
        </div>

        {/* Modal Body - Scrollable */}
        <div className={cn("flex-1 min-h-0 overflow-y-auto px-5", footer ? "pb-4" : "pb-5")}>
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 shrink-0 px-5 pb-5 pt-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
