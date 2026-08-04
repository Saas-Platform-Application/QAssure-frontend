import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, SecondaryButton } from '@/components/shared';
import type { AuditLog } from '@/types/audit-log';

// Helper function to format date
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Helper function to format JSON
const formatJSON = (obj: Record<string, unknown> | null): string => {
  if (!obj) return 'N/A';
  return JSON.stringify(obj, null, 2);
};

interface ViewAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogId: string | null;
  onLoadAuditLog: (id: string) => Promise<AuditLog>;
}

export const ViewAuditLogModal = ({
  isOpen,
  onClose,
  auditLogId,
  onLoadAuditLog,
}: ViewAuditLogModalProps): ReactElement | null => {
  const [auditLog, setAuditLog] = useState<AuditLog | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load audit log data when modal opens
  useEffect(() => {
    if (isOpen && auditLogId) {
      const loadAuditLog = async (): Promise<void> => {
        try {
          setIsLoading(true);
          setError(null);
          const data = await onLoadAuditLog(auditLogId);
          setAuditLog(data);
        } catch (err: any) {
          setError(err?.response?.data?.error?.message || 'Failed to load audit log details');
        } finally {
          setIsLoading(false);
        }
      };
      loadAuditLog();
    } else {
      setAuditLog(null);
      setError(null);
    }
  }, [isOpen, auditLogId, onLoadAuditLog]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="View Audit Log Details"
      description="View audit log information"
      maxWidth="lg"
      footer={
        <SecondaryButton type="button" onClick={onClose} className="px-4 py-2.5 text-sm">
          Close
        </SecondaryButton>
      }
    >
      <div>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#112868] animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md">
            <p className="text-sm text-[#ef4444]">{error}</p>
          </div>
        )}

        {!isLoading && !error && auditLog && (
          <div className="flex flex-col gap-6">
            {/* Basic Information */}
            <div className="flex flex-col gap-4 pb-6 border-b border-[rgba(0,0,0,0.08)]">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Action</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{auditLog.action}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Resource Type</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{auditLog.resource_type}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Resource ID</label>
                  <p className="text-sm font-medium text-[#0e1b2a] font-mono">
                    {auditLog.resource_id || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Request Method</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{auditLog.request_method || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Request Path</label>
                  <p className="text-sm font-medium text-[#0e1b2a] font-mono break-all">
                    {auditLog.request_path || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Response Status</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">
                    {auditLog.response_status || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* User & Tenant Information */}
            <div className="flex flex-col gap-4 pb-6 border-b border-[rgba(0,0,0,0.08)]">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">User & Tenant Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {auditLog.user && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">User Name</label>
                      <p className="text-sm font-medium text-[#0e1b2a]">
                        {auditLog.user.first_name} {auditLog.user.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">User Email</label>
                      <p className="text-sm font-medium text-[#0e1b2a]">{auditLog.user.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">User ID</label>
                      <p className="text-sm font-medium text-[#0e1b2a] font-mono">{auditLog.user.id}</p>
                    </div>
                  </>
                )}
                {auditLog.tenant && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">Tenant Name</label>
                      <p className="text-sm font-medium text-[#0e1b2a]">{auditLog.tenant.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">Tenant ID</label>
                      <p className="text-sm font-medium text-[#0e1b2a] font-mono">{auditLog.tenant.id}</p>
                    </div>
                  </>
                )}
                {!auditLog.user && !auditLog.tenant && (
                  <div className="col-span-2">
                    <p className="text-sm text-[#6b7280]">No user or tenant information available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Request & Response Information */}
            {(auditLog.request_body || auditLog.response_body) && (
              <div className="flex flex-col gap-4 pb-6 border-b border-[rgba(0,0,0,0.08)]">
                <h3 className="text-sm font-semibold text-[#0e1b2a]">Request & Response</h3>
                <div className="grid grid-cols-1 gap-4">
                  {auditLog.request_body && (
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">Request Body</label>
                      <pre className="text-xs font-medium text-[#0e1b2a] bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-md p-3 overflow-auto max-h-60">
                        {formatJSON(auditLog.request_body)}
                      </pre>
                    </div>
                  )}
                  {auditLog.response_body && (
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">Response Body</label>
                      <pre className="text-xs font-medium text-[#0e1b2a] bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-md p-3 overflow-auto max-h-60">
                        {formatJSON(auditLog.response_body)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Changes & Metadata */}
            {(auditLog.changes || auditLog.metadata) && (
              <div className="flex flex-col gap-4 pb-6 border-b border-[rgba(0,0,0,0.08)]">
                <h3 className="text-sm font-semibold text-[#0e1b2a]">Changes & Metadata</h3>
                <div className="grid grid-cols-1 gap-4">
                  {auditLog.changes && (
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">Changes</label>
                      <pre className="text-xs font-medium text-[#0e1b2a] bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-md p-3 overflow-auto max-h-60">
                        {formatJSON(auditLog.changes)}
                      </pre>
                    </div>
                  )}
                  {auditLog.metadata && (
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">Metadata</label>
                      <pre className="text-xs font-medium text-[#0e1b2a] bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-md p-3 overflow-auto max-h-60">
                        {formatJSON(auditLog.metadata)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div className="flex flex-col gap-4 pb-6 border-b border-[rgba(0,0,0,0.08)]">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">IP Address</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{auditLog.ip_address || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">User Agent</label>
                  <p className="text-sm font-medium text-[#0e1b2a] break-all">
                    {auditLog.user_agent || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Correlation ID</label>
                  <p className="text-sm font-medium text-[#0e1b2a] font-mono">
                    {auditLog.correlation_id || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">Timestamps</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Created At</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{formatDate(auditLog.created_at)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Updated At</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{formatDate(auditLog.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
