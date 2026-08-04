import { useState, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout/Layout";
import {
  FormField,
  FormSelect,
  PrimaryButton,
  SecondaryButton,
  MultiselectPaginatedSelect,
  // AuthenticatedImage,
} from "@/components/shared";
import { tenantService } from "@/services/tenant-service";
import { moduleService } from "@/services/module-service";
// import { fileService } from "@/services/file-service";
import { platformServiceApi, type PlatformService } from "@/services/platform-service";
import { showToast } from "@/utils/toast";
import {
  ChevronRight,
  ChevronLeft,
  // Image as ImageIcon,
  // X,
  FileText,
  GraduationCap,
  AlertTriangle,
  Factory,
  GitBranch,
  FolderOpen,
  BarChart2,
  PenTool,
  Brain,
  Link2,
  Paperclip,
  HardDrive,
  Shield,
  CreditCard,
  Settings,
  Loader2,
} from "lucide-react";
// import { generateUUID } from "@/lib/utils";

// Icon mapping helper
const serviceIconMap: Record<string, any> = {
  FileText,
  GraduationCap,
  AlertTriangle,
  Factory,
  GitBranch,
  FolderOpen,
  BarChart2,
  PenTool,
  Brain,
  Link2,
  Paperclip,
  HardDrive,
  Shield,
  CreditCard,
};

// Step 1: Tenant Details Schema - matches NewTenantModal
const tenantDetailsSchema = z.object({
  name: z
    .string()
    .min(1, "name is required")
    .min(3, "name must be at least 3 characters")
    .max(100, "name must be at most 100 characters"),
  slug: z
    .string()
    .min(1, "slug is required")
    .min(3, "slug must be at least 3 characters")
    .max(100, "slug must be at most 100 characters")
    .regex(/^[a-z0-9-]+$/, "slug format is invalid"),
  domain: z.string().optional().nullable(),
  status: z.enum(["active", "suspended", "deleted"], {
    message: "Status is required",
  }),
  subscription_tier: z
    .enum(["basic", "professional", "enterprise"], {
      message: "Invalid subscription tier",
    })
    .optional()
    .nullable(),
  max_users: z
    .number()
    .int()
    .min(1, "max_users must be at least 1")
    .optional()
    .nullable(),
  max_modules: z
    .number()
    .int()
    .min(1, "max_modules must be at least 1")
    .optional()
    .nullable(),
  modules: z.array(z.uuid()).optional().nullable(),
});

// Step 2: Contact Details Schema - user creation + organization address
const contactDetailsSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(255, "Maximum 255 characters allowed"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(255, "Maximum 255 characters allowed"),
  contact_phone: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Optional field, empty is valid
        return /^\d{10}$/.test(val);
      },
      {
        message: "Phone number must be exactly 10 digits",
      },
    ),
  address_line1: z
    .string()
    .min(1, "Address is required")
    .max(255, "Maximum 255 characters allowed"),
  address_line2: z
    .string()
    .max(255, "Maximum 255 characters allowed")
    .optional()
    .nullable(),
  city: z
    .string()
    .min(1, "City is required")
    .max(255, "Maximum 255 characters allowed"),
  state: z
    .string()
    .min(1, "State is required")
    .max(255, "Maximum 255 characters allowed"),
  postal_code: z
    .string()
    .regex(/^[1-9]\d{5}$/, "Postal code must be a valid 6-digit PIN code"),
  country: z
    .string()
    .min(1, "Country is required")
    .max(255, "Maximum 255 characters allowed"),
});

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// Step 3: Settings Schema
const settingsSchema = z.object({
  enable_sso: z.boolean(),
  enable_2fa: z.boolean(),
  primary_color: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        return hexColorRegex.test(val);
      },
      {
        message: "Must be a valid hex color code (e.g., #112868)",
      }
    ),
  secondary_color: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        return hexColorRegex.test(val);
      },
      {
        message: "Must be a valid hex color code (e.g., #23DCE1)",
      }
    ),
  accent_color: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        return hexColorRegex.test(val);
      },
      {
        message: "Must be a valid hex color code (e.g., #084CC8)",
      }
    ),
});

type TenantDetailsForm = z.infer<typeof tenantDetailsSchema>;
type ContactDetailsForm = z.infer<typeof contactDetailsSchema>;
type SettingsForm = z.infer<typeof settingsSchema>;

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deleted", label: "Deleted" },
];

const subscriptionTierOptions = [
  { value: "basic", label: "Basic" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
];

// Helper function to get base URL with protocol
const getBaseUrlWithProtocol = (): string => {
  return import.meta.env.VITE_FRONTEND_BASE_URL || "http://localhost:5173";
};

const CreateTenantWizard = (): ReactElement => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [initialModuleOptions, setInitialModuleOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  // Platform Services state
  const [platformServices, setPlatformServices] = useState<PlatformService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Load platform services on mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const services = await platformServiceApi.getAll();
        setPlatformServices(services);
        // By default, enable all services for the new tenant
        setSelectedServices(services.map((s) => s.key));
      } catch (err) {
        console.error("Failed to load platform services:", err);
      }
    };
    fetchServices();
  }, []);

  const toggleService = (key: string) => {
    setSelectedServices((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Form instances for each step
  const tenantDetailsForm = useForm<TenantDetailsForm>({
    resolver: zodResolver(tenantDetailsSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      slug: "",
      domain: "",
      status: "active",
      subscription_tier: null,
      max_users: null,
      max_modules: null,
      modules: [],
    },
  });

  // Load modules for multiselect
  const loadModules = async (page: number, limit: number) => {
    const response = await moduleService.getRunningModules(page, limit);
    return {
      options: response.data.map((module) => ({
        value: module.id,
        label: module.name,
      })),
      pagination: response.pagination,
    };
  };

  const contactDetailsForm = useForm<ContactDetailsForm>({
    resolver: zodResolver(contactDetailsSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      contact_phone: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
    },
  });

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      enable_sso: false,
      enable_2fa: false,
      primary_color: "#112868",
      secondary_color: "#23DCE1",
      accent_color: "#084CC8",
    },
  });

  // File upload state for branding (commented out as company logo and favicon uploads are disabled during tenant creation)
  /*
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoFileAttachmentUuid, setLogoFileAttachmentUuid] = useState<
    string | null
  >(null);
  const [faviconFileAttachmentUuid, setFaviconFileAttachmentUuid] = useState<
    string | null
  >(null);
  const [logoFileUrl, setLogoFileUrl] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [faviconFileUrl, setFaviconFileUrl] = useState<string | null>(null);
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(
    null,
  );
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [faviconError, setFaviconError] = useState<string | null>(null);
  */

  // Auto-generate slug and domain from name
  const nameValue = tenantDetailsForm.watch("name");
  const baseUrlWithProtocol = getBaseUrlWithProtocol();
  const previousNameRef = useRef<string>("");

  useEffect(() => {
    if (nameValue) {
      const slug = nameValue
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      tenantDetailsForm.setValue("slug", slug, { shouldValidate: true });

      // Auto-generate domain when tenant name changes (like slug)
      // Format: http://tenant-slug.localhost:5173/tenant
      // Extract host from base URL and construct domain with protocol
      if (nameValue !== previousNameRef.current) {
        try {
          const baseUrlObj = new URL(baseUrlWithProtocol);
          const host = baseUrlObj.host; // e.g., "localhost:5173"
          const protocol = baseUrlObj.protocol; // e.g., "http:" or "https:"
          const autoGeneratedDomain = `${protocol}//${slug}.${host}/tenant`;
          tenantDetailsForm.setValue("domain", autoGeneratedDomain, {
            shouldValidate: false,
          });
        } catch {
          // Fallback if URL parsing fails
          const autoGeneratedDomain = `${baseUrlWithProtocol.replace(/\/$/, "")}/${slug}/tenant`;
          tenantDetailsForm.setValue("domain", autoGeneratedDomain, {
            shouldValidate: false,
          });
        }
        previousNameRef.current = nameValue;
      }
    } else if (!nameValue && previousNameRef.current) {
      // Clear domain when name is cleared
      tenantDetailsForm.setValue("domain", "", { shouldValidate: false });
      previousNameRef.current = "";
    }
  }, [nameValue, tenantDetailsForm, baseUrlWithProtocol]);

  const handleNext = async (): Promise<void> => {
    if (currentStep === 1) {
      const isValid = await tenantDetailsForm.trigger();
      if (isValid) {
        // Store selected modules and their options for restoration when going back
        const modules = tenantDetailsForm.getValues("modules") || [];
        if (modules.length > 0 && initialModuleOptions.length === 0) {
          // Load module names for selected modules
          try {
            const moduleOptionsPromises = modules.map(
              async (moduleId: string) => {
                try {
                  const moduleResponse = await moduleService.getById(moduleId);
                  return {
                    value: moduleId,
                    label: moduleResponse.data.name,
                  };
                } catch {
                  return null;
                }
              },
            );
            const moduleOptions = (
              await Promise.all(moduleOptionsPromises)
            ).filter((opt) => opt !== null) as Array<{
              value: string;
              label: string;
            }>;
            setInitialModuleOptions(moduleOptions);
          } catch (err) {
            console.warn("Failed to load module names:", err);
          }
        }
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      const isValid = await contactDetailsForm.trigger();
      if (isValid) {
        setCurrentStep(3);
      }
    }
  };

  const handlePrevious = (): void => {
    if (currentStep > 1) {
      // When going back to step 1, restore selected modules and their options
      if (currentStep === 2) {
        const modules = tenantDetailsForm.getValues("modules") || [];
        setSelectedModules(modules);
        // Restore initial module options if we have selected modules
        if (modules.length > 0 && initialModuleOptions.length === 0) {
          // Load module names for selected modules
          const loadModuleOptions = async () => {
            try {
              const moduleOptionsPromises = modules.map(
                async (moduleId: string) => {
                  try {
                    const moduleResponse =
                      await moduleService.getById(moduleId);
                    return {
                      value: moduleId,
                      label: moduleResponse.data.name,
                    };
                  } catch {
                    return null;
                  }
                },
              );
              const moduleOptions = (
                await Promise.all(moduleOptionsPromises)
              ).filter((opt) => opt !== null) as Array<{
                value: string;
                label: string;
              }>;
              setInitialModuleOptions(moduleOptions);
            } catch (err) {
              console.warn("Failed to load module names:", err);
            }
          };
          loadModuleOptions();
        }
      }
      setCurrentStep(currentStep - 1);
    }
  };

  /*
  const handleDeleteLogo = (): void => {
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoFileUrl(null);
    setLogoFileAttachmentUuid(null);
    setLogoError(null);
    // Reset the file input
    const fileInput = document.getElementById(
      "logo-upload-wizard",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleDeleteFavicon = (): void => {
    if (faviconPreviewUrl) {
      URL.revokeObjectURL(faviconPreviewUrl);
    }
    setFaviconFile(null);
    setFaviconPreviewUrl(null);
    setFaviconFileUrl(null);
    setFaviconFileAttachmentUuid(null);
    setFaviconError(null);
    // Reset the file input
    const fileInput = document.getElementById(
      "favicon-upload-wizard",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };
  */

  const handleSubmit = async (): Promise<void> => {
    const isValid = await settingsForm.trigger();
    if (!isValid) return;

    /*
    // Validate logo and favicon are uploaded
    setLogoError(null);
    setFaviconError(null);

    const isLogoMissing = !logoFileUrl && !logoFile;
    const isFaviconMissing = !faviconFileUrl && !faviconFile;

    if (isLogoMissing) {
      setLogoError("Logo is required");
    }

    if (isFaviconMissing) {
      setFaviconError("Favicon is required");
    }

    if (isLogoMissing || isFaviconMissing) {
      setCurrentStep(3); // Go to settings step where logo/favicon are
      return;
    }
    */

    try {
      setIsSubmitting(true);
      const tenantDetails = tenantDetailsForm.getValues();
      const contactDetails = contactDetailsForm.getValues();
      const settings = settingsForm.getValues();

      // Combine all data for tenant creation - matches NewTenantModal structure
      const { modules, ...restTenantDetails } = tenantDetails;
      const contactData = contactDetails;

      // Extract branding colors from settings
      const {
        enable_sso,
        enable_2fa,
        primary_color,
        secondary_color,
        accent_color,
      } = settings;

      // 1. Create the tenant first (without logo/favicon metadata)
      const tenantData = {
        ...restTenantDetails,
        module_ids: selectedModules.length > 0 ? selectedModules : undefined,
        service_keys: selectedServices,
        settings: {
          enable_sso,
          enable_2fa,
          contact: contactData, // Include first_name, last_name, email, password
          branding: {
            primary_color: primary_color || undefined,
            secondary_color: secondary_color || undefined,
            accent_color: accent_color || undefined,
            logo_file_path: undefined,
            logo_file_attachment_uuid: undefined,
            favicon_file_path: undefined,
            favicon_file_attachment_uuid: undefined,
          },
        },
      };

      const response = await tenantService.create(tenantData);

      /*
      const createdTenant = response.data;
      const createdTenantId = createdTenant.id;
      const slug = createdTenant.slug || tenantDetails.slug;

      // 2. Upload logo and favicon under the created tenant context
      let finalLogoUuid = logoFileAttachmentUuid;
      let finalLogoPath = logoFileUrl;
      let finalFaviconUuid = faviconFileAttachmentUuid;
      let finalFaviconPath = faviconFileUrl;

      if (logoFile) {
        setIsUploadingLogo(true);
        try {
          const uploadRes = await fileService.upload(
            logoFile,
            slug || "tenant",
            generateUUID(),
            createdTenantId
          );
          finalLogoUuid = uploadRes.data.id;
          finalLogoPath = `${getBaseUrlWithProtocol()}/files/${finalLogoUuid}/preview`;
        } catch (uploadErr) {
          console.error("Failed to upload logo:", uploadErr);
          showToast.error("Tenant created, but failed to upload logo.");
        } finally {
          setIsUploadingLogo(false);
        }
      }

      if (faviconFile) {
        setIsUploadingFavicon(true);
        try {
          const uploadRes = await fileService.upload(
            faviconFile,
            slug || "tenant",
            generateUUID(),
            createdTenantId
          );
          finalFaviconUuid = uploadRes.data.id;
          finalFaviconPath = `${getBaseUrlWithProtocol()}/files/${finalFaviconUuid}/preview`;
        } catch (uploadErr) {
          console.error("Failed to upload favicon:", uploadErr);
          showToast.error("Tenant created, but failed to upload favicon.");
        } finally {
          setIsUploadingFavicon(false);
        }
      }

      // 3. Update the tenant record with the newly uploaded branding assets
      if (finalLogoUuid || finalFaviconUuid) {
        const updateData = {
          name: tenantDetails.name,
          slug: slug || tenantDetails.slug,
          status: tenantDetails.status,
          settings: {
            enable_sso,
            enable_2fa,
            branding: {
              primary_color: primary_color || undefined,
              secondary_color: secondary_color || undefined,
              accent_color: accent_color || undefined,
              logo_file_path: finalLogoPath || undefined,
              logo_file_attachment_uuid: finalLogoUuid || undefined,
              favicon_file_path: finalFaviconPath || undefined,
              favicon_file_attachment_uuid: finalFaviconUuid || undefined,
            },
          },
        };
        await tenantService.update(createdTenantId, updateData);
      }
      */

      const message = response.message || "Tenant created successfully";
      showToast.success(message);
      navigate("/tenants");
    } catch (err: any) {
      // Clear previous errors
      tenantDetailsForm.clearErrors();
      contactDetailsForm.clearErrors();
      settingsForm.clearErrors();

      // Handle validation errors from API
      if (
        err?.response?.data?.details &&
        Array.isArray(err.response.data.details)
      ) {
        const validationErrors = err.response.data.details;
        let hasTenantErrors = false;
        let hasContactErrors = false;
        let hasSettingsErrors = false;

        validationErrors.forEach(
          (detail: { path: string; message: string }) => {
            const path = detail.path;

            // Handle nested paths first
            if (path.startsWith("settings.contact.")) {
              // Contact details errors from nested path
              hasContactErrors = true;
              const fieldName = path.replace("settings.contact.", "");
              contactDetailsForm.setError(
                fieldName as keyof ContactDetailsForm,
                {
                  type: "server",
                  message: detail.message,
                },
              );
            } else if (path.startsWith("settings.branding.")) {
              // Settings/branding errors from nested path
              hasSettingsErrors = true;
              const fieldName = path.replace("settings.branding.", "");
              // Map file_path fields to form fields
              if (fieldName === "logo_file_path") {
                // setLogoError(detail.message);
              } else if (fieldName === "favicon_file_path") {
                // setFaviconError(detail.message);
              } else {
                settingsForm.setError(fieldName as keyof SettingsForm, {
                  type: "server",
                  message: detail.message,
                });
              }
            } else if (path.startsWith("settings.")) {
              // Other settings errors
              hasSettingsErrors = true;
              const fieldName = path.replace("settings.", "");
              settingsForm.setError(fieldName as keyof SettingsForm, {
                type: "server",
                message: detail.message,
              });
            }
            // Handle tenant details errors (step 1)
            else if (
              path === "name" ||
              path === "slug" ||
              path === "domain" ||
              path === "status" ||
              path === "subscription_tier" ||
              path === "max_users" ||
              path === "max_modules" ||
              path === "module_ids"
            ) {
              hasTenantErrors = true;
              const fieldPath = path === "module_ids" ? "modules" : path;
              tenantDetailsForm.setError(fieldPath as keyof TenantDetailsForm, {
                type: "server",
                message: detail.message,
              });
            }
            // Handle contact details errors (step 2) - direct paths
            else if (
              path === "email" ||
              path === "password" ||
              path === "first_name" ||
              path === "last_name" ||
              path === "contact_phone" ||
              path === "address_line1" ||
              path === "address_line2" ||
              path === "city" ||
              path === "state" ||
              path === "postal_code" ||
              path === "country"
            ) {
              hasContactErrors = true;
              contactDetailsForm.setError(path as keyof ContactDetailsForm, {
                type: "server",
                message: detail.message,
              });
            }
            // Handle settings errors (step 3) - direct paths
            else if (
              path === "enable_sso" ||
              path === "enable_2fa" ||
              path === "primary_color" ||
              path === "secondary_color" ||
              path === "accent_color"
            ) {
              hasSettingsErrors = true;
              settingsForm.setError(path as keyof SettingsForm, {
                type: "server",
                message: detail.message,
              });
            }
          },
        );

        // Navigate to the step with errors
        if (hasTenantErrors) {
          setCurrentStep(1);
        } else if (hasContactErrors) {
          setCurrentStep(2);
        } else if (hasSettingsErrors) {
          setCurrentStep(3);
        }
      } else {
        // Handle general errors
        const errorObj = err?.response?.data?.error;
        const errorMessage =
          (typeof errorObj === "object" &&
          errorObj !== null &&
          "message" in errorObj
            ? errorObj.message
            : null) ||
          (typeof errorObj === "string" ? errorObj : null) ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to create tenant. Please try again.";
        tenantDetailsForm.setError("root", {
          type: "server",
          message:
            typeof errorMessage === "string"
              ? errorMessage
              : "Failed to create tenant. Please try again.",
        });
        showToast.error(
          typeof errorMessage === "string"
            ? errorMessage
            : "Failed to create tenant. Please try again.",
        );
        setCurrentStep(1); // Navigate to first step for general errors
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    {
      number: 1,
      title: "Tenant Details",
      description: "Basic organization information",
      isActive: currentStep === 1,
      isCompleted: currentStep > 1,
    },
    {
      number: 2,
      title: "Contact Details",
      description: "Primary contact & address",
      isActive: currentStep === 2,
      isCompleted: currentStep > 2,
    },
    {
      number: 3,
      title: "Settings",
      description: "Usage limits & security",
      isActive: currentStep === 3,
      isCompleted: false,
    },
  ];

  return (
    <Layout
      currentPage="Create Tenant"
      breadcrumbs={[
        { label: "QAssure", path: "/dashboard" },
        { label: "Tenant Management", path: "/tenants" },
        { label: "Create Tenant" },
      ]}
      pageHeader={{
        title: "Create New Tenant",
        description: "Follow the steps to onboard a new Tenant.",
      }}
    >
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Steps Sidebar */}
        <div className="w-full lg:w-[260px] bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-xs font-medium text-[#6b7280] uppercase tracking-wide">
              Steps
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex gap-2.5 items-center px-3 py-2 rounded-md ${
                  step.isActive ? "bg-[#f5f7fa]" : ""
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step.isActive
                      ? "bg-[#23dce1] border border-[#23dce1] text-[#112868]"
                      : step.isCompleted
                        ? "bg-[#23dce1] border border-[#23dce1] text-[#112868]"
                        : "bg-white border border-[rgba(0,0,0,0.08)] text-[#6b7280]"
                  }`}
                >
                  {step.number}
                </div>
                <div className="flex-1">
                  <div
                    className={`text-sm font-medium ${
                      step.isActive ? "text-[#0f1724]" : "text-[#0f1724]"
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-4">
          {/* Step 1: Tenant Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="pb-4 border-b border-[rgba(0,0,0,0.08)]">
                <h2 className="text-lg font-semibold text-[#0f1724]">
                  Tenant Details
                </h2>
                <p className="text-sm text-[#6b7280] mt-1">
                  Basic information for the new organization.
                </p>
              </div>
              {/* General Error Display */}
              {tenantDetailsForm.formState.errors.root && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
                  <p className="text-sm text-[#ef4444]">
                    {tenantDetailsForm.formState.errors.root.message}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <FormField
                  label="Tenant Name"
                  required
                  placeholder="Enter tenant name"
                  error={tenantDetailsForm.formState.errors.name?.message}
                  {...tenantDetailsForm.register("name")}
                />
                <FormField
                  label="Slug"
                  required
                  placeholder="Enter slug (lowercase, numbers, hyphens only)"
                  error={tenantDetailsForm.formState.errors.slug?.message}
                  {...tenantDetailsForm.register("slug")}
                />
                <FormField
                  label="Domain"
                  placeholder="Auto-generated from tenant name"
                  error={tenantDetailsForm.formState.errors.domain?.message}
                  {...tenantDetailsForm.register("domain")}
                />
                {/* Status and Subscription Tier Row */}
                <div className="flex gap-5">
                  <div className="flex-1">
                    <FormSelect
                      label="Status"
                      required
                      placeholder="Select Status"
                      options={statusOptions}
                      value={tenantDetailsForm.watch("status")}
                      onValueChange={(value) =>
                        tenantDetailsForm.setValue(
                          "status",
                          value as "active" | "suspended" | "deleted",
                        )
                      }
                      error={tenantDetailsForm.formState.errors.status?.message}
                    />
                  </div>
                  <div className="flex-1">
                    <FormSelect
                      label="Subscription Tier"
                      placeholder="Select Subscription"
                      options={subscriptionTierOptions}
                      value={tenantDetailsForm.watch("subscription_tier") || ""}
                      onValueChange={(value) =>
                        tenantDetailsForm.setValue(
                          "subscription_tier",
                          value === ""
                            ? null
                            : (value as
                                | "basic"
                                | "professional"
                                | "enterprise"),
                        )
                      }
                      error={
                        tenantDetailsForm.formState.errors.subscription_tier
                          ?.message
                      }
                    />
                  </div>
                </div>
                {/* Max Users and Max Modules Row */}
                {/* <div className="flex gap-5">
                  <div className="flex-1">
                    <FormField
                      label="Max Users"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter number"
                      error={
                        tenantDetailsForm.formState.errors.max_users?.message
                      }
                      {...tenantDetailsForm.register("max_users", {
                        setValueAs: (value) => {
                          if (
                            value === "" ||
                            value === null ||
                            value === undefined
                          )
                            return null;
                          const num = Number(value);
                          return isNaN(num) ? null : num;
                        },
                      })}
                    />
                  </div>
                  <div className="flex-1">
                    <FormField
                      label="Max Modules"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter number"
                      error={
                        tenantDetailsForm.formState.errors.max_modules?.message
                      }
                      {...tenantDetailsForm.register("max_modules", {
                        setValueAs: (value) => {
                          if (
                            value === "" ||
                            value === null ||
                            value === undefined
                          )
                            return null;
                          const num = Number(value);
                          return isNaN(num) ? null : num;
                        },
                      })}
                    />
                  </div>
                </div> */}
                {/* Modules Multiselect */}
                <MultiselectPaginatedSelect
                  label="Modules"
                  placeholder="Select modules"
                  value={selectedModules}
                  onValueChange={(values) => {
                    setSelectedModules(values);
                    tenantDetailsForm.setValue(
                      "modules",
                      values.length > 0 ? values : [],
                    );
                  }}
                  onLoadOptions={loadModules}
                  initialOptions={initialModuleOptions}
                  error={tenantDetailsForm.formState.errors.modules?.message}
                />

                {/* Platform Services Section */}
                <div className="mt-8 border-t border-[rgba(0,0,0,0.08)] pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                    <div>
                      <h3 className="text-md font-semibold text-[#0f1724]">Platform Services</h3>
                      <p className="text-xs text-[#6b7280]">
                        Select internal platform services enabled for this tenant. System services (Identity, Audit, Notification) are always enabled.
                      </p>
                    </div>
                    {platformServices.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedServices(platformServices.map((s) => s.key))}
                          className="px-3 py-1.5 text-xs font-medium text-[#112868] bg-[#112868]/10 hover:bg-[#112868]/20 rounded-md transition-colors"
                        >
                          Enable All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedServices([])}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        >
                          Disable All
                        </button>
                      </div>
                    )}
                  </div>

                  {platformServices.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#112868]" /> Loading platform services...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {platformServices.map((service) => {
                        const IconComponent = serviceIconMap[service.icon || ""] || Settings;
                        const isSelected = selectedServices.includes(service.key);
                        
                        return (
                          <div
                            key={service.key}
                            onClick={() => toggleService(service.key)}
                            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all select-none ${
                              isSelected
                                ? "border-[#112868] bg-[#112868]/5 shadow-sm"
                                : "border-[rgba(0,0,0,0.08)] hover:border-gray-300 bg-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Click handler on parent handles toggle
                              className="mt-1 h-4 w-4 text-[#112868] border-gray-300 rounded focus:ring-[#112868]"
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex items-center gap-2">
                                <div className={`p-1 rounded ${isSelected ? "bg-[#112868]/10 text-[#112868]" : "bg-gray-100 text-gray-500"}`}>
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{service.name}</span>
                                {service.category && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 capitalize">
                                    {service.category}
                                  </span>
                                )}
                              </div>
                              {service.description && (
                                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{service.description}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="pb-4 border-b border-[rgba(0,0,0,0.08)]">
                <h2 className="text-lg font-semibold text-[#0f1724]">
                  Contact Details
                </h2>
                <p className="text-sm text-[#6b7280] mt-1">
                  Contact information for the main account administrator.
                </p>
              </div>
              {/* General Error Display */}
              {contactDetailsForm.formState.errors.root && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
                  <p className="text-sm text-[#ef4444]">
                    {contactDetailsForm.formState.errors.root.message}
                  </p>
                </div>
              )}
              <div className="space-y-4">
                {/* User Account Information Section */}
                <div className="border-b border-dashed border-[rgba(0,0,0,0.08)] pb-4">
                  {/* Email */}
                  <FormField
                    label="Email"
                    type="email"
                    required
                    placeholder="Enter email address"
                    error={contactDetailsForm.formState.errors.email?.message}
                    {...contactDetailsForm.register("email")}
                  />
                  {/* First Name and Last Name Row */}
                  <div className="grid grid-cols-2 gap-5">
                    <FormField
                      label="First Name"
                      required
                      placeholder="Enter first name"
                      error={
                        contactDetailsForm.formState.errors.first_name?.message
                      }
                      {...contactDetailsForm.register("first_name")}
                    />
                    <FormField
                      label="Last Name"
                      required
                      placeholder="Enter last name"
                      error={
                        contactDetailsForm.formState.errors.last_name?.message
                      }
                      {...contactDetailsForm.register("last_name")}
                    />
                  </div>
                  {/* Contact Phone */}
                  <div className="mt-4">
                    <FormField
                      label="Contact Phone"
                      type="tel"
                      placeholder="Enter 10-digit phone number"
                      maxLength={10}
                      error={
                        contactDetailsForm.formState.errors.contact_phone
                          ?.message
                      }
                      {...contactDetailsForm.register("contact_phone", {
                        onChange: (e) => {
                          // Only allow digits and limit to 10 characters
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          contactDetailsForm.setValue("contact_phone", value, {
                            shouldValidate: true,
                          });
                        },
                      })}
                    />
                  </div>
                </div>
                {/* Organization Address Section */}
                <div className="border-b border-dashed border-[rgba(0,0,0,0.08)] pb-4">
                  <h3 className="text-sm font-medium text-[#0f1724] mb-4">
                    Organization Address
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      label="Address Line 1"
                      required
                      placeholder="Enter address line 1"
                      error={
                        contactDetailsForm.formState.errors.address_line1
                          ?.message
                      }
                      {...contactDetailsForm.register("address_line1")}
                    />
                    <FormField
                      label="Address Line 2"
                      placeholder="Enter address line 2 (optional)"
                      error={
                        contactDetailsForm.formState.errors.address_line2
                          ?.message
                      }
                      {...contactDetailsForm.register("address_line2")}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label="City"
                        required
                        placeholder="Enter city"
                        error={
                          contactDetailsForm.formState.errors.city?.message
                        }
                        {...contactDetailsForm.register("city")}
                      />
                      <FormField
                        label="State"
                        required
                        placeholder="Enter state"
                        error={
                          contactDetailsForm.formState.errors.state?.message
                        }
                        {...contactDetailsForm.register("state")}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label="Postal Code"
                        required
                        placeholder="Enter postal code"
                        error={
                          contactDetailsForm.formState.errors.postal_code
                            ?.message
                        }
                        {...contactDetailsForm.register("postal_code", {
                          onChange: (e) => {
                            e.target.value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6);
                          },
                        })}
                      />
                      <FormField
                        label="Country"
                        required
                        placeholder="Enter country"
                        error={
                          contactDetailsForm.formState.errors.country?.message
                        }
                        {...contactDetailsForm.register("country")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Settings */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[rgba(0,0,0,0.08)]">
                <h2 className="text-lg font-semibold text-[#0f1724]">
                  Configuration & Limits
                </h2>
                <p className="text-sm text-[#6b7280] mt-1">
                  Set resource limits and security preferences for this tenant.
                </p>
              </div>
              {/* General Error Display */}
              {settingsForm.formState.errors.root && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
                  <p className="text-sm text-[#ef4444]">
                    {settingsForm.formState.errors.root.message}
                  </p>
                </div>
              )}

              {/* Branding Section */}
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-4 md:p-6 flex flex-col gap-4">
                {/* Section Header */}
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-[#0f1724]">
                    Branding
                  </h3>
                  <p className="text-sm font-normal text-[#9ca3af]">
                    Customize logo, favicon, and colors for this tenant
                    experience.
                  </p>
                </div>

                {/* Logo and Favicon Upload commented out since file attachment bucket can only be set after tenant creation */}
                {/*
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#0f1724]">
                      Company Logo <span className="text-[#e02424]">*</span>
                    </label>
                    <label
                      htmlFor="logo-upload-wizard"
                      className="bg-[#f5f7fa] border border-dashed border-[#d1d5db] rounded-md p-4 flex gap-4 items-center cursor-pointer hover:bg-[#e5e7eb] transition-colors"
                    >
                      <div className="bg-white border border-[#d1d5db] rounded-lg size-12 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5 text-[#6b7280]" />
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="text-sm font-medium text-[#0f1724]">
                          Upload Logo
                        </span>
                        <span className="text-xs font-normal text-[#9ca3af]">
                          PNG, SVG, JPG up to 2MB.
                        </span>
                      </div>
                      <input
                        id="logo-upload-wizard"
                        type="file"
                        accept="image/png,image/svg+xml,image/jpeg,image/jpg"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (logoPreviewUrl) {
                              URL.revokeObjectURL(logoPreviewUrl);
                            }

                            if (file.size > 2 * 1024 * 1024) {
                              showToast.error(
                                "Logo file size must be less than 2MB",
                              );
                              return;
                            }
                            const validTypes = [
                              "image/png",
                              "image/svg+xml",
                              "image/jpeg",
                              "image/jpg",
                            ];
                            if (!validTypes.includes(file.type)) {
                              showToast.error(
                                "Logo must be PNG, SVG, or JPG format",
                              );
                              return;
                            }
                            const previewUrl = URL.createObjectURL(file);
                            setLogoFile(file);
                            setLogoPreviewUrl(previewUrl);
                            setLogoError(null);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {logoError && (
                      <p className="text-sm text-[#ef4444]">{logoError}</p>
                    )}
                    {(logoFile || logoFileUrl) && (
                      <div className="flex flex-col gap-2 mt-1">
                        {logoFile && (
                          <div className="text-xs text-[#6b7280]">
                            {isUploadingLogo
                              ? "Uploading..."
                              : `Selected: ${logoFile.name}`}
                          </div>
                        )}
                        {(logoPreviewUrl || logoFileUrl) && (
                          <div className="mt-2 relative inline-block">
                            <AuthenticatedImage
                              key={logoPreviewUrl || logoFileUrl}
                              fileId={logoFileAttachmentUuid}
                              src={logoPreviewUrl || logoFileUrl}
                              alt="Logo preview"
                              className="max-w-full h-20 object-contain border border-[#d1d5db] rounded-md p-2 bg-white"
                              style={{ display: "block", maxHeight: "80px" }}
                            />
                            <button
                              type="button"
                              onClick={handleDeleteLogo}
                              className="absolute top-1 right-1 bg-[#ef4444] text-white rounded-full p-1 hover:bg-[#dc2626] transition-colors"
                              aria-label="Delete logo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#0f1724]">
                      Favicon <span className="text-[#e02424]">*</span>
                    </label>
                    <label
                      htmlFor="favicon-upload-wizard"
                      className="bg-[#f5f7fa] border border-dashed border-[#d1d5db] rounded-md p-4 flex gap-4 items-center cursor-pointer hover:bg-[#e5e7eb] transition-colors"
                    >
                      <div className="bg-white border border-[#d1d5db] rounded-lg size-12 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5 text-[#6b7280]" />
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="text-sm font-medium text-[#0f1724]">
                          Upload Favicon
                        </span>
                        <span className="text-xs font-normal text-[#9ca3af]">
                          ICO or PNG up to 500KB.
                        </span>
                      </div>
                      <input
                        id="favicon-upload-wizard"
                        type="file"
                        accept="image/x-icon,image/png,image/vnd.microsoft.icon"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (faviconPreviewUrl) {
                              URL.revokeObjectURL(faviconPreviewUrl);
                            }

                            if (file.size > 500 * 1024) {
                              showToast.error(
                                "Favicon file size must be less than 500KB",
                              );
                              return;
                            }
                            const validTypes = [
                              "image/x-icon",
                              "image/png",
                              "image/vnd.microsoft.icon",
                            ];
                            if (!validTypes.includes(file.type)) {
                              showToast.error(
                                "Favicon must be ICO or PNG format",
                              );
                              return;
                            }
                            const previewUrl = URL.createObjectURL(file);
                            setFaviconFile(file);
                            setFaviconPreviewUrl(previewUrl);
                            setFaviconError(null);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {faviconError && (
                      <p className="text-sm text-[#ef4444]">{faviconError}</p>
                    )}
                    {(faviconFile || faviconFileUrl) && (
                      <div className="flex flex-col gap-2 mt-1">
                        {faviconFile && (
                          <div className="text-xs text-[#6b7280]">
                            {isUploadingFavicon
                              ? "Uploading..."
                              : `Selected: ${faviconFile.name}`}
                          </div>
                        )}
                        {(faviconPreviewUrl || faviconFileUrl) && (
                          <div className="mt-2 relative inline-block">
                            <AuthenticatedImage
                              key={faviconFileUrl || faviconPreviewUrl || ""}
                              fileId={faviconFileAttachmentUuid}
                              src={faviconPreviewUrl || faviconFileUrl}
                              alt="Favicon preview"
                              className="max-w-full h-20 object-contain border border-[#d1d5db] rounded-md p-2 bg-white"
                              style={{ display: "block", maxHeight: "80px" }}
                            />
                            <button
                              type="button"
                              onClick={handleDeleteFavicon}
                              className="absolute top-1 right-1 bg-[#ef4444] text-white rounded-full p-1 hover:bg-[#dc2626] transition-colors"
                              aria-label="Delete favicon"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                */}

                {/* Primary Color */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#0f1724]">
                    Primary Color
                  </label>
                  <div className="flex gap-3 items-center">
                    <div
                      className="border border-[#d1d5db] rounded-md size-10 shrink-0"
                      style={{
                        backgroundColor:
                          settingsForm.watch("primary_color") || "#112868",
                      }}
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={settingsForm.watch("primary_color") || "#112868"}
                        onChange={(e) =>
                          settingsForm.setValue("primary_color", e.target.value, { shouldValidate: true })
                        }
                        className="bg-[#f5f7fa] border border-[#d1d5db] h-10 px-3 py-1 rounded-md text-sm text-[#0f1724] w-full focus:outline-none focus:ring-2 focus:ring-[#112868] focus:border-transparent"
                        placeholder="#112868"
                      />
                    </div>
                    <input
                      type="color"
                      value={settingsForm.watch("primary_color") || "#112868"}
                      onChange={(e) =>
                        settingsForm.setValue("primary_color", e.target.value, { shouldValidate: true })
                      }
                      className="size-10 rounded-md border border-[#d1d5db] cursor-pointer"
                    />
                  </div>
                  {settingsForm.formState.errors.primary_color && (
                    <p className="text-sm text-[#ef4444]">{settingsForm.formState.errors.primary_color.message}</p>
                  )}
                  <p className="text-xs font-normal text-[#9ca3af]">
                    Used for navigation, headers, and key actions.
                  </p>
                </div>

                {/* Secondary and Accent Colors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Secondary Color */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#0f1724]">
                      Secondary Color
                    </label>
                    <div className="flex gap-3 items-center">
                      <div
                        className="border border-[#d1d5db] rounded-md size-10 shrink-0"
                        style={{
                          backgroundColor:
                            settingsForm.watch("secondary_color") || "#23DCE1",
                        }}
                      />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={
                            settingsForm.watch("secondary_color") || "#23DCE1"
                          }
                          onChange={(e) =>
                            settingsForm.setValue(
                              "secondary_color",
                              e.target.value,
                              { shouldValidate: true }
                            )
                          }
                          className="bg-[#f5f7fa] border border-[#d1d5db] h-10 px-3 py-1 rounded-md text-sm text-[#0f1724] w-full focus:outline-none focus:ring-2 focus:ring-[#112868] focus:border-transparent"
                          placeholder="#23DCE1"
                        />
                      </div>
                      <input
                        type="color"
                        value={
                          settingsForm.watch("secondary_color") || "#23DCE1"
                        }
                        onChange={(e) =>
                          settingsForm.setValue(
                            "secondary_color",
                            e.target.value,
                            { shouldValidate: true }
                          )
                        }
                        className="size-10 rounded-md border border-[#d1d5db] cursor-pointer"
                      />
                    </div>
                    {settingsForm.formState.errors.secondary_color && (
                      <p className="text-sm text-[#ef4444]">{settingsForm.formState.errors.secondary_color.message}</p>
                    )}
                    <p className="text-xs font-normal text-[#9ca3af]">
                      Used for highlights and supporting elements.
                    </p>
                  </div>

                  {/* Accent Color */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#0f1724]">
                      Accent Color
                    </label>
                    <div className="flex gap-3 items-center">
                      <div
                        className="border border-[#d1d5db] rounded-md size-10 shrink-0"
                        style={{
                          backgroundColor:
                            settingsForm.watch("accent_color") || "#084CC8",
                        }}
                      />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={
                            settingsForm.watch("accent_color") || "#084CC8"
                          }
                          onChange={(e) =>
                            settingsForm.setValue(
                              "accent_color",
                              e.target.value,
                              { shouldValidate: true }
                            )
                          }
                          className="bg-[#f5f7fa] border border-[#d1d5db] h-10 px-3 py-1 rounded-md text-sm text-[#0f1724] w-full focus:outline-none focus:ring-2 focus:ring-[#112868] focus:border-transparent"
                          placeholder="#084CC8"
                        />
                      </div>
                      <input
                        type="color"
                        value={settingsForm.watch("accent_color") || "#084CC8"}
                        onChange={(e) =>
                          settingsForm.setValue("accent_color", e.target.value, { shouldValidate: true })
                        }
                        className="size-10 rounded-md border border-[#d1d5db] cursor-pointer"
                      />
                    </div>
                    {settingsForm.formState.errors.accent_color && (
                      <p className="text-sm text-[#ef4444]">{settingsForm.formState.errors.accent_color.message}</p>
                    )}
                    <p className="text-xs font-normal text-[#9ca3af]">
                      Used for alerts and special notices.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Settings */}
              {/* <div className="space-y-4">
                <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-md p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-medium text-[#0f1724] mb-1">
                      Enable Single Sign-On (SSO)
                    </h4>
                    <p className="text-[10px] text-[#6b7280]">
                      Allow users to log in using their organization's identity
                      provider.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...settingsForm.register("enable_sso")}
                      className="sr-only peer"
                      checked={settingsForm.watch("enable_sso")}
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors ${
                        settingsForm.watch("enable_sso")
                          ? "bg-[#23dce1]"
                          : "bg-[#c0c8e6]"
                      }`}
                    >
                      <div
                        className={`absolute top-[2px] left-[2px] bg-white rounded-full h-4 w-4 transition-transform ${
                          settingsForm.watch("enable_sso")
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      ></div>
                    </div>
                  </label>
                </div> 
                <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-md p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-medium text-[#0f1724] mb-1">
                      Enable Two-Factor Authentication (2FA)
                    </h4>
                    <p className="text-[10px] text-[#6b7280]">
                      Enforce 2FA for all users in this tenant organization.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...settingsForm.register("enable_2fa")}
                      className="sr-only peer"
                      checked={settingsForm.watch("enable_2fa")}
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors ${
                        settingsForm.watch("enable_2fa")
                          ? "bg-[#23dce1]"
                          : "bg-[#c0c8e6]"
                      }`}
                    >
                      <div
                        className={`absolute top-[2px] left-[2px] bg-white rounded-full h-4 w-4 transition-transform ${
                          settingsForm.watch("enable_2fa")
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      ></div>
                    </div>
                  </label>
                </div>
              </div>*/}
            </div>
          )}

          {/* Footer Navigation */}
          <div className="flex justify-end gap-3 mt-6 pt-4">
            {currentStep > 1 && (
              <SecondaryButton onClick={handlePrevious} disabled={isSubmitting}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </SecondaryButton>
            )}
            {currentStep < 3 ? (
              <PrimaryButton onClick={handleNext} disabled={isSubmitting}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Tenant"}
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateTenantWizard;
