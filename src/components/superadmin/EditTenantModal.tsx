// import { useEffect, useState, useRef } from 'react';
// import type { ReactElement } from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { Loader2, ChevronRight, ChevronLeft, Image as ImageIcon } from 'lucide-react';
// import { Modal, FormField, FormSelect, PrimaryButton, SecondaryButton, MultiselectPaginatedSelect } from '@/components/shared';
// import type { Tenant } from '@/types/tenant';
// import { moduleService } from '@/services/module-service';
// import { fileService } from '@/services/file-service';
// import { showToast } from '@/utils/toast';

// // Step 1: Tenant Details Schema
// const tenantDetailsSchema = z.object({
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
//   domain: z.string().optional().nullable(),
//   status: z.enum(['active', 'suspended', 'deleted'], {
//     message: 'Status is required',
//   }),
//   subscription_tier: z.enum(['basic', 'professional', 'enterprise'], {
//     message: 'Invalid subscription tier',
//   }).optional().nullable(),
//   max_users: z.number().int().min(1, 'max_users must be at least 1').optional().nullable(),
//   max_modules: z.number().int().min(1, 'max_modules must be at least 1').optional().nullable(),
//   modules: z.array(z.string().uuid()).optional().nullable(),
// });

// // Step 2: Contact Details Schema - NO password fields
// const contactDetailsSchema = z.object({
//   email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
//   first_name: z.string().min(1, 'First name is required'),
//   last_name: z.string().min(1, 'Last name is required'),
//     contact_phone: z
//       .string()
//       .optional()
//       .nullable()
//       .refine(
//         (val) => {
//           if (!val || val.trim() === '') return true; // Optional field, empty is valid
//           return /^\d{10}$/.test(val);
//         },
//         {
//           message: 'Phone number must be exactly 10 digits',
//         }
//       ),
//   address_line1: z.string().min(1, 'Address is required'),
//   address_line2: z.string().optional().nullable(),
//   city: z.string().min(1, 'City is required'),
//   state: z.string().min(1, 'State is required'),
//   postal_code: z
//     .string()
//     .min(1, 'Postal code is required')
//     .regex(/^[A-Za-z0-9\s\-]{3,10}$/, 'Postal code must be 3-10 characters (letters, numbers, spaces, or hyphens)'),
//   country: z.string().min(1, 'Country is required'),
// });

// // Step 3: Settings Schema
// const settingsSchema = z.object({
//   enable_sso: z.boolean(),
//   enable_2fa: z.boolean(),
//   primary_color: z.string().optional().nullable(),
//   secondary_color: z.string().optional().nullable(),
//   accent_color: z.string().optional().nullable(),
// });

// type TenantDetailsForm = z.infer<typeof tenantDetailsSchema>;
// type ContactDetailsForm = z.infer<typeof contactDetailsSchema>;
// type SettingsForm = z.infer<typeof settingsSchema>;

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

// interface EditTenantModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   tenantId: string | null;
//   onLoadTenant: (id: string) => Promise<Tenant>;
//   onSubmit: (id: string, data: any) => Promise<void>;
//   isLoading?: boolean;
// }

// export const EditTenantModal = ({
//   isOpen,
//   onClose,
//   tenantId,
//   onLoadTenant,
//   onSubmit,
//   isLoading = false,
// }: EditTenantModalProps): ReactElement | null => {
//   const [currentStep, setCurrentStep] = useState<number>(1);
//   const [isLoadingTenant, setIsLoadingTenant] = useState<boolean>(false);
//   const [loadError, setLoadError] = useState<string | null>(null);
//   const loadedTenantIdRef = useRef<string | null>(null);
//   const [selectedModules, setSelectedModules] = useState<string[]>([]);
//   const [initialModuleOptions, setInitialModuleOptions] = useState<Array<{ value: string; label: string }>>([]);

//   // File upload state for branding
//   const [logoFile, setLogoFile] = useState<File | null>(null);
//   const [faviconFile, setFaviconFile] = useState<File | null>(null);
//   // const [logoFilePath, setLogoFilePath] = useState<string | null>(null);
//   const [logoFileUrl, setLogoFileUrl] = useState<string | null>(null);
//   const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
//   // const [faviconFilePath, setFaviconFilePath] = useState<string | null>(null);
//   const [faviconFileUrl, setFaviconFileUrl] = useState<string | null>(null);
//   const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(null);
//   const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
//   const [isUploadingFavicon, setIsUploadingFavicon] = useState<boolean>(false);
//   const [logoError, setLogoError] = useState<string | null>(null);
//   const [faviconError, setFaviconError] = useState<string | null>(null);

//   // Form instances for each step
//   const tenantDetailsForm = useForm<TenantDetailsForm>({
//     resolver: zodResolver(tenantDetailsSchema),
//     defaultValues: {
//       name: '',
//       slug: '',
//       domain: '',
//       status: 'active',
//       subscription_tier: null,
//       max_users: null,
//       max_modules: null,
//       modules: [],
//     },
//   });

//   const contactDetailsForm = useForm<ContactDetailsForm>({
//     resolver: zodResolver(contactDetailsSchema),
//     defaultValues: {
//       email: '',
//       first_name: '',
//       last_name: '',
//       contact_phone: '',
//       address_line1: '',
//       address_line2: '',
//       city: '',
//       state: '',
//       postal_code: '',
//       country: '',
//     },
//   });

//   const settingsForm = useForm<SettingsForm>({
//     resolver: zodResolver(settingsSchema),
//     defaultValues: {
//       enable_sso: false,
//       enable_2fa: false,
//       primary_color: '#112868',
//       secondary_color: '#23DCE1',
//       accent_color: '#084CC8',
//     },
//   });

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

//   // Load tenant data when modal opens
//   useEffect(() => {
//     if (isOpen && tenantId) {
//       if (loadedTenantIdRef.current !== tenantId) {
//         const loadTenant = async (): Promise<void> => {
//           try {
//             setIsLoadingTenant(true);
//             setLoadError(null);
//             const tenant = await onLoadTenant(tenantId);
//             loadedTenantIdRef.current = tenantId;

//             // Extract contact info from settings
//             const contactInfo = (tenant.settings as any)?.contact || {};
            
//             // Extract branding from settings or direct tenant fields
//             const branding = (tenant.settings as any)?.branding || {};
//             const primaryColor = tenant.primary_color || branding.primary_color || '#112868';
//             const secondaryColor = tenant.secondary_color || branding.secondary_color || '#23DCE1';
//             const accentColor = tenant.accent_color || branding.accent_color || '#084CC8';
//             const logoPath = tenant.logo_file_path || branding.logo_file_path || null;
//             const faviconPath = tenant.favicon_file_path || branding.favicon_file_path || null;

//             // Set file paths and URLs if they exist
//             if (logoPath) {
//               // setLogoFilePath(logoPath);
//               // Construct URL from file path
//               const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
//               const baseUrl = apiBaseUrl.replace('/api/v1', '');
//               setLogoFileUrl(logoPath.startsWith('http') ? logoPath : `${baseUrl}/uploads/${logoPath}`);
//               setLogoError(null); // Clear error if existing logo is found
//             }
//             if (faviconPath) {
//               // setFaviconFilePath(faviconPath);
//               const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
//               const baseUrl = apiBaseUrl.replace('/api/v1', '');
//               setFaviconFileUrl(faviconPath.startsWith('http') ? faviconPath : `${baseUrl}/uploads/${faviconPath}`);
//               setFaviconError(null); // Clear error if existing favicon is found
//             }

//             // Validate subscription_tier
//             const validSubscriptionTier =
//               tenant.subscription_tier === 'basic' ||
//               tenant.subscription_tier === 'professional' ||
//               tenant.subscription_tier === 'enterprise'
//                 ? tenant.subscription_tier
//                 : null;

//             // Extract module IDs
//             const tenantModules = tenant.assignedModules
//               ? tenant.assignedModules.map((module) => module.id)
//               : tenant.modules || [];

//             // Create initial options from assignedModules
//             const initialOptions = tenant.assignedModules
//               ? tenant.assignedModules.map((module) => ({
//                   value: module.id,
//                   label: module.name,
//                 }))
//               : [];

//             setSelectedModules(tenantModules);
//             setInitialModuleOptions(initialOptions);

//             // Reset forms with tenant data
//             tenantDetailsForm.reset({
//               name: tenant.name,
//               slug: tenant.slug,
//               domain: tenant.domain || '',
//               status: tenant.status,
//               subscription_tier: validSubscriptionTier,
//               max_users: tenant.max_users,
//               max_modules: tenant.max_modules,
//               modules: tenantModules,
//             });

//             contactDetailsForm.reset({
//               email: contactInfo.email || '',
//               first_name: contactInfo.first_name || '',
//               last_name: contactInfo.last_name || '',
//               contact_phone: contactInfo.contact_phone || '',
//               address_line1: contactInfo.address_line1 || '',
//               address_line2: contactInfo.address_line2 || '',
//               city: contactInfo.city || '',
//               state: contactInfo.state || '',
//               postal_code: contactInfo.postal_code || '',
//               country: contactInfo.country || '',
//             });

//             settingsForm.reset({
//               enable_sso: tenant.enable_sso || false,
//               enable_2fa: tenant.enable_2fa || false,
//               primary_color: primaryColor,
//               secondary_color: secondaryColor,
//               accent_color: accentColor,
//             });

//             setCurrentStep(1);
//           } catch (err: any) {
//             setLoadError(err?.response?.data?.error?.message || 'Failed to load tenant details');
//           } finally {
//             setIsLoadingTenant(false);
//           }
//         };
//         loadTenant();
//       }
//     } else if (!isOpen) {
//       loadedTenantIdRef.current = null;
//       setSelectedModules([]);
//       setInitialModuleOptions([]);
//       setCurrentStep(1);
//       setLogoFile(null);
//       setFaviconFile(null);
//       // setLogoFilePath(null);
//       setLogoFileUrl(null);
//       setLogoPreviewUrl(null);
//       // setFaviconFilePath(null);
//       setFaviconFileUrl(null);
//       setFaviconPreviewUrl(null);
//       tenantDetailsForm.reset();
//       contactDetailsForm.reset();
//       settingsForm.reset();
//       setLoadError(null);
//     }
//   }, [isOpen, tenantId, onLoadTenant, tenantDetailsForm, contactDetailsForm, settingsForm]);

//   const handleNext = async (): Promise<void> => {
//     if (currentStep === 1) {
//       const isValid = await tenantDetailsForm.trigger();
//       if (isValid) {
//         setCurrentStep(2);
//       }
//     } else if (currentStep === 2) {
//       const isValid = await contactDetailsForm.trigger();
//       if (isValid) {
//         setCurrentStep(3);
//       }
//     }
//   };

//   const handlePrevious = (): void => {
//     if (currentStep > 1) {
//       setCurrentStep(currentStep - 1);
//     }
//   };

//   const handleFormSubmit = async (): Promise<void> => {
//     if (!tenantId) return;

//     const isValid = await settingsForm.trigger();
//     if (!isValid) return;

//     // Validate logo and favicon are uploaded
//     setLogoError(null);
//     setFaviconError(null);
    
//     if (!logoFileUrl && !logoFile) {
//       setLogoError('Logo is required');
//       setCurrentStep(3); // Go to settings step where logo/favicon are
//       return;
//     }
    
//     if (!faviconFileUrl && !faviconFile) {
//       setFaviconError('Favicon is required');
//       setCurrentStep(3); // Go to settings step where logo/favicon are
//       return;
//     }

//     try {
//       const tenantDetails = tenantDetailsForm.getValues();
//       const contactDetails = contactDetailsForm.getValues();
//       const settings = settingsForm.getValues();

//       const { modules, ...restTenantDetails } = tenantDetails;
//       const { enable_sso, enable_2fa, primary_color, secondary_color, accent_color } = settings;

//       const tenantData = {
//         ...restTenantDetails,
//         module_ids: selectedModules.length > 0 ? selectedModules : undefined,
//         settings: {
//           enable_sso,
//           enable_2fa,
//           contact: contactDetails,
//           branding: {
//             primary_color: primary_color || undefined,
//             secondary_color: secondary_color || undefined,
//             accent_color: accent_color || undefined,
//             logo_file_path: logoFileUrl || undefined,
//             favicon_file_path: faviconFileUrl || undefined,
//           },
//         },
//       };

//       await onSubmit(tenantId, tenantData);
//     } catch (error: any) {
//       // Handle validation errors from API
//       if (error?.response?.data?.details && Array.isArray(error.response.data.details)) {
//         const validationErrors = error.response.data.details;
//         validationErrors.forEach((detail: { path: string; message: string }) => {
//           if (
//             detail.path === 'name' ||
//             detail.path === 'slug' ||
//             detail.path === 'status' ||
//             detail.path === 'subscription_tier' ||
//             detail.path === 'max_users' ||
//             detail.path === 'max_modules' ||
//             detail.path === 'module_ids'
//           ) {
//             const fieldPath = detail.path === 'module_ids' ? 'modules' : detail.path;
//             tenantDetailsForm.setError(fieldPath as keyof TenantDetailsForm, {
//               type: 'server',
//               message: detail.message,
//             });
//           } else if (
//             detail.path === 'email' ||
//             detail.path === 'first_name' ||
//             detail.path === 'last_name' ||
//             detail.path === 'contact_phone' ||
//             detail.path === 'address_line1' ||
//             detail.path === 'city' ||
//             detail.path === 'state' ||
//             detail.path === 'postal_code' ||
//             detail.path === 'country'
//           ) {
//             contactDetailsForm.setError(detail.path as keyof ContactDetailsForm, {
//               type: 'server',
//               message: detail.message,
//             });
//           }
//         });
//       } else {
//         const errorObj = error?.response?.data?.error;
//         const errorMessage =
//           (typeof errorObj === 'object' && errorObj !== null && 'message' in errorObj ? errorObj.message : null) ||
//           (typeof errorObj === 'string' ? errorObj : null) ||
//           error?.response?.data?.message ||
//           error?.message ||
//           'Failed to update tenant. Please try again.';
//         tenantDetailsForm.setError('root', {
//           type: 'server',
//           message: typeof errorMessage === 'string' ? errorMessage : 'Failed to update tenant. Please try again.',
//         });
//       }
//     }
//   };

//   const steps = [
//     {
//       number: 1,
//       title: 'Tenant Details',
//       description: 'Basic organization information',
//       isActive: currentStep === 1,
//       isCompleted: currentStep > 1,
//     },
//     {
//       number: 2,
//       title: 'Contact Details',
//       description: 'Primary contact & address',
//       isActive: currentStep === 2,
//       isCompleted: currentStep > 2,
//     },
//     {
//       number: 3,
//       title: 'Settings',
//       description: 'Security & branding',
//       isActive: currentStep === 3,
//       isCompleted: false,
//     },
//   ];

//   if (!isOpen) return null;

//   return (
//     <Modal
//       isOpen={isOpen}
//       onClose={onClose}
//       title="Edit Tenant"
//       description="Update tenant information"
//       maxWidth="2xl"
//       footer={null}
//     >
//       <div className="p-6">
//         {isLoadingTenant && (
//           <div className="flex items-center justify-center py-12">
//             <Loader2 className="w-6 h-6 text-[#112868] animate-spin" />
//           </div>
//         )}

//         {loadError && (
//           <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
//             <p className="text-sm text-[#ef4444]">{loadError}</p>
//           </div>
//         )}

//         {!isLoadingTenant && (
//           <div className="flex flex-col lg:flex-row gap-4">
//             {/* Steps Sidebar */}
//             <div className="w-full lg:w-[260px] bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-5">
//               <div className="mb-4">
//                 <h3 className="text-xs font-medium text-[#6b7280] uppercase tracking-wide">Steps</h3>
//               </div>
//               <div className="flex flex-col gap-2">
//                 {steps.map((step) => (
//                   <div
//                     key={step.number}
//                     className={`flex gap-2.5 items-center px-3 py-2 rounded-md ${
//                       step.isActive ? 'bg-[#f5f7fa]' : ''
//                     }`}
//                   >
//                     <div
//                       className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
//                         step.isActive
//                           ? 'bg-[#23dce1] border border-[#23dce1] text-[#112868]'
//                           : step.isCompleted
//                           ? 'bg-[#23dce1] border border-[#23dce1] text-[#112868]'
//                           : 'bg-white border border-[rgba(0,0,0,0.08)] text-[#6b7280]'
//                       }`}
//                     >
//                       {step.number}
//                     </div>
//                     <div className="flex-1">
//                       <div
//                         className={`text-sm font-medium ${
//                           step.isActive ? 'text-[#0f1724]' : 'text-[#0f1724]'
//                         }`}
//                       >
//                         {step.title}
//                       </div>
//                       <div className="text-xs text-[#6b7280]">{step.description}</div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Main Content */}
//             <div className="flex-1 bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-4">
//               {/* Step 1: Tenant Details */}
//               {currentStep === 1 && (
//                 <div className="space-y-4">
//                   <div className="pb-4 border-b border-[rgba(0,0,0,0.08)]">
//                     <h2 className="text-lg font-semibold text-[#0f1724]">Tenant Details</h2>
//                     <p className="text-sm text-[#6b7280] mt-1">Basic information for the organization.</p>
//                   </div>
//                   {tenantDetailsForm.formState.errors.root && (
//                     <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
//                       <p className="text-sm text-[#ef4444]">{tenantDetailsForm.formState.errors.root.message}</p>
//                     </div>
//                   )}

//                   <div className="space-y-4">
//                     <FormField
//                       label="Tenant Name"
//                       required
//                       placeholder="Enter tenant name"
//                       error={tenantDetailsForm.formState.errors.name?.message}
//                       {...tenantDetailsForm.register('name')}
//                     />
//                     <FormField
//                       label="Slug"
//                       required
//                       placeholder="Enter slug (lowercase, numbers, hyphens only)"
//                       error={tenantDetailsForm.formState.errors.slug?.message}
//                       {...tenantDetailsForm.register('slug')}
//                     />
//                     <FormField
//                       label="Domain"
//                       placeholder="Enter domain"
//                       error={tenantDetailsForm.formState.errors.domain?.message}
//                       {...tenantDetailsForm.register('domain')}
//                     />
//                     <div className="flex gap-5">
//                       <div className="flex-1">
//                         <FormSelect
//                           label="Status"
//                           required
//                           placeholder="Select Status"
//                           options={statusOptions}
//                           value={tenantDetailsForm.watch('status')}
//                           onValueChange={(value) =>
//                             tenantDetailsForm.setValue('status', value as 'active' | 'suspended' | 'deleted')
//                           }
//                           error={tenantDetailsForm.formState.errors.status?.message}
//                         />
//                       </div>
//                       <div className="flex-1">
//                         <FormSelect
//                           label="Subscription Tier"
//                           placeholder="Select Subscription"
//                           options={subscriptionTierOptions}
//                           value={tenantDetailsForm.watch('subscription_tier') || ''}
//                           onValueChange={(value) =>
//                             tenantDetailsForm.setValue(
//                               'subscription_tier',
//                               value === '' ? null : (value as 'basic' | 'professional' | 'enterprise')
//                             )
//                           }
//                           error={tenantDetailsForm.formState.errors.subscription_tier?.message}
//                         />
//                       </div>
//                     </div>
//                     <div className="flex gap-5">
//                       <div className="flex-1">
//                         <FormField
//                           label="Max Users"
//                           type="number"
//                           min="1"
//                           step="1"
//                           placeholder="Enter number"
//                           error={tenantDetailsForm.formState.errors.max_users?.message}
//                           {...tenantDetailsForm.register('max_users', {
//                             setValueAs: (value) => {
//                               if (value === '' || value === null || value === undefined) return null;
//                               const num = Number(value);
//                               return isNaN(num) ? null : num;
//                             },
//                           })}
//                         />
//                       </div>
//                       <div className="flex-1">
//                         <FormField
//                           label="Max Modules"
//                           type="number"
//                           min="1"
//                           step="1"
//                           placeholder="Enter number"
//                           error={tenantDetailsForm.formState.errors.max_modules?.message}
//                           {...tenantDetailsForm.register('max_modules', {
//                             setValueAs: (value) => {
//                               if (value === '' || value === null || value === undefined) return null;
//                               const num = Number(value);
//                               return isNaN(num) ? null : num;
//                             },
//                           })}
//                         />
//                       </div>
//                     </div>
//                     <MultiselectPaginatedSelect
//                       label="Modules"
//                       placeholder="Select modules"
//                       value={selectedModules}
//                       onValueChange={(values) => {
//                         setSelectedModules(values);
//                         tenantDetailsForm.setValue('modules', values.length > 0 ? values : []);
//                       }}
//                       onLoadOptions={loadModules}
//                       initialOptions={initialModuleOptions}
//                       error={tenantDetailsForm.formState.errors.modules?.message}
//                     />
//                   </div>
//                 </div>
//               )}

//               {/* Step 2: Contact Details - NO PASSWORD FIELDS */}
//               {currentStep === 2 && (
//                 <div className="space-y-4">
//                   <div className="pb-4 border-b border-[rgba(0,0,0,0.08)]">
//                     <h2 className="text-lg font-semibold text-[#0f1724]">Contact Details</h2>
//                     <p className="text-sm text-[#6b7280] mt-1">Contact information for the main account administrator.</p>
//                   </div>
//                   {contactDetailsForm.formState.errors.root && (
//                     <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
//                       <p className="text-sm text-[#ef4444]">{contactDetailsForm.formState.errors.root.message}</p>
//                     </div>
//                   )}
//                   <div className="space-y-4">
//                     <div className="border-b border-dashed border-[rgba(0,0,0,0.08)] pb-4">
//                       <FormField
//                         label="Email"
//                         type="email"
//                         required
//                         placeholder="Enter email address"
//                         error={contactDetailsForm.formState.errors.email?.message}
//                         {...contactDetailsForm.register('email')}
//                       />
//                       <div className="grid grid-cols-2 gap-5 mt-4">
//                         <FormField
//                           label="First Name"
//                           required
//                           placeholder="Enter first name"
//                           error={contactDetailsForm.formState.errors.first_name?.message}
//                           {...contactDetailsForm.register('first_name')}
//                         />
//                         <FormField
//                           label="Last Name"
//                           required
//                           placeholder="Enter last name"
//                           error={contactDetailsForm.formState.errors.last_name?.message}
//                           {...contactDetailsForm.register('last_name')}
//                         />
//                       </div>
//                       <div className="mt-4">
//                         <FormField
//                           label="Contact Phone"
//                           type="tel"
//                           placeholder="Enter 10-digit phone number"
//                           maxLength={10}
//                           error={contactDetailsForm.formState.errors.contact_phone?.message}
//                           {...contactDetailsForm.register('contact_phone', {
//                             onChange: (e) => {
//                               // Only allow digits and limit to 10 characters
//                               const value = e.target.value.replace(/\D/g, '').slice(0, 10);
//                               contactDetailsForm.setValue('contact_phone', value, { shouldValidate: true });
//                             },
//                           })}
//                         />
//                       </div>
//                     </div>
//                     <div className="border-b border-dashed border-[rgba(0,0,0,0.08)] pb-4">
//                       <h3 className="text-sm font-medium text-[#0f1724] mb-4">Organization Address</h3>
//                       <div className="space-y-4">
//                         <FormField
//                           label="Address Line 1"
//                           required
//                           placeholder="Enter address line 1"
//                           error={contactDetailsForm.formState.errors.address_line1?.message}
//                           {...contactDetailsForm.register('address_line1')}
//                         />
//                         <FormField
//                           label="Address Line 2"
//                           placeholder="Enter address line 2 (optional)"
//                           error={contactDetailsForm.formState.errors.address_line2?.message}
//                           {...contactDetailsForm.register('address_line2')}
//                         />
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                           <FormField
//                             label="City"
//                             required
//                             placeholder="Enter city"
//                             error={contactDetailsForm.formState.errors.city?.message}
//                             {...contactDetailsForm.register('city')}
//                           />
//                           <FormField
//                             label="State"
//                             required
//                             placeholder="Enter state"
//                             error={contactDetailsForm.formState.errors.state?.message}
//                             {...contactDetailsForm.register('state')}
//                           />
//                         </div>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                           <FormField
//                             label="Postal Code"
//                             required
//                             placeholder="Enter postal code"
//                             error={contactDetailsForm.formState.errors.postal_code?.message}
//                             {...contactDetailsForm.register('postal_code')}
//                           />
//                           <FormField
//                             label="Country"
//                             required
//                             placeholder="Enter country"
//                             error={contactDetailsForm.formState.errors.country?.message}
//                             {...contactDetailsForm.register('country')}
//                           />
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Step 3: Settings with Branding */}
//               {currentStep === 3 && (
//                 <div className="space-y-6">
//                   <div className="pb-4 border-b border-[rgba(0,0,0,0.08)]">
//                     <h2 className="text-lg font-semibold text-[#0f1724]">Configuration & Limits</h2>
//                     <p className="text-sm text-[#6b7280] mt-1">Set resource limits and security preferences for this tenant.</p>
//                   </div>

//                   {/* Branding Section */}
//                   <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-4 md:p-6 flex flex-col gap-4">
//                     <div className="flex flex-col gap-1">
//                       <h3 className="text-base font-semibold text-[#0f1724]">Branding</h3>
//                       <p className="text-sm font-normal text-[#9ca3af]">
//                         Customize logo, favicon, and colors for this tenant experience.
//                       </p>
//                     </div>

//                     {/* Logo and Favicon Upload */}
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//                       {/* Company Logo */}
//                       <div className="flex flex-col gap-2">
//                         <label className="text-sm font-medium text-[#0f1724]">
//                           Company Logo <span className="text-[#e02424] text-[8px]">*</span>
//                         </label>
//                         {logoError && (
//                           <p className="text-sm text-[#ef4444]">{logoError}</p>
//                         )}
//                         <label
//                           htmlFor="logo-upload-edit"
//                           className="bg-[#f5f7fa] border border-dashed border-[#d1d5db] rounded-md p-4 flex gap-4 items-center cursor-pointer hover:bg-[#e5e7eb] transition-colors"
//                         >
//                           <div className="bg-white border border-[#d1d5db] rounded-lg size-12 flex items-center justify-center shrink-0">
//                             <ImageIcon className="w-5 h-5 text-[#6b7280]" />
//                           </div>
//                           <div className="flex flex-col gap-0.5 flex-1 min-w-0">
//                             <span className="text-sm font-medium text-[#0f1724]">Upload Logo</span>
//                             <span className="text-xs font-normal text-[#9ca3af]">PNG, SVG, JPG up to 2MB.</span>
//                           </div>
//                           <input
//                             id="logo-upload-edit"
//                             type="file"
//                             accept="image/png,image/svg+xml,image/jpeg,image/jpg"
//                             onChange={async (e) => {
//                               const file = e.target.files?.[0];
//                               if (file) {
//                                 if (file.size > 2 * 1024 * 1024) {
//                                   showToast.error('Logo file size must be less than 2MB');
//                                   return;
//                                 }
//                                 const validTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg'];
//                                 if (!validTypes.includes(file.type)) {
//                                   showToast.error('Logo must be PNG, SVG, or JPG format');
//                                   return;
//                                 }
//                                 if (logoPreviewUrl) {
//                                   URL.revokeObjectURL(logoPreviewUrl);
//                                 }
//                                 const previewUrl = URL.createObjectURL(file);
//                                 setLogoFile(file);
//                                 setLogoPreviewUrl(previewUrl);
//                                 setIsUploadingLogo(true);
//                                 try {
//                                   const response = await fileService.uploadSimple(file);
//                                   // setLogoFilePath(response.data.file_url);
//                                   setLogoFileUrl(response.data.file_url);
//                                   setLogoError(null); // Clear error on successful upload
//                                   showToast.success('Logo uploaded successfully');
//                                 } catch (err: any) {
//                                   const errorMessage =
//                                     err?.response?.data?.error?.message ||
//                                     err?.response?.data?.message ||
//                                     err?.message ||
//                                     'Failed to upload logo. Please try again.';
//                                   showToast.error(errorMessage);
//                                   setLogoFile(null);
//                                   URL.revokeObjectURL(previewUrl);
//                                   setLogoPreviewUrl(null);
//                                   setLogoFileUrl(null);
//                                   // setLogoFilePath(null);
//                                 } finally {
//                                   setIsUploadingLogo(false);
//                                 }
//                               }
//                             }}
//                             className="hidden"
//                           />
//                         </label>
//                         {logoFile && (
//                           <div className="flex flex-col gap-2 mt-1">
//                             <div className="text-xs text-[#6b7280]">
//                               {isUploadingLogo ? 'Uploading...' : `Selected: ${logoFile.name}`}
//                             </div>
//                             {(logoPreviewUrl || logoFileUrl) && (
//                               <div className="mt-2">
//                                 <img
//                                   key={logoPreviewUrl || logoFileUrl}
//                                   src={logoPreviewUrl || logoFileUrl || ''}
//                                   alt="Logo preview"
//                                   className="max-w-full h-20 object-contain border border-[#d1d5db] rounded-md p-2 bg-white"
//                                   style={{ display: 'block', maxHeight: '80px' }}
//                                   onError={(e) => {
//                                     console.error('Failed to load logo preview image', {
//                                       logoFileUrl,
//                                       logoPreviewUrl,
//                                       src: e.currentTarget.src,
//                                     });
//                                   }}
//                                   onLoad={() => {
//                                     console.log('Logo preview loaded successfully', {
//                                       logoFileUrl,
//                                       logoPreviewUrl,
//                                       src: logoFileUrl || logoPreviewUrl,
//                                     });
//                                   }}
//                                 />
//                               </div>
//                             )}
//                           </div>
//                         )}
//                         {!logoFile && logoFileUrl && (
//                           <div className="mt-2">
//                             <img
//                               src={logoFileUrl}
//                               alt="Current logo"
//                               className="max-w-full h-20 object-contain border border-[#d1d5db] rounded-md p-2 bg-white"
//                               style={{ display: 'block', maxHeight: '80px' }}
//                             />
//                           </div>
//                         )}
//                       </div>

//                       {/* Favicon */}
//                       <div className="flex flex-col gap-2">
//                         <label className="text-sm font-medium text-[#0f1724]">
//                           Favicon <span className="text-[#e02424] text-[8px]">*</span>
//                         </label>
//                         {faviconError && (
//                           <p className="text-sm text-[#ef4444]">{faviconError}</p>
//                         )}
//                         <label
//                           htmlFor="favicon-upload-edit"
//                           className="bg-[#f5f7fa] border border-dashed border-[#d1d5db] rounded-md p-4 flex gap-4 items-center cursor-pointer hover:bg-[#e5e7eb] transition-colors"
//                         >
//                           <div className="bg-white border border-[#d1d5db] rounded-lg size-12 flex items-center justify-center shrink-0">
//                             <ImageIcon className="w-5 h-5 text-[#6b7280]" />
//                           </div>
//                           <div className="flex flex-col gap-0.5 flex-1 min-w-0">
//                             <span className="text-sm font-medium text-[#0f1724]">Upload Favicon</span>
//                             <span className="text-xs font-normal text-[#9ca3af]">ICO or PNG up to 500KB.</span>
//                           </div>
//                           <input
//                             id="favicon-upload-edit"
//                             type="file"
//                             accept="image/x-icon,image/png,image/vnd.microsoft.icon"
//                             onChange={async (e) => {
//                               const file = e.target.files?.[0];
//                               if (file) {
//                                 if (file.size > 500 * 1024) {
//                                   showToast.error('Favicon file size must be less than 500KB');
//                                   return;
//                                 }
//                                 const validTypes = ['image/x-icon', 'image/png', 'image/vnd.microsoft.icon'];
//                                 if (!validTypes.includes(file.type)) {
//                                   showToast.error('Favicon must be ICO or PNG format');
//                                   return;
//                                 }
//                                 if (faviconPreviewUrl) {
//                                   URL.revokeObjectURL(faviconPreviewUrl);
//                                 }
//                                 const previewUrl = URL.createObjectURL(file);
//                                 setFaviconFile(file);
//                                 setFaviconPreviewUrl(previewUrl);
//                                 setIsUploadingFavicon(true);
//                                 try {
//                                   const response = await fileService.uploadSimple(file);
//                                   // setFaviconFilePath(response.data.file_url);
//                                   setFaviconFileUrl(response.data.file_url);
//                                   setFaviconError(null); // Clear error on successful upload
//                                   showToast.success('Favicon uploaded successfully');
//                                 } catch (err: any) {
//                                   const errorMessage =
//                                     err?.response?.data?.error?.message ||
//                                     err?.response?.data?.message ||
//                                     err?.message ||
//                                     'Failed to upload favicon. Please try again.';
//                                   showToast.error(errorMessage);
//                                   setFaviconFile(null);
//                                   URL.revokeObjectURL(previewUrl);
//                                   setFaviconPreviewUrl(null);
//                                   setFaviconFileUrl(null);
//                                   // setFaviconFilePath(null);
//                                 } finally {
//                                   setIsUploadingFavicon(false);
//                                 }
//                               }
//                             }}
//                             className="hidden"
//                           />
//                         </label>
//                         {faviconFile && (
//                           <div className="flex flex-col gap-2 mt-1">
//                             <div className="text-xs text-[#6b7280]">
//                               {isUploadingFavicon ? 'Uploading...' : `Selected: ${faviconFile.name}`}
//                             </div>
//                             {(faviconPreviewUrl || faviconFileUrl) && (
//                               <div className="mt-2">
//                                 <img
//                                   key={faviconFileUrl || faviconPreviewUrl}
//                                   src={faviconFileUrl || faviconPreviewUrl || ''}
//                                   alt="Favicon preview"
//                                   className="w-16 h-16 object-contain border border-[#d1d5db] rounded-md p-2 bg-white"
//                                   style={{ display: 'block', width: '64px', height: '64px' }}
//                                   onError={(e) => {
//                                     console.error('Failed to load favicon preview image', {
//                                       faviconFileUrl,
//                                       faviconPreviewUrl,
//                                       src: e.currentTarget.src,
//                                     });
//                                   }}
//                                   onLoad={() => {
//                                     console.log('Favicon preview loaded successfully', {
//                                       faviconFileUrl,
//                                       faviconPreviewUrl,
//                                       src: faviconFileUrl || faviconPreviewUrl,
//                                     });
//                                   }}
//                                 />
//                               </div>
//                             )}
//                           </div>
//                         )}
//                         {!faviconFile && faviconFileUrl && (
//                           <div className="mt-2">
//                             <img
//                               src={faviconFileUrl}
//                               alt="Current favicon"
//                               className="w-16 h-16 object-contain border border-[#d1d5db] rounded-md p-2 bg-white"
//                               style={{ display: 'block', width: '64px', height: '64px' }}
//                             />
//                           </div>
//                         )}
//                       </div>
//                     </div>

//                     {/* Primary Color */}
//                     <div className="flex flex-col gap-2">
//                       <label className="text-sm font-medium text-[#0f1724]">Primary Color</label>
//                       <div className="flex gap-3 items-center">
//                         <div
//                           className="border border-[#d1d5db] rounded-md size-10 shrink-0"
//                           style={{ backgroundColor: settingsForm.watch('primary_color') || '#112868' }}
//                         />
//                         <div className="flex-1">
//                           <input
//                             type="text"
//                             value={settingsForm.watch('primary_color') || '#112868'}
//                             onChange={(e) => settingsForm.setValue('primary_color', e.target.value)}
//                             className="bg-[#f5f7fa] border border-[#d1d5db] h-10 px-3 py-1 rounded-md text-sm text-[#0f1724] w-full focus:outline-none focus:ring-2 focus:ring-[#112868] focus:border-transparent"
//                             placeholder="#112868"
//                           />
//                         </div>
//                         <input
//                           type="color"
//                           value={settingsForm.watch('primary_color') || '#112868'}
//                           onChange={(e) => settingsForm.setValue('primary_color', e.target.value)}
//                           className="size-10 rounded-md border border-[#d1d5db] cursor-pointer"
//                         />
//                       </div>
//                       <p className="text-xs font-normal text-[#9ca3af]">Used for navigation, headers, and key actions.</p>
//                     </div>

//                     {/* Secondary and Accent Colors */}
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//                       <div className="flex flex-col gap-2">
//                         <label className="text-sm font-medium text-[#0f1724]">Secondary Color</label>
//                         <div className="flex gap-3 items-center">
//                           <div
//                             className="border border-[#d1d5db] rounded-md size-10 shrink-0"
//                             style={{ backgroundColor: settingsForm.watch('secondary_color') || '#23DCE1' }}
//                           />
//                           <div className="flex-1">
//                             <input
//                               type="text"
//                               value={settingsForm.watch('secondary_color') || '#23DCE1'}
//                               onChange={(e) => settingsForm.setValue('secondary_color', e.target.value)}
//                               className="bg-[#f5f7fa] border border-[#d1d5db] h-10 px-3 py-1 rounded-md text-sm text-[#0f1724] w-full focus:outline-none focus:ring-2 focus:ring-[#112868] focus:border-transparent"
//                               placeholder="#23DCE1"
//                             />
//                           </div>
//                           <input
//                             type="color"
//                             value={settingsForm.watch('secondary_color') || '#23DCE1'}
//                             onChange={(e) => settingsForm.setValue('secondary_color', e.target.value)}
//                             className="size-10 rounded-md border border-[#d1d5db] cursor-pointer"
//                           />
//                         </div>
//                         <p className="text-xs font-normal text-[#9ca3af]">Used for highlights and supporting elements.</p>
//                       </div>

//                       <div className="flex flex-col gap-2">
//                         <label className="text-sm font-medium text-[#0f1724]">Accent Color</label>
//                         <div className="flex gap-3 items-center">
//                           <div
//                             className="border border-[#d1d5db] rounded-md size-10 shrink-0"
//                             style={{ backgroundColor: settingsForm.watch('accent_color') || '#084CC8' }}
//                           />
//                           <div className="flex-1">
//                             <input
//                               type="text"
//                               value={settingsForm.watch('accent_color') || '#084CC8'}
//                               onChange={(e) => settingsForm.setValue('accent_color', e.target.value)}
//                               className="bg-[#f5f7fa] border border-[#d1d5db] h-10 px-3 py-1 rounded-md text-sm text-[#0f1724] w-full focus:outline-none focus:ring-2 focus:ring-[#112868] focus:border-transparent"
//                               placeholder="#084CC8"
//                             />
//                           </div>
//                           <input
//                             type="color"
//                             value={settingsForm.watch('accent_color') || '#084CC8'}
//                             onChange={(e) => settingsForm.setValue('accent_color', e.target.value)}
//                             className="size-10 rounded-md border border-[#d1d5db] cursor-pointer"
//                           />
//                         </div>
//                         <p className="text-xs font-normal text-[#9ca3af]">Used for alerts and special notices.</p>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Security Settings */}
//                   <div className="space-y-4">
//                     <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-md p-4 flex items-center justify-between">
//                       <div>
//                         <h4 className="text-xs font-medium text-[#0f1724] mb-1">Enable Single Sign-On (SSO)</h4>
//                         <p className="text-[10px] text-[#6b7280]">
//                           Allow users to log in using their organization's identity provider.
//                         </p>
//                       </div>
//                       <label className="relative inline-flex items-center cursor-pointer">
//                         <input
//                           type="checkbox"
//                           {...settingsForm.register('enable_sso')}
//                           className="sr-only peer"
//                           checked={settingsForm.watch('enable_sso')}
//                         />
//                         <div
//                           className={`w-10 h-5 rounded-full transition-colors ${
//                             settingsForm.watch('enable_sso') ? 'bg-[#23dce1]' : 'bg-[#c0c8e6]'
//                           }`}
//                         >
//                           <div
//                             className={`absolute top-[2px] left-[2px] bg-white rounded-full h-4 w-4 transition-transform ${
//                               settingsForm.watch('enable_sso') ? 'translate-x-5' : 'translate-x-0'
//                             }`}
//                           ></div>
//                         </div>
//                       </label>
//                     </div>
//                     <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-md p-4 flex items-center justify-between">
//                       <div>
//                         <h4 className="text-xs font-medium text-[#0f1724] mb-1">Enable Two-Factor Authentication (2FA)</h4>
//                         <p className="text-[10px] text-[#6b7280]">Enforce 2FA for all users in this tenant organization.</p>
//                       </div>
//                       <label className="relative inline-flex items-center cursor-pointer">
//                         <input
//                           type="checkbox"
//                           {...settingsForm.register('enable_2fa')}
//                           className="sr-only peer"
//                           checked={settingsForm.watch('enable_2fa')}
//                         />
//                         <div
//                           className={`w-10 h-5 rounded-full transition-colors ${
//                             settingsForm.watch('enable_2fa') ? 'bg-[#23dce1]' : 'bg-[#c0c8e6]'
//                           }`}
//                         >
//                           <div
//                             className={`absolute top-[2px] left-[2px] bg-white rounded-full h-4 w-4 transition-transform ${
//                               settingsForm.watch('enable_2fa') ? 'translate-x-5' : 'translate-x-0'
//                             }`}
//                           ></div>
//                         </div>
//                       </label>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Footer Navigation */}
//               <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[rgba(0,0,0,0.08)]">
//                 {currentStep > 1 && (
//                   <SecondaryButton onClick={handlePrevious} disabled={isLoading || isLoadingTenant}>
//                     <ChevronLeft className="w-4 h-4 mr-2" />
//                     Previous
//                   </SecondaryButton>
//                 )}
//                 {currentStep < 3 ? (
//                   <PrimaryButton onClick={handleNext} disabled={isLoading || isLoadingTenant}>
//                     Next
//                     <ChevronRight className="w-4 h-4 ml-2" />
//                   </PrimaryButton>
//                 ) : (
//                   <PrimaryButton onClick={handleFormSubmit} disabled={isLoading || isLoadingTenant}>
//                     {isLoading ? 'Updating...' : 'Update Tenant'}
//                   </PrimaryButton>
//                 )}
//               </div>
//             </div>
//           </div>
//           )}
//       </div>
//     </Modal>
//   );
// };
