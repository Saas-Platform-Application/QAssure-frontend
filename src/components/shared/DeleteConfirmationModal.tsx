import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactElement } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/components/shared';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  itemName?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  isLoading = false,
  children,
}: DeleteConfirmationModalProps): ReactElement | null => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleConfirm = async (): Promise<void> => {
    await onConfirm();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,23,42,0.6)] backdrop-blur-md p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_10px_10px_-5px_rgba(0,0,0,0.04)] w-full max-w-[400px] z-[301]"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-[15px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[rgba(239,68,68,0.1)] rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-[#0e1b2a]">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-[#0e1b2a]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className='pb-4 px-5'>
          <p className="text-sm text-[#6b7280] leading-relaxed">
            {message}
            {itemName && (
              <span className="font-medium text-[#0e1b2a]"> "{itemName}"</span>
            )}
            ? This action cannot be undone.
          </p>
          {children && <div className="mt-4">{children}</div>}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5">
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm"
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            size="default"
            className="px-4 py-2.5 text-sm bg-[#ef4444] hover:bg-[#dc2626]"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
