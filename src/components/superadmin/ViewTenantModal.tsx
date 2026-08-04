// import { useEffect, useState } from 'react';
// import type { ReactElement } from 'react';
// import { Loader2 } from 'lucide-react';
// import { Modal, SecondaryButton, StatusBadge } from '@/components/shared';
// import type { Tenant } from '@/types/tenant';

// interface ViewTenantModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   tenantId: string | null;
//   onLoadTenant: (id: string) => Promise<Tenant>;
// }

// // Helper function to get status badge variant
// const getStatusVariant = (status: string): 'success' | 'failure' | 'process' => {
//   switch (status.toLowerCase()) {
//     case 'active':
//       return 'success';
//     case 'deleted':
//       return 'failure';
//     case 'suspended':
//       return 'process';
//     default:
//       return 'success';
//   }
// };

// // Helper function to format date
// const formatDate = (dateString: string): string => {
//   const date = new Date(dateString);
//   return date.toLocaleDateString('en-US', {
//     month: 'short',
//     day: 'numeric',
//     year: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit',
//   });
// };

// export const ViewTenantModal = ({
//   isOpen,
//   onClose,
//   tenantId,
//   onLoadTenant,
// }: ViewTenantModalProps): ReactElement | null => {
//   const [tenant, setTenant] = useState<Tenant | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);

//   // Load tenant data when modal opens
//   useEffect(() => {
//     if (isOpen && tenantId) {
//       const loadTenant = async (): Promise<void> => {
//         try {
//           setIsLoading(true);
//           setError(null);
//           const data = await onLoadTenant(tenantId);
//           setTenant(data);
//         } catch (err: any) {
//           setError(err?.response?.data?.error?.message || 'Failed to load tenant details');
//         } finally {
//           setIsLoading(false);
//         }
//       };
//       loadTenant();
//     } else {
//       setTenant(null);
//       setError(null);
//     }
//   }, [isOpen, tenantId, onLoadTenant]);

//   return (
//     <Modal
//       isOpen={isOpen}
//       onClose={onClose}
//       title="View Tenant Details"
//       description="View tenant information"
//       maxWidth="lg"
//       footer={
//         <SecondaryButton type="button" onClick={onClose} className="px-4 py-2.5 text-sm">
//           Close
//         </SecondaryButton>
//       }
//     >
//       <div>
//         {isLoading && (
//           <div className="flex items-center justify-center py-12">
//             <Loader2 className="w-6 h-6 text-[#112868] animate-spin" />
//           </div>
//         )}

//         {error && (
//           <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md">
//             <p className="text-sm text-[#ef4444]">{error}</p>
//           </div>
//         )}

//         {!isLoading && !error && tenant && (
//           <div className="flex flex-col gap-6">
//             {/* Basic Information */}
//             <div className="flex flex-col gap-4">
//               <h3 className="text-sm font-semibold text-[#0e1b2a]">Basic Information</h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="text-xs font-medium text-[#6b7280] mb-1 block">Tenant Name</label>
//                   <p className="text-sm text-[#0e1b2a]">{tenant.name}</p>
//                 </div>
//                 <div>
//                   <label className="text-xs font-medium text-[#6b7280] mb-1 block">Slug</label>
//                   <p className="text-sm text-[#0e1b2a]">{tenant.slug}</p>
//                 </div>
//                 <div>
//                   <label className="text-xs font-medium text-[#6b7280] mb-1 block">Status</label>
//                   <div className="mt-1">
//                     <StatusBadge variant={getStatusVariant(tenant.status)}>
//                       {tenant.status}
//                     </StatusBadge>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Settings */}
//             <div className="flex flex-col gap-4">
//               <h3 className="text-sm font-semibold text-[#0e1b2a]">Settings</h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="text-xs font-medium text-[#6b7280] mb-1 block">Timezone</label>
//                   <p className="text-sm text-[#0e1b2a]">
//                     {tenant.settings?.timezone || 'N/A'}
//                   </p>
//                 </div>
//                 <div>
//                   <label className="text-xs font-medium text-[#6b7280] mb-1 block">Subscription Tier</label>
//                   <p className="text-sm text-[#0e1b2a]">
//                     {tenant.subscription_tier ? tenant.subscription_tier.charAt(0).toUpperCase() + tenant.subscription_tier.slice(1) : 'N/A'}
//                   </p>
//                 </div>
//                 <div>
//                   <label className="text-xs font-medium text-[#6b7280] mb-1 block">Max Users</label>
//                   <p className="text-sm text-[#0e1b2a]">{tenant.max_users ?? 'N/A'}</p>
//                 </div>
//                 <div>
//                   <label className="text-xs font-medium text-[#6b7280] mb-1 block">Max Modules</label>
//                   <p className="text-sm text-[#0e1b2a]">{tenant.max_modules ?? 'N/A'}</p>
//                 </div>
//               </div>
//             </div>

//             {/* Timestamps */}
//             <div className="flex flex-col gap-4">
//               <h3 className="text-sm font-semibold text-[#0e1b2a]">Timestamps</h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="text-xs font-medium text-[#6b7280] mb-1 block">Created At</label>
//                   <p className="text-sm text-[#0e1b2a]">{formatDate(tenant.created_at)}</p>
//                 </div>
//                 <div>
//                   <label className="text-xs font-medium text-[#6b7280] mb-1 block">Updated At</label>
//                   <p className="text-sm text-[#0e1b2a]">{formatDate(tenant.updated_at)}</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </Modal>
//   );
// };
