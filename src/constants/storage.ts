/**
 * Object Storage Constants — QAssure Frontend
 *
 * Single source of truth for storage-backend labels and presets, shared by the
 * SuperAdmin bucket pages and the tenant Storage Configuration page so a new
 * backend only has to be described once.
 */

export type StorageType = "azure" | "local" | "s3" | "gcp" | "e2e";

export const STORAGE_TYPES: StorageType[] = ["azure", "s3", "gcp", "e2e", "local"];

interface StorageTypeMeta {
  /** Full name, used in detail views and headings */
  label: string;
  /** Compact name, used in table badges */
  shortLabel: string;
  /** Tailwind classes for the badge in list views */
  badgeClass: string;
  /** Tailwind classes for the config panel in the create/edit form */
  panelClass: string;
  /** Tailwind classes for the config panel heading */
  panelHeadingClass: string;
}

export const STORAGE_TYPE_META: Record<StorageType, StorageTypeMeta> = {
  azure: {
    label: "Azure Blob Storage",
    shortLabel: "Azure Blob",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    panelClass: "bg-blue-50 border-blue-200",
    panelHeadingClass: "text-blue-700",
  },
  s3: {
    label: "Amazon S3",
    shortLabel: "Amazon S3",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    panelClass: "bg-orange-50 border-orange-200",
    panelHeadingClass: "text-orange-700",
  },
  gcp: {
    label: "Google Cloud Storage (GCS)",
    shortLabel: "GCS",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    panelClass: "bg-green-50 border-green-200",
    panelHeadingClass: "text-green-700",
  },
  e2e: {
    label: "E2E Networks Object Storage (EOS)",
    shortLabel: "E2E EOS",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    panelClass: "bg-violet-50 border-violet-200",
    panelHeadingClass: "text-violet-700",
  },
  local: {
    label: "Local Filesystem",
    shortLabel: "Local FS",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    panelClass: "bg-gray-50 border-gray-200",
    panelHeadingClass: "text-gray-700",
  },
};

/** Options for the Storage Type dropdown, in display order. */
export const STORAGE_TYPE_OPTIONS = STORAGE_TYPES.map((value) => ({
  value,
  label: STORAGE_TYPE_META[value].label,
}));

/** Falls back to the raw value so an unrecognised backend still renders. */
export const getStorageTypeLabel = (type?: string): string =>
  STORAGE_TYPE_META[type as StorageType]?.label ?? type ?? "Unknown";

export const getStorageTypeShortLabel = (type?: string): string =>
  STORAGE_TYPE_META[type as StorageType]?.shortLabel ?? type ?? "Unknown";

export const getStorageTypeBadgeClass = (type?: string): string =>
  STORAGE_TYPE_META[type as StorageType]?.badgeClass ??
  "bg-gray-100 text-gray-700 border-gray-200";

// ─────────────────────────────────────────────
// E2E Networks Object Storage (EOS / Vyoma)
// https://docs.e2enetworks.com/docs/myaccount/storage/object_storage/
// ─────────────────────────────────────────────

export const E2E_DEFAULT_ENDPOINT = "https://objectstore.e2enetworks.net";

/** EOS ignores AWS regions; this label is only used for SigV4 signing. */
export const E2E_DEFAULT_REGION = "us-east-1";

/**
 * Known EOS S3 endpoints. "Custom" lets an admin type a private/VPC endpoint
 * instead of picking one of the published regional hosts.
 */
export const E2E_ENDPOINT_PRESETS = [
  { value: "https://objectstore.e2enetworks.net", label: "Default — objectstore.e2enetworks.net" },
  { value: "https://mum-objectstore.e2enetworks.net", label: "Mumbai — mum-objectstore.e2enetworks.net" },
  { value: "https://ndl-objectstore.e2enetworks.net", label: "Delhi — ndl-objectstore.e2enetworks.net" },
  { value: "custom", label: "Custom endpoint…" },
];
