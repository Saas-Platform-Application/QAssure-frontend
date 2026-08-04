// import { useEffect, useState } from 'react';
// import type { ReactElement } from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { Modal, FormField, FormSelect, PrimaryButton, SecondaryButton, MultiselectPaginatedSelect } from '@/components/shared';
// import { moduleService } from '@/services/module-service';

// // Validation schema - matches backend validation
// const newTenantSchema = z.object({
//   name: z
//     .string()
//     .min(1, 'name is required')
//     .min(3, 'name must be at least 3 characters')
//     .max(100, 'name must be at most 100 characters'),
//   slug: z
//     .string()
//     .min(1, 'slug is required')
//     .min(3, 'slug must be at least 3 characters')
//     .max(100, 'slug must be at most 100 characters')
//     .regex(/^[a-z0-9-]+$/, 'slug format is invalid'),
//   status: z.enum(['active', 'suspended', 'deleted'], {
//     message: 'Status is required',
//   }),
//   settings: z.any().optional().nullable(),
//   subscription_tier: z.enum(['basic', 'professional', 'enterprise'], {
//     message: 'Invalid subscription tier',
//   }).optional().nullable(),
//   max_users: z.number().int().min(1, 'max_users must be at least 1').optional().nullable(),
//   max_modules: z.number().int().min(1, 'max_modules must be at least 1').optional().nullable(),
//   modules: z.array(z.string().uuid()).optional().nullable(),
// });

// type NewTenantFormData = z.infer<typeof newTenantSchema>;

// interface NewTenantModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onSubmit: (data: NewTenantFormData) => Promise<void>;
//   isLoading?: boolean;
// }

// const statusOptions = [
//   { value: 'active', label: 'Active' },
//   { value: 'suspended', label: 'Suspended' },
//   { value: 'deleted', label: 'Deleted' },
// ];

// const subscriptionTierOptions = [
//   { value: 'basic', label: 'Basic' },
//   { value: 'professional', label: 'Professional' },
//   { value: 'enterprise', label: 'Enterprise' },
// ];

// export const NewTenantModal = ({
//   isOpen,
//   onClose,
//   onSubmit,
//   isLoading = false,
// }: NewTenantModalProps): ReactElement | null => {
//   const [selectedModules, setSelectedModules] = useState<string[]>([]);

//   const {
//     register,
//     handleSubmit,
//     setValue,
//     watch,
//     reset,
//     setError,
//     clearErrors,
//     formState: { errors },
//   } = useForm<NewTenantFormData>({
//     resolver: zodResolver(newTenantSchema),
//     defaultValues: {
//       status: 'active',
//       settings: null,
//       subscription_tier: null,
//       max_users: null,
//       max_modules: null,
//       modules: [],
//     },
//   });

//   const statusValue = watch('status');
//   const subscriptionTierValue = watch('subscription_tier');

//   // Load modules for multiselect
//   const loadModules = async (page: number, limit: number) => {
//     const response = await moduleService.getRunningModules(page, limit);
//     return {
//       options: response.data.map((module) => ({
//         value: module.id,
//         label: module.name,
//       })),
//       pagination: response.pagination,
//     };
//   };

//   // Reset form when modal closes
//   useEffect(() => {
//     if (!isOpen) {
//       reset({
//         name: '',
//         slug: '',
//         status: 'active',
//         settings: null,
//         subscription_tier: null,
//         max_users: null,
//         max_modules: null,
//         modules: [],
//       });
//       setSelectedModules([]);
//       clearErrors();
//     }
//   }, [isOpen, reset, clearErrors]);

//   const handleFormSubmit = async (data: NewTenantFormData): Promise<void> => {
//     clearErrors();
//     try {
//       const { modules, ...restData } = data;
//       const submitData = {
//         ...restData,
//         module_ids: selectedModules.length > 0 ? selectedModules : undefined,
//       };
//       await onSubmit(submitData);
//     } catch (error: any) {
//       // Handle validation errors from API
//       if (error?.response?.data?.details && Array.isArray(error.response.data.details)) {
//         const validationErrors = error.response.data.details;
//         validationErrors.forEach((detail: { path: string; message: string }) => {
//           if (
//             detail.path === 'name' ||
//             detail.path === 'slug' ||
//             detail.path === 'status' ||
//             detail.path === 'settings' ||
//             detail.path === 'subscription_tier' ||
//             detail.path === 'max_users' ||
//             detail.path === 'max_modules' ||
//             detail.path === 'module_ids'
//           ) {
//             // Map module_ids error to modules field for display
//             const fieldPath = detail.path === 'module_ids' ? 'modules' : detail.path;
//             setError(fieldPath as keyof NewTenantFormData, {
//               type: 'server',
//               message: detail.message,
//             });
//           }
//         });
//       } else {
//         // Handle general errors
//         // Check for nested error object with message property
//         const errorObj = error?.response?.data?.error;
//         const errorMessage =
//           (typeof errorObj === 'object' && errorObj !== null && 'message' in errorObj ? errorObj.message : null) ||
//           (typeof errorObj === 'string' ? errorObj : null) ||
//           error?.response?.data?.message ||
//           error?.message ||
//           'Failed to create tenant. Please try again.';
//         setError('root', {
//           type: 'server',
//           message: typeof errorMessage === 'string' ? errorMessage : 'Failed to create tenant. Please try again.',
//         });
//       }
//     }
//   };

//   return (
//     <Modal
//       isOpen={isOpen}
//       onClose={onClose}
//       title="Create New Tenant"
//       description="Add a new organization to the platform"
//       maxWidth="md"
//       footer={
//         <>
//           <SecondaryButton
//             type="button"
//             onClick={onClose}
//             disabled={isLoading}
//             className="px-4 py-2.5 text-sm"
//           >
//             Cancel
//           </SecondaryButton>
//           <PrimaryButton
//             type="button"
//             onClick={handleSubmit(handleFormSubmit)}
//             disabled={isLoading}
//             size="default"
//             className="px-4 py-2.5 text-sm"
//           >
//             {isLoading ? 'Creating...' : 'Create Tenant'}
//           </PrimaryButton>
//         </>
//       }
//     >
//       <form onSubmit={handleSubmit(handleFormSubmit)}>
//         {/* General Error Display */}
//         {errors.root && (
//           <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
//             <p className="text-sm text-[#ef4444]">{errors.root.message}</p>
//           </div>
//         )}

//         <div className="flex flex-col gap-0">
//           {/* Tenant Name */}
//           <FormField
//             label="Tenant Name"
//             required
//             placeholder="Enter tenant name"
//             error={errors.name?.message}
//             {...register('name')}
//           />

//           {/* Slug */}
//           <FormField
//             label="Slug"
//             required
//             placeholder="Enter slug (lowercase, numbers, hyphens only)"
//             error={errors.slug?.message}
//             {...register('slug')}
//           />

//           {/* Status and Subscription Tier Row */}
//           <div className="flex gap-5">
//             <div className="flex-1">
//               <FormSelect
//                 label="Status"
//                 required
//                 placeholder="Select Status"
//                 options={statusOptions}
//                 value={statusValue}
//                 onValueChange={(value) => setValue('status', value as 'active' | 'suspended' | 'deleted')}
//                 error={errors.status?.message}
//               />
//             </div>
//             <div className="flex-1">
//               <FormSelect
//                 label="Subscription Tier"
//                 placeholder="Select Subscription"
//                 options={subscriptionTierOptions}
//                 value={subscriptionTierValue || ''}
//                 onValueChange={(value) => setValue('subscription_tier', value === '' ? null : value as 'basic' | 'professional' | 'enterprise')}
//                 error={errors.subscription_tier?.message}
//               />
//             </div>
//           </div>

//           {/* Max Users and Max Modules Row */}
//           <div className="flex gap-5">
//             <div className="flex-1">
//               <FormField
//                 label="Max Users"
//                 type="number"
//                 min="1"
//                 step="1"
//                 placeholder="Enter number"
//                 error={errors.max_users?.message}
//                 {...register('max_users', {
//                   setValueAs: (value) => {
//                     if (value === '' || value === null || value === undefined) return null;
//                     const num = Number(value);
//                     return isNaN(num) ? null : num;
//                   },
//                 })}
//               />
//             </div>
//             <div className="flex-1">
//               <FormField
//                 label="Max Modules"
//                 type="number"
//                 min="1"
//                 step="1"
//                 placeholder="Enter number"
//                 error={errors.max_modules?.message}
//                 {...register('max_modules', {
//                   setValueAs: (value) => {
//                     if (value === '' || value === null || value === undefined) return null;
//                     const num = Number(value);
//                     return isNaN(num) ? null : num;
//                   },
//                 })}
//               />
//             </div>
//           </div>

//           {/* Modules Multiselect */}
//           <MultiselectPaginatedSelect
//             label="Modules"
//             placeholder="Select modules"
//             value={selectedModules}
//             onValueChange={(values) => {
//               setSelectedModules(values);
//               setValue('modules', values.length > 0 ? values : []);
//             }}
//             onLoadOptions={loadModules}
//             error={errors.modules?.message}
//           />
//         </div>
//       </form>
//     </Modal>
//   );
// };
