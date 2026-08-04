import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Loader2 } from 'lucide-react';
import { SecondaryButton, StatusBadge, Modal } from '@/components/shared';
import type { Role } from '@/types/role';

interface ViewRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string | null;
  onLoadRole: (id: string) => Promise<Role>;
}

// Helper function to get scope badge variant
const getScopeVariant = (scope: string): 'success' | 'failure' | 'process' => {
  switch (scope.toLowerCase()) {
    case 'platform':
      return 'success';
    case 'tenant':
      return 'process';
    case 'module':
      return 'failure';
    default:
      return 'success';
  }
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ViewRoleModal = ({
  isOpen,
  onClose,
  roleId,
  onLoadRole,
}: ViewRoleModalProps): ReactElement | null => {
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load role data when modal opens
  useEffect(() => {
    if (isOpen && roleId) {
      const loadRole = async (): Promise<void> => {
        try {
          setIsLoading(true);
          setError(null);
          const data = await onLoadRole(roleId);
          setRole(data);
        } catch (err: any) {
          setError(err?.response?.data?.error?.message || 'Failed to load role details');
        } finally {
          setIsLoading(false);
        }
      };
      loadRole();
    } else {
      setRole(null);
      setError(null);
    }
  }, [isOpen, roleId, onLoadRole]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="View Role Details"
      description="View role information"
      maxWidth="lg"
      footer={
        <SecondaryButton type="button" onClick={onClose} className="px-4 py-2.5 text-sm">
          Close
        </SecondaryButton>
      }
    >
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-[#112868] animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md">
          <p className="text-sm text-[#ef4444]">{error}</p>
        </div>
      )}

      {!isLoading && !error && role && (
        <div className="flex flex-col gap-6">
          {/* Basic Information */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-[#0e1b2a]">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#6b7280] mb-1 block">Role Name</label>
                <p className="text-sm text-[#0e1b2a]">{role.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6b7280] mb-1 block">Role Code</label>
                <p className="text-sm text-[#0e1b2a] font-mono">{role.code}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6b7280] mb-1 block">Scope</label>
                <div className="mt-1">
                  <StatusBadge variant={getScopeVariant(role.scope)}>
                    {role.scope}
                  </StatusBadge>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6b7280] mb-1 block">Status</label>
                <div className="mt-1">
                  <StatusBadge variant={role.is_active !== false ? 'success' : 'failure'}>
                    {role.is_active !== false ? 'Active' : 'Inactive'}
                  </StatusBadge>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6b7280] mb-1 block">Role ID</label>
                <p className="text-sm text-[#0e1b2a] font-mono">{role.id}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {role.description && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">Description</h3>
              <div>
                <p className="text-sm text-[#0e1b2a]">{role.description}</p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-[#0e1b2a]">Timestamps</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#6b7280] mb-1 block">Created At</label>
                <p className="text-sm text-[#0e1b2a]">{formatDate(role.created_at)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6b7280] mb-1 block">Updated At</label>
                <p className="text-sm text-[#0e1b2a]">{formatDate(role.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
