import {
  useState,
  useEffect,
  type ImgHTMLAttributes,
  type ReactElement,
} from "react";
import { fileService } from "@/services/file-service";
import apiClient from "@/services/api-client";
import { Loader2, ImageIcon } from "lucide-react";
import { useEnabledServices } from "@/hooks/useEnabledServices";

// Global cache to persist blob URLs between component remounts (prevents re-fetching on every page click)
const BLOB_CACHE = new Map<string, string>();
const PENDING_REQUESTS = new Map<string, Promise<string>>();

interface AuthenticatedImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> {
  fileId?: string | null;
  src?: string | null;
  fallback?: ReactElement;
  tenantId?: string | null;
}

export const AuthenticatedImage = ({
  fileId,
  src,
  fallback,
  className,
  alt = "Image",
  tenantId,
  ...props
}: AuthenticatedImageProps): ReactElement => {
  const { isServiceEnabled } = useEnabledServices();
  const isFileServiceEnabled = isServiceEnabled("file_attachment");

  // Helper to extract fileId from backend preview URL
  const extractFileIdFromUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const match = url.match(/\/files\/([a-f0-9-]{36})\/preview/i);
    return match ? match[1] : null;
  };

  const extractedFileId = fileId || extractFileIdFromUrl(src);
  const cacheKey = extractedFileId || src;

  // 1. Initialize state from cache immediately to prevent blank flash or redundant requests on remount
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    return cacheKey ? BLOB_CACHE.get(cacheKey) || null : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Helper to check if URL is a backend URL that needs authentication
  const getIsBackendUrl = (url: string | null | undefined) => {
    if (!url) return false;

    const baseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
    const cleanBase = baseUrl.replace(/\/+$/, "");

    // 1. Precise match with configured base URL
    if (url.includes(`${cleanBase}/files/`) && url.includes("/preview"))
      return true;

    // 2. Fallback: Catch URLs pointing to any host with the expected API path structure
    // This handles cases where backend returns 'localhost' but frontend uses IP, or vice versa.
    const hasApiPath =
      url.includes("/api/v1/files/") && url.includes("/preview");

    // Also check if it's a relative path
    const isRelative =
      url.startsWith("/") &&
      url.includes("/files/") &&
      url.includes("/preview");

    return hasApiPath || isRelative;
  };

  const isBackendUrl = getIsBackendUrl(src);
  const isAuthRequired = !!(extractedFileId || isBackendUrl);

  useEffect(() => {
    const currentCachedUrl = cacheKey ? BLOB_CACHE.get(cacheKey) || null : null;

    // If it's already a blob URL (local preview) or a data URL, use it directly
    if (src && (src.startsWith("blob:") || src.startsWith("data:"))) {
      setBlobUrl(src);
      return;
    }

    if (!cacheKey) {
      setBlobUrl(null);
      return;
    }

    // 2. If we have a fileId or a backend URL, fetch it via authenticated request
    if (isAuthRequired) {
      if (!isFileServiceEnabled) {
        setError(true);
        return;
      }

      // If we already have the blobUrl for this cacheKey, use it and don't fetch
      if (currentCachedUrl) {
        setBlobUrl(currentCachedUrl);
        return;
      }

      // Otherwise, we need to fetch. Reset blobUrl to null first to show loading/fallback
      setBlobUrl(null);

      let isMounted = true;
      const fetchImage = async () => {
        // 3. Check if there's already a pending request for this same image
        if (PENDING_REQUESTS.has(cacheKey)) {
          try {
            const url = await PENDING_REQUESTS.get(cacheKey)!;
            if (isMounted) setBlobUrl(url);
            return;
          } catch (err) {
            if (isMounted) setError(true);
            return;
          }
        }

        setIsLoading(true);
        setError(false);
        try {
          const fetchPromise = (async () => {
            let url: string;
            if (extractedFileId) {
              url = await fileService.getPreview(extractedFileId, tenantId || undefined);
            } else {
              // If useBackendUrl is true, src is guaranteed to be non-null
              const headers = tenantId ? { "x-tenant-id": tenantId } : undefined;
              const response = await apiClient.get(src!, {
                responseType: "blob",
                headers,
              });
              url = URL.createObjectURL(response.data);
            }
            BLOB_CACHE.set(cacheKey, url);
            return url;
          })();

          PENDING_REQUESTS.set(cacheKey, fetchPromise);
          const url = await fetchPromise;
          PENDING_REQUESTS.delete(cacheKey);

          if (isMounted) {
            setBlobUrl(url);
          }
        } catch (err) {
          console.error("Failed to fetch authenticated image:", err);
          PENDING_REQUESTS.delete(cacheKey);
          if (isMounted) {
            setError(true);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      fetchImage();

      return () => {
        isMounted = false;
      };
    } else if (src) {
      // For other external URLs, use them directly
      setBlobUrl(src);
    }
  }, [fileId, src, cacheKey, isAuthRequired, tenantId, isFileServiceEnabled]);

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-[#f5f7fa] rounded-md ${className}`}
      >
        <Loader2 className="w-5 h-5 text-[#6b7280] animate-spin" />
      </div>
    );
  }

  if (error || (!blobUrl && !src)) {
    return (
      fallback || (
        <div
          className={`flex items-center justify-center bg-[#f5f7fa] rounded-md ${className}`}
        >
          <ImageIcon className="w-5 h-5 text-[#9ca3af]" />
        </div>
      )
    );
  }

  // IMPORTANT: For authenticated images, never use the raw 'src' in the <img> tag.
  // We only render if we have a valid blobUrl.
  const imageSrc = isAuthRequired ? blobUrl : blobUrl || src;

  if (isAuthRequired && !imageSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-[#f5f7fa] rounded-md ${className}`}
      >
        <Loader2 className="w-5 h-5 text-[#6b7280] animate-spin" />
      </div>
    );
  }

  return (
    <img src={imageSrc || ""} className={className} alt={alt} {...props} />
  );
};
