import { Layout } from "@/components/layout/Layout";
import { ImageIcon, Loader2, X } from "lucide-react";
import { useState, useEffect, type ReactElement } from "react";
import { useAppSelector, useAppDispatch } from "@/hooks/redux-hooks";
import { tenantService } from "@/services/tenant-service";
import { fileService } from "@/services/file-service";
import { showToast } from "@/utils/toast";
import { updateTheme } from "@/store/themeSlice";
import { PrimaryButton, AuthenticatedImage } from "@/components/shared";
import { generateUUID } from "@/lib/utils";
import type { Tenant } from "@/types/tenant";

// Helper function to get base URL with protocol
const getBaseUrlWithProtocol = (): string => {
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
};

export interface SettingsProps {
  customTenantId?: string;
  hideLayout?: boolean;
}

const Settings = ({ customTenantId, hideLayout = false }: SettingsProps = {}): ReactElement => {
  const authTenantId = useAppSelector((state) => state.auth.tenantId);
  const tenantId = customTenantId || authTenantId;
  const dispatch = useAppDispatch();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Tenant data
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // Color states
  const [primaryColor, setPrimaryColor] = useState<string>("#112868");
  const [secondaryColor, setSecondaryColor] = useState<string>("#23DCE1");
  const [accentColor, setAccentColor] = useState<string>("#084CC8");

  // Logo states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoFilePath, setLogoFilePath] = useState<string | null>(null);
  const [logoFileAttachmentUuid, setLogoFileAttachmentUuid] = useState<
    string | null
  >(null);
  const [logoFileUrl, setLogoFileUrl] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  // Favicon states
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconFilePath, setFaviconFilePath] = useState<string | null>(null);
  const [faviconFileAttachmentUuid, setFaviconFileAttachmentUuid] = useState<
    string | null
  >(null);
  const [faviconFileUrl, setFaviconFileUrl] = useState<string | null>(null);
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(
    null,
  );
  const [isUploadingFavicon, setIsUploadingFavicon] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [faviconError, setFaviconError] = useState<string | null>(null);

  // Fetch tenant data on mount
  useEffect(() => {
    const fetchTenant = async (): Promise<void> => {
      if (!tenantId) {
        setError("Tenant ID not found");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await tenantService.getById(tenantId);

        if (response.success && response.data) {
          const tenantData = response.data;
          setTenant(tenantData);

          // Set colors
          setPrimaryColor(tenantData.primary_color || "#112868");
          setSecondaryColor(tenantData.secondary_color || "#23DCE1");
          setAccentColor(tenantData.accent_color || "#084CC8");

          // Set logo
          if (tenantData.logo_file_path) {
            setLogoFileUrl(tenantData.logo_file_path);
            setLogoFilePath(tenantData.logo_file_path);
            setLogoFileAttachmentUuid(
              tenantData.logo_file_attachment_uuid || null,
            );
            setLogoError(null);
          }

          // Set favicon
          if (tenantData.favicon_file_path) {
            setFaviconFileUrl(tenantData.favicon_file_path);
            setFaviconFilePath(tenantData.favicon_file_path);
            setFaviconFileAttachmentUuid(
              tenantData.favicon_file_attachment_uuid || null,
            );
            setFaviconError(null);
          }
        }
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load tenant settings";
        setError(errorMessage);
        showToast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenant();
  }, [tenantId]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
      if (faviconPreviewUrl) {
        URL.revokeObjectURL(faviconPreviewUrl);
      }
    };
  }, [logoPreviewUrl, faviconPreviewUrl]);

  const handleLogoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      showToast.error("Logo file size must be less than 2MB");
      return;
    }

    // Validate file type
    const validTypes = [
      "image/png",
      "image/svg+xml",
      "image/jpeg",
      "image/jpg",
    ];
    if (!validTypes.includes(file.type)) {
      showToast.error("Logo must be PNG, SVG, or JPG format");
      return;
    }

    // Revoke previous preview URL
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setLogoFile(file);
    setLogoPreviewUrl(previewUrl);
    setIsUploadingLogo(true);

    try {
      const response = await fileService.upload(
        file,
        "tenant",
        generateUUID(),
        tenantId || undefined,
      );
      const fileId = response.data.id;
      setLogoFileAttachmentUuid(fileId);

      const baseUrl = getBaseUrlWithProtocol();
      const formattedUrl = `${baseUrl}/files/${fileId}/preview`;
      setLogoFilePath(formattedUrl);
      setLogoFileUrl(formattedUrl);

      setLogoError(null);
      showToast.success("Logo uploaded successfully");
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to upload logo. Please try again.";
      showToast.error(errorMessage);
      setLogoFile(null);
      URL.revokeObjectURL(previewUrl);
      setLogoPreviewUrl(null);
      setLogoFileUrl(null);
      setLogoFilePath(null);
      setLogoFileAttachmentUuid(null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleFaviconChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (500KB max)
    if (file.size > 500 * 1024) {
      showToast.error("Favicon file size must be less than 500KB");
      return;
    }

    // Validate file type
    const validTypes = [
      "image/x-icon",
      "image/png",
      "image/vnd.microsoft.icon",
    ];
    if (!validTypes.includes(file.type)) {
      showToast.error("Favicon must be ICO or PNG format");
      return;
    }

    // Revoke previous preview URL
    if (faviconPreviewUrl) {
      URL.revokeObjectURL(faviconPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setFaviconFile(file);
    setFaviconPreviewUrl(previewUrl);
    setIsUploadingFavicon(true);

    try {
      const response = await fileService.upload(
        file,
        "tenant",
        generateUUID(),
        tenantId || undefined,
      );
      const fileId = response.data.id;
      setFaviconFileAttachmentUuid(fileId);

      const baseUrl = getBaseUrlWithProtocol();
      const formattedUrl = `${baseUrl}/files/${fileId}/preview`;
      setFaviconFilePath(formattedUrl);
      setFaviconFileUrl(formattedUrl);

      setFaviconError(null);
      showToast.success("Favicon uploaded successfully");
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to upload favicon. Please try again.";
      showToast.error(errorMessage);
      setFaviconFile(null);
      URL.revokeObjectURL(previewUrl);
      setFaviconPreviewUrl(null);
      setFaviconFileUrl(null);
      setFaviconFilePath(null);
      setFaviconFileAttachmentUuid(null);
    } finally {
      setIsUploadingFavicon(false);
    }
  };

  const handleDeleteLogo = (): void => {
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoFileUrl(null);
    setLogoFilePath(null);
    setLogoFileAttachmentUuid(null);
    setLogoError(null);
    // Reset the file input
    const fileInput = document.getElementById(
      "logo-upload",
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
    setFaviconFilePath(null);
    setFaviconFileAttachmentUuid(null);
    setFaviconError(null);
    // Reset the file input
    const fileInput = document.getElementById(
      "favicon-upload",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!tenantId || !tenant) return;

    // Validate logo and favicon are uploaded
    setLogoError(null);
    setFaviconError(null);

    const isLogoMissing = !logoFilePath;
    const isFaviconMissing = !faviconFilePath;

    if (isLogoMissing) {
      setLogoError("Logo is required");
    }

    if (isFaviconMissing) {
      setFaviconError("Favicon is required");
    }

    if (isLogoMissing || isFaviconMissing) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Build update data matching EditTenantModal format
      const existingSettings =
        (tenant.settings as Record<string, unknown>) || {};
      const existingContact =
        (existingSettings.contact as Record<string, unknown>) || {};

      const updateData = {
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        domain: tenant.domain || null,
        subscription_tier: tenant.subscription_tier || null,
        max_users: tenant.max_users || null,
        max_modules: tenant.max_modules || null,
        settings: {
          enable_sso: tenant.enable_sso || false,
          enable_2fa: tenant.enable_2fa || false,
          contact: existingContact,
          branding: {
            primary_color: primaryColor || undefined,
            secondary_color: secondaryColor || undefined,
            accent_color: accentColor || undefined,
            logo_file_path: logoFilePath || undefined,
            logo_file_attachment_uuid: logoFileAttachmentUuid || undefined,
            favicon_file_path: faviconFilePath || undefined,
            favicon_file_attachment_uuid:
              faviconFileAttachmentUuid || undefined,
          },
        },
      };

      const response = await tenantService.update(tenantId, updateData);

      if (response.success) {
        showToast.success("Settings updated successfully");

        // Update theme in Redux for the active session, if not editing a different tenant context
        if (!customTenantId || customTenantId === authTenantId) {
          dispatch(
            updateTheme({
              logo_file_path: logoFilePath,
              favicon_file_path: faviconFilePath,
              primary_color: primaryColor,
              secondary_color: secondaryColor,
              accent_color: accentColor,
            }),
          );
        }

        // Update local tenant state
        setTenant({
          ...tenant,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          logo_file_path: logoFilePath,
          logo_file_attachment_uuid: logoFileAttachmentUuid,
          favicon_file_path: faviconFilePath,
          favicon_file_attachment_uuid: faviconFileAttachmentUuid,
        });
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update settings. Please try again.";
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout
        currentPage="Settings"
        pageHeader={{
          title: "Settings",
          description: "Manage your tenant settings",
        }}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-[#112868] animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error && !tenant) {
    return (
      <Layout
        currentPage="Settings"
        pageHeader={{
          title: "Settings",
          description: "Manage your tenant settings",
        }}
      >
        <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md">
          <p className="text-sm text-[#ef4444]">{error}</p>
        </div>
      </Layout>
    );
  }

  const content = (
    <div className="flex flex-col gap-6 w-full h-full">
      {error && (
        <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md">
          <p className="text-sm text-[#ef4444]">{error}</p>
        </div>
      )}

      {/* Tenant Details Section */}
      {tenant && (
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-4 md:p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-[#0f1724]">Tenant Details</h3>
            <p className="text-sm font-normal text-[#9ca3af]">
              General workspace details for this tenant.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0f1724]">Tenant Name</label>
              <input
                type="text"
                value={tenant.name}
                readOnly
                className="bg-[#f5f7fa] border border-[#d1d5db] h-10 px-3 py-1 rounded-md text-sm text-[#6b7280] w-full focus:outline-none cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0f1724]">Slug</label>
              <input
                type="text"
                value={tenant.slug}
                readOnly
                className="bg-[#f5f7fa] border border-[#d1d5db] h-10 px-3 py-1 rounded-md text-sm text-[#6b7280] w-full focus:outline-none cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}

      {/* Branding Section */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-4 md:p-6 flex flex-col gap-4">
          {/* Section Header */}
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-[#0f1724]">Branding</h3>
            <p className="text-sm font-normal text-[#9ca3af]">
              Customize logo, favicon, and colors for this tenant experience.
            </p>
          </div>

          {/* Logo and Favicon Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Logo */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#0f1724]">
                Company Logo <span className="text-[#e02424]">*</span>
              </label>
              <label
                htmlFor="logo-upload"
                className="bg-[#f5f7fa] border border-dashed border-[#d1d5db] rounded-md p-4 flex gap-4 items-center cursor-pointer hover:bg-[#e5e7eb] transition-colors"
              >
                <div className="bg-white border border-[#d1d5db] rounded-lg size-12 flex items-center justify-center shrink-0">
                  {isUploadingLogo ? (
                    <Loader2 className="w-5 h-5 text-[#6b7280] animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-[#6b7280]" />
                  )}
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
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/jpg"
                  onChange={handleLogoChange}
                  className="hidden"
                  disabled={isUploadingLogo}
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

            {/* Favicon */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#0f1724]">
                Favicon <span className="text-[#e02424]">*</span>
              </label>
              <label
                htmlFor="favicon-upload"
                className="bg-[#f5f7fa] border border-dashed border-[#d1d5db] rounded-md p-4 flex gap-4 items-center cursor-pointer hover:bg-[#e5e7eb] transition-colors"
              >
                <div className="bg-white border border-[#d1d5db] rounded-lg size-12 flex items-center justify-center shrink-0">
                  {isUploadingFavicon ? (
                    <Loader2 className="w-5 h-5 text-[#6b7280] animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-[#6b7280]" />
                  )}
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
                  id="favicon-upload"
                  type="file"
                  accept="image/x-icon,image/png,image/vnd.microsoft.icon"
                  onChange={handleFaviconChange}
                  className="hidden"
                  disabled={isUploadingFavicon}
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

          {/* Primary Color */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#0f1724]">
              Primary Color
            </label>
            <div className="flex gap-3 items-center">
              <div
                className="border border-[#d1d5db] rounded-md size-10 shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-[#f5f7fa] border border-[#d1d5db] h-10 px-3 py-1 rounded-md text-sm text-[#0f1724] w-full focus:outline-none focus:ring-2 focus:ring-[#112868] focus:border-transparent"
                  placeholder="#112868"
                />
              </div>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="size-10 rounded-md border border-[#d1d5db] cursor-pointer"
              />
            </div>
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
                  style={{ backgroundColor: secondaryColor }}
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="bg-[#f5f7fa] border border-[#d1d5db] h-10 px-3 py-1 rounded-md text-sm text-[#0f1724] w-full focus:outline-none focus:ring-2 focus:ring-[#112868] focus:border-transparent"
                    placeholder="#23DCE1"
                  />
                </div>
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="size-10 rounded-md border border-[#d1d5db] cursor-pointer"
                />
              </div>
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
                  style={{ backgroundColor: accentColor }}
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="bg-[#f5f7fa] border border-[#d1d5db] h-10 px-3 py-1 rounded-md text-sm text-[#0f1724] w-full focus:outline-none focus:ring-2 focus:ring-[#112868] focus:border-transparent"
                    placeholder="#084CC8"
                  />
                </div>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="size-10 rounded-md border border-[#d1d5db] cursor-pointer"
                />
              </div>
              <p className="text-xs font-normal text-[#9ca3af]">
                Used for alerts and special notices.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-[rgba(0,0,0,0.08)]">
            <PrimaryButton
              onClick={handleSave}
              disabled={isSaving || isUploadingLogo || isUploadingFavicon}
              className="px-6 py-2.5"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </PrimaryButton>
          </div>
        </div>
      </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <Layout
      currentPage="Settings"
      pageHeader={{
        title: "Settings",
        description: "Manage your tenant settings",
      }}
    >
      {content}
    </Layout>
  );
};

export default Settings;
