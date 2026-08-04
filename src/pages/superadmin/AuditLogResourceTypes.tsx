import { useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/layout/Layout';
import {
  DataTable,
  StatusBadge,
  Modal,
  PrimaryButton,
  SecondaryButton,
  FormField,
  FormSelect,
  FilterDropdown,
  Pagination,
  type Column,
  DeleteConfirmationModal,
  ActionDropdown,
} from '@/components/shared';
import { Plus, Settings, Check, X, Building2, Search } from 'lucide-react';
import { auditLogService } from '@/services/audit-log-service';
import { moduleService } from '@/services/module-service';
import { toast } from 'sonner';

const resourceTypeSchema = z.object({
  name: z.string().min(1, 'Resource name is required').max(100, 'Name is too long'),
  type: z.enum(['PLATFORM', 'MODULE']),
  module_id: z.string().optional().nullable(),
  audit_log_tracking: z.boolean(),
}).refine((data) => {
  if (data.type === 'MODULE' && !data.module_id) {
    return false;
  }
  return true;
}, {
  message: 'Module is required when type is MODULE',
  path: ['module_id'],
});

type ResourceTypeFormData = z.infer<typeof resourceTypeSchema>;

interface ResourceType {
  id: string;
  name: string;
  type: 'PLATFORM' | 'MODULE';
  module_id: string | null;
  audit_log_tracking: boolean;
  module?: {
    name: string;
  };
}

const AuditLogResourceTypes = (): ReactElement => {
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedRT, setSelectedRT] = useState<ResourceType | null>(null);

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [rtToDelete, setRtToDelete] = useState<ResourceType | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Pagination & Filtering State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [moduleIdFilter, setModuleIdFilter] = useState<string| null>(null);
  const [sort, setSort] = useState<string>('asc');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ResourceTypeFormData>({
    resolver: zodResolver(resourceTypeSchema) as any,
    defaultValues: {
      name: '',
      type: 'PLATFORM',
      module_id: '',
      audit_log_tracking: true,
    },
  });

  const typeValue = watch('type');
  const moduleIdValue = watch('module_id');
  const trackingValue = watch('audit_log_tracking');

  const fetchResourceTypes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await auditLogService.getAllResourceTypes(currentPage, limit, {
        search: debouncedSearch,
        type: typeFilter,
        module_id: moduleIdFilter,
        sort
      });
      if (response.success) {
        setResourceTypes(response.data);
        setTotalItems(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load resource types');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, debouncedSearch, typeFilter, moduleIdFilter, sort]);

  const fetchModules = async () => {
    try {
      const response = await moduleService.getDropdown();
      if (response.success) {
        setModules(response.data);
      }
    } catch (err) {
      console.error('Failed to load modules');
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    fetchResourceTypes();
  }, [fetchResourceTypes]);

  // Debouncing for Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenModal = (rt?: ResourceType) => {
    if (rt) {
      setIsEditing(true);
      setSelectedRT(rt);
      reset({
        name: rt.name,
        type: rt.type,
        module_id: rt.module_id || '',
        audit_log_tracking: rt.audit_log_tracking,
      });
    } else {
      setIsEditing(false);
      setSelectedRT(null);
      reset({
        name: '',
        type: 'PLATFORM',
        module_id: '',
        audit_log_tracking: true,
      });
    }
    setIsModalOpen(true);
  };

  const onFormSubmit = async (data: ResourceTypeFormData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        ...data,
        module_id: data.type === 'MODULE' ? data.module_id : null,
      };

      let response;
      if (isEditing && selectedRT) {
        response = await auditLogService.updateResourceType(selectedRT.id, payload);
      } else {
        response = await auditLogService.createResourceType(payload);
      }

      if (response.success) {
        toast.success(`Resource type ${isEditing ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        fetchResourceTypes();
      }
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (rt: ResourceType) => {
    setRtToDelete(rt);
    setIsDeleteModalOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!rtToDelete) return;
    try {
      setIsDeleting(true);
      const response = await auditLogService.deleteResourceType(rtToDelete.id);
      if (response.success) {
        toast.success('Resource type deleted successfully');
        setIsDeleteModalOpen(false);
        fetchResourceTypes();
      }
    } catch (err) {
      toast.error('Failed to delete resource type');
    } finally {
      setIsDeleting(false);
      setRtToDelete(null);
    }
  };

  const columns: Column<ResourceType>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (rt) => (
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#475569]" />
          <span className="">{rt.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (rt) => (
        <StatusBadge variant={rt.type === 'PLATFORM' ? 'info' : 'process'}>
          {rt.type}
        </StatusBadge>
      ),
    },
    {
      key: 'module',
      label: 'Associated Module',
      render: (rt) => rt.type === 'MODULE' && rt.module_id ? (
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          <span>{rt.module?.name || 'Loading...'}</span>
        </div>
      ) : (
        <span className="text-xs text-[#9aa6b2]">N/A (Platform)</span>
      ),
    },
    {
      key: 'audit_log_tracking',
      label: 'Tracking',
      render: (rt) => (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${rt.audit_log_tracking ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
          {rt.audit_log_tracking ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          <span>{rt.audit_log_tracking ? 'Enabled' : 'Disabled'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (rt) => (
        <div className="flex justify-end gap-2 pr-2">
          <ActionDropdown
            onEdit={() => handleOpenModal(rt)}
            onDelete={() => handleDeleteClick(rt)}
          />
        </div>
      ),
    },
  ];

  return (
    <Layout
      currentPage="Resource Types"
      pageHeader={{
        title: 'Audit Resource Management',
        description: 'Manage platform and module-specific resource types for audit log tracking.',
        action: (
          <PrimaryButton
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Resource Type</span>
          </PrimaryButton>
        ),
      }}
    >
      <div className="flex flex-col gap-2">
        {/* Filter Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[rgba(0,0,0,0.08)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#112868]/10 focus:border-[#112868] transition-all"
              />
            </div>

            {/* Type Filter */}
            <FilterDropdown
              label="Type"
              options={[
                { value: 'PLATFORM', label: 'Platform' },
                { value: 'MODULE', label: 'Module' },
              ]}
              value={typeFilter}
              onChange={(val) => {
                setTypeFilter(val as string | null);
                setCurrentPage(1);
              }}
              placeholder="All Types"
            />

            {/* Module Filter */}
            <FilterDropdown
              label="Module"
              options={modules.map(m => ({ value: m.id, label: m.name }))}
              value={moduleIdFilter}
              onChange={(val) => {
                setModuleIdFilter(val as string | null);
                setCurrentPage(1);
              }}
              placeholder="All Modules"
              isSearchable
            />

            {/* Sort Filter */}
            <FilterDropdown
              label="Sort By"
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'asc', label: 'Name (A-Z)' },
                { value: 'desc', label: 'Name (Z-A)' },
              ]}
              value={sort}
              onChange={(val) => {
                setSort(val as string || 'newest');
                setCurrentPage(1);
              }}
              placeholder="Sort Order"
            />

            {(debouncedSearch || typeFilter || moduleIdFilter || sort !== 'asc') && (
              <button
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setTypeFilter(null);
                  setModuleIdFilter(null);
                  setSort('asc');
                  setCurrentPage(1);
                }}
                className="text-xs text-[#ef4444] hover:underline font-medium ml-1"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="text-xs text-[#6b7280] font-medium">
            Total Results: <span className="text-[#0f1724]">{totalItems}</span>
          </div>
        </div>

        <div className="overflow-hidden">
          <DataTable
            columns={columns}
            data={resourceTypes}
            keyExtractor={(rt) => rt.id}
            isLoading={isLoading}
            emptyMessage="No resource types configured yet."
          />
          
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={limit}
              onPageChange={setCurrentPage}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Resource Type' : 'Create Resource Type'}
        maxWidth="md"
        footer={
          <div className="flex gap-3">
            <SecondaryButton
              type="button"
              onClick={() => setIsModalOpen(false)}
              // className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={handleSubmit(onFormSubmit as any)}
              // className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Type')}
            </PrimaryButton>
          </div>
        }
      >
        <form onSubmit={handleSubmit(onFormSubmit as any)} className="flex flex-col gap-1">
          <FormField
            label="Resource Name"
            required
            placeholder="e.g. MasterFile, UserProfile"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="flex flex-col gap-0.5 pb-4">
            <label className="text-[13px] font-medium text-[#0e1b2a]">
              Type <span className="text-[#e02424]">*</span>
            </label>
            <div className="flex gap-6 mt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  value="PLATFORM"
                  checked={typeValue === 'PLATFORM'}
                  onChange={() => setValue('type', 'PLATFORM', { shouldValidate: true })}
                  className="w-4 h-4 text-[#112868] focus:ring-[#112868] border-[rgba(0,0,0,0.1)]"
                />
                <span className="text-sm text-[#0f1724] group-hover:text-[#112868] transition-colors">Platform</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  value="MODULE"
                  checked={typeValue === 'MODULE'}
                  onChange={() => setValue('type', 'MODULE', { shouldValidate: true })}
                  className="w-4 h-4 text-[#112868] focus:ring-[#112868] border-[rgba(0,0,0,0.1)]"
                />
                <span className="text-sm text-[#0f1724] group-hover:text-[#112868] transition-colors">Module</span>
              </label>
            </div>
            {errors.type && <p className="text-sm text-[#ef4444] mt-1">{errors.type.message}</p>}
          </div>

          {typeValue === 'MODULE' && (
            <FormSelect
              label="Select Module"
              required
              placeholder="Choose a module..."
              options={modules.map(m => ({ value: m.id, label: m.name }))}
              value={moduleIdValue || ''}
              onValueChange={(val) => setValue('module_id', val, { shouldValidate: true })}
              error={errors.module_id?.message}
            />
          )}

          <div className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-xl border border-[rgba(0,0,0,0.06)] mt-2">
            <input
              type="checkbox"
              id="tracking"
              checked={trackingValue}
              onChange={(e) => setValue('audit_log_tracking', e.target.checked)}
              className="w-4.5 h-4.5 text-[#112868] rounded border-[rgba(0,0,0,0.1)] focus:ring-[#112868] cursor-pointer"
            />
            <div className="flex flex-col">
              <label htmlFor="tracking" className="text-[13px] font-semibold text-[#0e1b2a] cursor-pointer">
                Enable Audit Log Tracking
              </label>
              <p className="text-[11px] text-[#6b7280]">When enabled, all security actions for this resource will be logged.</p>
            </div>
          </div>
        </form>
      </Modal>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setRtToDelete(null);
        }}
        onConfirm={onConfirmDelete}
        title="Delete Resource Type"
        message="Are you sure you want to delete this resource type? This action cannot be undone."
        itemName={rtToDelete?.name || ''}
        isLoading={isDeleting}
      />
    </Layout>
  );
};

export default AuditLogResourceTypes;
