import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { Layout } from '@/components/layout/Layout';
import {
  StatusBadge,
  DataTable,
  type Column,
} from '@/components/shared';
import { useAppSelector } from '@/hooks/redux-hooks';
import { moduleService } from '@/services/module-service';
import type { MyModule } from '@/types/module';
import { useAppTheme } from '@/hooks/useAppTheme';

// Helper function to get status badge variant
const getStatusVariant = (status: string | null): 'success' | 'failure' | 'process' => {
  if (!status) return 'process';
  switch (status.toLowerCase()) {
    case 'running':
    case 'active':
      return 'success';
    case 'stopped':
    case 'failed':
      return 'failure';
    default:
      return 'process';
  }
};

const Modules = (): ReactElement => {
  const { primaryColor } = useAppTheme();
  const { roles, tenantId } = useAppSelector((state) => state.auth);
  const [modules, setModules] = useState<MyModule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantModules = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await moduleService.getMyModules();
      if (response.success && response.data) {
        setModules(response.data);
      } else {
        setError('Failed to load modules');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load modules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantModules();
  }, []);

  // Launch module handler
  const handleLaunchModule = async (moduleId: string): Promise<void> => {
    try {
      // Check if user is super_admin
      let rolesArray: string[] = [];
      if (Array.isArray(roles)) {
        rolesArray = roles;
      } else if (typeof roles === 'string') {
        try {
          rolesArray = JSON.parse(roles);
        } catch {
          rolesArray = [];
        }
      }
      const isSuperAdmin = rolesArray.includes('super_admin');

      // If super_admin, pass tenantId as query param
      const launchTenantId = isSuperAdmin ? tenantId : null;
      const response = await moduleService.launch(moduleId, launchTenantId);
      if (response.success && response.data.launch_url) {
        window.open(response.data.launch_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to launch module');
    }
  };

  // Define table columns
  const columns: Column<MyModule>[] = [
    {
      key: 'module_id',
      label: 'Module ID',
      render: (module) => (
        <span className="">{module.module_id}</span>
      ),
      mobileLabel: 'ID',
    },
    {
      key: 'name',
      label: 'Name',
      render: (module) => (
        <span className="">{module.name}</span>
      ),
    },
    {
      key: 'version',
      label: 'Version',
      render: (module) => (
        <span className="">{module.version}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (module) => (
        <StatusBadge variant={getStatusVariant(module.status)}>
          {module.status || 'Unknown'}
        </StatusBadge>
      ),
    },
    {
      key: 'frontend_base_url',
      label: 'Frontend URL',
      render: (module) => (
        <span className="">
          {module.frontend_base_url || 'N/A'}
        </span>
      ),
      mobileLabel: 'URL',
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (module) => (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => handleLaunchModule(module.id)}
            className="text-sm font-medium transition-colors cursor-pointer hover:opacity-80"
            style={{ color: primaryColor }}
          >
            Launch
          </button>
        </div>
      ),
    },
  ];

  // Mobile card renderer
  const mobileCardRenderer = (module: MyModule) => (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[#0f1724] truncate">{module.name}</h3>
          <p className="text-xs text-[#6b7280] mt-0.5 truncate font-mono">{module.module_id}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[#9aa6b2]">Version:</span>
          <p className="text-[#0f1724] font-normal mt-1">{module.version}</p>
        </div>
        <div>
          <span className="text-[#9aa6b2]">Status:</span>
          <div className="mt-1">
            <StatusBadge variant={getStatusVariant(module.status)}>
              {module.status || 'Unknown'}
            </StatusBadge>
          </div>
        </div>
        <div className="col-span-2">
          <span className="text-[#9aa6b2]">Frontend URL:</span>
          <p className="text-[#0f1724] font-normal mt-1 font-mono truncate">
            {module.frontend_base_url || 'N/A'}
          </p>
        </div>
        <div className="col-span-2">
          <button
            type="button"
            onClick={() => handleLaunchModule(module.id)}
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: primaryColor }}
          >
            Launch
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout
      currentPage="Modules"
      pageHeader={{
        title: 'Modules List',
        description: 'View and manage all system modules registered in the QAssure platform.',
      }}
    >
      {/* Table Container */}
      <div className="overflow-hidden">
        {/* Data Table */}
        <DataTable
          data={modules}
          columns={columns}
          keyExtractor={(module) => module.id}
          mobileCardRenderer={mobileCardRenderer}
          emptyMessage="No modules assigned to this tenant"
          isLoading={isLoading}
          error={error}
        />
      </div>
    </Layout>
  );
};

export default Modules;

