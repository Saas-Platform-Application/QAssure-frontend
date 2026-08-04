import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, SecondaryButton, StatusBadge } from '@/components/shared';
import type { Module } from '@/types/module';

// Helper function to get status badge variant
const getStatusVariant = (status: string | null): 'success' | 'failure' | 'process' => {
  if (!status) return 'process';
  switch (status.toLowerCase()) {
    case 'running':
    case 'active':
    case 'healthy':
      return 'success';
    case 'stopped':
    case 'failed':
    case 'unhealthy':
      return 'failure';
    default:
      return 'process';
  }
};

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
  });
};

interface ViewModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string | null;
  onLoadModule: (id: string) => Promise<Module>;
}

export const ViewModuleModal = ({
  isOpen,
  onClose,
  moduleId,
  onLoadModule,
}: ViewModuleModalProps): ReactElement | null => {
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load module data when modal opens
  useEffect(() => {
    if (isOpen && moduleId) {
      const loadModule = async (): Promise<void> => {
        try {
          setIsLoading(true);
          setError(null);
          const data = await onLoadModule(moduleId);
          setModule(data);
        } catch (err: any) {
          setError(err?.response?.data?.error?.message || 'Failed to load module details');
        } finally {
          setIsLoading(false);
        }
      };
      loadModule();
    } else {
      setModule(null);
      setError(null);
    }
  }, [isOpen, moduleId, onLoadModule]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="View Module Details"
      description="View module information"
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

        {!isLoading && !error && module && (
          <div className="flex flex-col gap-6">
            {/* Basic Information */}
            <div className="flex flex-col gap-4 pb-6 border-b border-[rgba(0,0,0,0.08)]">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Name</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Module ID</label>
                  <p className="text-sm font-medium text-[#0e1b2a] font-mono">{module.module_id}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Version</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.version}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Status</label>
                  <div className="mt-1">
                    <StatusBadge variant={getStatusVariant(module.status)}>
                      {module.status || 'Unknown'}
                    </StatusBadge>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6b7280] mb-1 block">Description</label>
                <p className="text-sm font-medium text-[#0e1b2a]">{module.description}</p>
              </div>
            </div>

            {/* Technical Details */}
            <div className="flex flex-col gap-4 pb-6 border-b border-[rgba(0,0,0,0.08)]">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">Technical Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Runtime Language</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.runtime_language || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Framework</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.framework || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Frontend Base URL</label>
                  <p className="text-sm font-medium text-[#0e1b2a] font-mono break-all">{module.frontend_base_url || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Backend Base URL</label>
                  <p className="text-sm font-medium text-[#0e1b2a] font-mono break-all">{module.backend_base_url || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Health Endpoint</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.health_endpoint}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">X-API-Key Webhook URL</label>
                  <p className="text-sm font-medium text-[#0e1b2a] break-all">{module.webhookurl || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Identity Sync Webhook URL</label>
                  <p className="text-sm font-medium text-[#0e1b2a] break-all">{module.sync_webhook_url || '-'}</p>
                </div>
              </div>
            </div>

            {/* Resource Limits */}
            <div className="flex flex-col gap-4 pb-6 border-b border-[rgba(0,0,0,0.08)]">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">Resource Limits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">CPU Request</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.cpu_request}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">CPU Limit</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.cpu_limit}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Memory Request</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.memory_request}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Memory Limit</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.memory_limit}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Min Replicas</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.min_replicas}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Max Replicas</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.max_replicas}</p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {(module.endpoints || module.kafka_topics || module.consecutive_failures !== null) && (
              <div className="flex flex-col gap-4 pb-6 border-b border-[rgba(0,0,0,0.08)]">
                <h3 className="text-sm font-semibold text-[#0e1b2a]">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {module.endpoints && module.endpoints.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">Endpoints</label>
                      <div className="flex flex-col gap-1">
                        {module.endpoints.map((endpoint, index) => (
                          <p key={index} className="text-sm font-medium text-[#0e1b2a] font-mono">
                            {endpoint}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {module.kafka_topics && module.kafka_topics.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">Kafka Topics</label>
                      <div className="flex flex-col gap-1">
                        {module.kafka_topics.map((topic, index) => (
                          <p key={index} className="text-sm font-medium text-[#0e1b2a] font-mono">
                            {topic}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {module.consecutive_failures !== null && (
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">Consecutive Failures</label>
                      <p className="text-sm font-medium text-[#0e1b2a]">{module.consecutive_failures}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Health */}
            <div className="flex flex-col gap-4 pb-6 border-b border-[rgba(0,0,0,0.08)]">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">Health</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Health Status</label>
                  <div className="mt-1">
                    <StatusBadge variant={getStatusVariant(module.health_status)}>
                      {module.health_status || 'N/A'}
                    </StatusBadge>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Last Health Check</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{formatDate(module.last_health_check)}</p>
                </div>
              </div>
            </div>

            {/* Registration Information */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">Registration Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Registered By</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{module.registered_by_email || module.registered_by}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Registered At</label>
                  <p className="text-sm font-medium text-[#0e1b2a]">{formatDate(module.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
