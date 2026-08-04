/**
 * FileView — File Attachment Services › File Detail
 *
 * Matches the design image (second screen):
 * - Left: file preview (iframe for PDF/HTML, image for images, fallback for others)
 * - Right panel: File Details (description, category, tags, Properties, Metadata, Technical/Admin section)
 * - Bottom: Version History tab + Access Log tab
 * - Share button, Download button
 * - Admin sees stored path, SHA-256 checksum, edit metadata
 * - User only sees basic info
 */

import { useCallback, useEffect, useState, useRef, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import * as XLSX from "xlsx";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import {
  Download,
  Share2,
  ChevronLeft,
  FileText,
  Copy,
  X,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Plus,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { FileShareModal } from "@/components/shared/FileShareModal";
import { FileVersionUploadModal } from "@/components/shared/FileVersionUploadModal";
import { cn } from "@/lib/utils";
import fileAttachmentService, {
  type FileAttachment,
} from "@/services/file-attachment-service";
import type { RootState } from "@/store/store";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const categoryColors: Record<string, string> = {
  finance: "bg-purple-100 text-purple-700",
  marketing: "bg-orange-100 text-orange-700",
  hr: "bg-blue-100 text-blue-700",
  data: "bg-teal-100 text-teal-700",
  other: "bg-gray-100 text-gray-600",
};

function getCategoryStyle(cat?: string) {
  return (
    categoryColors[(cat || "").toLowerCase()] || "bg-gray-100 text-gray-600"
  );
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {});
}

function ExcelViewer({ arrayBuffer }: { arrayBuffer: ArrayBuffer }): ReactElement {
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [sheetsData, setSheetsData] = useState<Record<string, any[][]>>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);

  useEffect(() => {
    try {
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
      const data: Record<string, any[][]> = {};
      workbook.SheetNames.forEach((name) => {
        const worksheet = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
        data[name] = rows;
      });
      setSheetNames(workbook.SheetNames);
      setSheetsData(data);
      if (workbook.SheetNames.length > 0) {
        setSelectedSheet(workbook.SheetNames[0]);
      }
    } catch (e) {
      console.error("Failed to parse Excel workbook", e);
    }
  }, [arrayBuffer]);

  if (sheetNames.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400 font-medium">
        <Loader2 className="w-6 h-6 animate-spin text-[#084cc8] mr-2" />
        Loading spreadsheet data...
      </div>
    );
  }

  const rows = sheetsData[selectedSheet] || [];
  const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);

  const getColLabel = (index: number): string => {
    let label = "";
    let temp = index;
    while (temp >= 0) {
      label = String.fromCharCode((temp % 26) + 65) + label;
      temp = Math.floor(temp / 26) - 1;
    }
    return label;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden rounded-lg border border-slate-200">
      {/* Sheet Tabs */}
      {sheetNames.length > 1 && (
        <div className="flex gap-1.5 border-b border-slate-200 bg-white px-4 py-2 overflow-x-auto shrink-0 shadow-sm">
          {sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => setSelectedSheet(name)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                selectedSheet === name
                  ? "bg-[#084cc8] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Grid Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="inline-block min-w-full align-middle border border-slate-200 rounded-lg shadow-sm bg-white overflow-hidden">
          <table className="min-w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-500 font-semibold select-none">
                <th className="border border-slate-200 w-10 text-center bg-slate-150 font-bold sticky left-0 z-10"></th>
                {Array.from({ length: maxCols }).map((_, colIdx) => (
                  <th
                    key={colIdx}
                    className="border border-slate-200 px-3 py-2 text-center font-mono font-bold bg-slate-100 sticky top-0"
                  >
                    {getColLabel(colIdx)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={maxCols + 1} className="p-4 text-center text-slate-400 font-medium">
                    Empty sheet
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                    <td className="border border-slate-200 w-10 text-center font-mono font-bold bg-slate-50 sticky left-0 z-10 text-slate-400 select-none">
                      {rowIdx + 1}
                    </td>
                    {Array.from({ length: maxCols }).map((_, colIdx) => {
                      const val = row[colIdx];
                      return (
                        <td
                          key={colIdx}
                          className="border border-slate-200 px-3 py-2 text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
                        >
                          {val !== undefined && val !== null ? String(val) : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview component
// ─────────────────────────────────────────────────────────────────────────────
function FilePreviewPanel({ file }: { file: FileAttachment }): ReactElement {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [extractedHtml, setExtractedHtml] = useState<string | null>(null);
  const [docxData, setDocxData] = useState<ArrayBuffer | null>(null);
  const [excelData, setExcelData] = useState<ArrayBuffer | null>(null);
  const docxRef = useRef<HTMLDivElement>(null);

  const isWord = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ].includes(file.mime_type || "");

  const isExcel = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ].includes(file.mime_type || "");

  const isPdf = file.mime_type === "application/pdf";

  useEffect(() => {
    if (isWord && docxData && docxRef.current) {
      docxRef.current.innerHTML = "";
      import("docx-preview")
        .then(({ renderAsync }) => {
          renderAsync(docxData, docxRef.current!)
            .catch((e) => console.error("docx-preview failed", e));
        })
        .catch((e) => console.error("failed to dynamically import docx-preview", e));
    }
  }, [docxData, isWord]);

  useEffect(() => {
    const loadPreview = async () => {
      setLoading(true);
      setErr(false);
      setExtractedHtml(null);
      setPreviewUrl(undefined);
      setDocxData(null);
      setExcelData(null);

      const isOffice = isWord || isExcel;

      try {
        const url = await fileAttachmentService.getPreviewUrl(file.id);

        if (isOffice) {
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();

            if (isWord) {
              setDocxData(arrayBuffer);
            } else if (isExcel) {
              setExcelData(arrayBuffer);
            }
            URL.revokeObjectURL(url);
          } catch (extractionErr) {
            console.error("Client-side Office document parsing failed", extractionErr);
            setErr(true);
          }
        } else {
          setPreviewUrl(url);
        }
      } catch (error) {
        console.error("Preview load failed", error);
        setErr(true);
      } finally {
        setLoading(false);
      }
    };

    void loadPreview();

    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  const isImage = file.mime_type?.startsWith("image/");

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#084cc8] animate-spin" />
      </div>
    );
  }

  if (err || (!previewUrl && !extractedHtml && !docxData && !excelData)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#9aa6b2]">
        <FileText className="w-16 h-16 text-gray-200" />
        <p className="text-sm">Preview not available</p>
        <p className="text-xs text-center px-4">{file.mime_type}</p>
        <button
          onClick={() =>
            fileAttachmentService
              .download(file.id, file.original_name)
              .catch(() => {})
          }
          className="mt-2 h-8 px-4 bg-white border border-[rgba(0,0,0,0.12)] rounded-lg text-xs font-semibold text-[#0e1b2a] hover:bg-gray-50 transition-colors shadow-sm"
        >
          Download to View
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Zoom controls */}
      {isImage && (
        <div className="absolute top-3 right-3 z-10 flex gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="w-7 h-7 flex items-center justify-center bg-white/90 border border-[rgba(0,0,0,0.1)] rounded-md hover:bg-white shadow-sm"
          >
            <ZoomOut className="w-3.5 h-3.5 text-[#475569]" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="w-7 h-7 flex items-center justify-center bg-white/90 border border-[rgba(0,0,0,0.1)] rounded-md hover:bg-white shadow-sm"
          >
            <ZoomIn className="w-3.5 h-3.5 text-[#475569]" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="w-7 h-7 flex items-center justify-center bg-white/90 border border-[rgba(0,0,0,0.1)] rounded-md hover:bg-white shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#475569]" />
          </button>
        </div>
      )}

      {isImage ? (
        <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 p-4">
          <img
            src={previewUrl}
            alt={file.original_name}
            style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
            className="max-w-full rounded-lg shadow transition-transform duration-200"
          />
        </div>
      ) : isPdf && previewUrl ? (
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
          <div className="flex-1 overflow-hidden h-full w-full bg-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl h-full shadow-lg rounded-lg overflow-hidden bg-white">
              <Viewer fileUrl={previewUrl} />
            </div>
          </div>
        </Worker>
      ) : previewUrl ? (
        <iframe
          src={previewUrl}
          title={file.original_name}
          className="flex-1 w-full border-0 bg-white"
        />
      ) : isWord && docxData ? (
        <div className="flex-1 overflow-auto bg-white p-8">
          <div
            ref={docxRef}
            className="max-w-4xl mx-auto bg-white shadow-sm border border-gray-100 p-8 rounded-lg docx-container"
          />
        </div>
      ) : isExcel && excelData ? (
        <ExcelViewer arrayBuffer={excelData} />
      ) : extractedHtml ? (
        <div className="flex-1 overflow-auto bg-white p-8">
          <div
            className="max-w-4xl mx-auto prose prose-sm prose-slate bg-white shadow-sm border border-gray-100 p-8 rounded-lg"
            dangerouslySetInnerHTML={{ __html: extractedHtml }}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#9aa6b2] bg-gray-50">
          <FileText className="w-16 h-16 text-gray-200" />
          <p className="text-sm">Preview not available</p>
          <p className="text-xs text-[#c4cbd6]">{file.mime_type}</p>
          <button
            onClick={() =>
              fileAttachmentService
                .download(file.id, file.original_name)
                .catch(() => {})
            }
            className="mt-2 h-8 px-4 bg-white border border-[rgba(0,0,0,0.12)] rounded-lg text-xs font-semibold text-[#0e1b2a] hover:bg-gray-50 transition-colors shadow-sm"
          >
            Download to View
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Version Row
// ─────────────────────────────────────────────────────────────────────────────
function VersionRow({
  ver,
  onDownload,
}: {
  ver: FileAttachment;
  onDownload: () => void;
}): ReactElement {
  return (
    <tr className="border-b border-[rgba(0,0,0,0.05)] hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#0e1b2a]">
            v{ver.version}
          </span>
          {ver.is_current_version && (
            <span className="inline-flex items-center text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">
              Current
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-[#6b7280] whitespace-nowrap">
        {formatDate(ver.created_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
            {(ver.uploaded_by_email || "U")[0].toUpperCase()}
          </div>
          <span className="text-sm text-[#0e1b2a]">
            {ver.uploaded_by_email?.split("@")[0] || "Unknown"}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-[#6b7280]">
        {ver.file_size_formatted || formatBytes(ver.file_size)}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onDownload}
          className="text-sm font-medium text-[#084cc8] hover:underline"
        >
          Download
        </button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const FileView = (): ReactElement => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const permissions = useSelector((state: RootState) => state.auth.permissions);

  const isTenantAdmin = permissions.some(
    (p) =>
      (p.resource === "files" || p.resource === "*") &&
      (p.action === "update" || p.action === "*"),
  );

  // ── State ──
  const [file, setFile] = useState<FileAttachment | null>(null);
  const [versions, setVersions] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [copiedChecksum, setCopiedChecksum] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  // Metadata edit form
  const [draftDescription, setDraftDescription] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftTagInput, setDraftTagInput] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  // ── Load ──
  const loadFile = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [fileRes, versionsRes] = await Promise.all([
        fileAttachmentService.getById(id),
        fileAttachmentService.getVersionHistory(id),
      ]);
      setFile(fileRes.data);
      setVersions(versionsRes.data);
      setDraftDescription(fileRes.data.description || "");
      setDraftTags(fileRes.data.tags || []);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "File not found");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadFile();
  }, [loadFile]);

  const handleDownload = () => {
    if (file)
      fileAttachmentService
        .download(file.id, file.original_name)
        .catch(() => {});
  };

  const handleSaveMetadata = async () => {
    if (!file) return;
    setSavingMeta(true);
    try {
      await fileAttachmentService.updateMetadata(file.id, {
        description: draftDescription,
        tags: draftTags,
      });
      await loadFile();
      setEditingMetadata(false);
    } catch {
      // silence
    } finally {
      setSavingMeta(false);
    }
  };

  const copyChecksum = () => {
    if (file) {
      copyToClipboard(file.checksum);
      setCopiedChecksum(true);
      setTimeout(() => setCopiedChecksum(false), 1500);
    }
  };
  const copyPath = () => {
    if (file) {
      copyToClipboard(file.file_path);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 1500);
    }
  };

  if (isLoading) {
    return (
      <Layout currentPage="File Attachment Services">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-[#084cc8] animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !file) {
    return (
      <Layout currentPage="File Attachment Services">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-[#475569]">{error || "File not found"}</p>
          <button
            onClick={() => navigate("/tenant/files")}
            className="text-sm text-[#084cc8] hover:underline font-medium flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Files
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="File Attachment Services"
      breadcrumbs={[
        { label: "QAssure", path: "/" },
        { label: "File List", path: "/tenant/files" },
        { label: file.original_name },
      ]}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/tenant/files")}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b7280] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-red-50 border border-red-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#0e1b2a]">
                {file.original_name}
              </h1>
              <p className="text-xs text-[#9aa6b2]">
                {file.mime_type} ·{" "}
                {file.file_size_formatted || formatBytes(file.file_size)} ·
                Uploaded {formatDate(file.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVersionModalOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-3 border border-[rgba(0,0,0,0.1)] rounded-lg text-sm font-medium text-[#475569] hover:bg-gray-50 hover:border-[#084cc8]/30 transition-all font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            New Version
          </button>
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-3 border border-[rgba(0,0,0,0.1)] rounded-lg text-sm font-medium text-[#475569] hover:bg-gray-50 hover:border-[#084cc8]/30 transition-all font-semibold"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 h-9 px-4 bg-[#084cc8] hover:bg-[#0640aa] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* Main layout: preview + side panel */}
      <div className="flex gap-4 h-[calc(100vh-15rem)] min-h-0">
        {/* Preview panel */}
        <div className="flex-1 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(0,0,0,0.06)] shrink-0 bg-gray-50/30">
            <p className="text-xs font-semibold text-[#9aa6b2]">Preview</p>
          </div>
          <FilePreviewPanel file={file} />
        </div>

        {/* Right panel */}
        <div className="w-[320px] shrink-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
          {/* File Details */}
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#0e1b2a]">
                File Details
              </h3>
              {isTenantAdmin && !editingMetadata && (
                <button
                  onClick={() => {
                    setEditingMetadata(true);
                    setDraftDescription(file.description || "");
                    setDraftTags(file.tags || []);
                  }}
                  className="text-xs font-medium text-[#084cc8] hover:underline"
                >
                  Edit
                </button>
              )}
              {editingMetadata && (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveMetadata}
                    disabled={savingMeta}
                    className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-50"
                  >
                    {savingMeta ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingMetadata(false)}
                    className="text-xs text-[#9aa6b2] hover:text-[#0e1b2a]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-[#9aa6b2] uppercase tracking-wide mb-1">
                Description
              </p>
              {editingMetadata ? (
                <textarea
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full border border-[rgba(0,0,0,0.12)] rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#084cc8]/20"
                />
              ) : (
                <p className="text-sm text-[#475569] leading-relaxed">
                  {file.description || (
                    <span className="text-[#c4cbd6]">No description</span>
                  )}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-[#9aa6b2] uppercase tracking-wide mb-1">
                Category
              </p>
              {file.category ? (
                <span
                  className={cn(
                    "inline-block text-xs font-semibold rounded px-2 py-0.5 capitalize",
                    getCategoryStyle(file.category),
                  )}
                >
                  {file.category}
                </span>
              ) : (
                <span className="text-sm text-[#c4cbd6]">—</span>
              )}
            </div>

            {/* Tags */}
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-[#9aa6b2] uppercase tracking-wide mb-1.5">
                Tags
              </p>
              {editingMetadata ? (
                <div className="flex flex-wrap gap-1.5 border border-[rgba(0,0,0,0.12)] rounded-lg p-2 min-h-9 focus-within:ring-2 focus-within:ring-[#084cc8]/20">
                  {draftTags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-gray-100 text-xs font-medium rounded px-1.5 py-0.5"
                    >
                      {t}
                      <button
                        onClick={() =>
                          setDraftTags((prev) => prev.filter((x) => x !== t))
                        }
                      >
                        <X className="w-3 h-3 text-[#9aa6b2]" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={draftTagInput}
                    onChange={(e) => setDraftTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        const t = draftTagInput.trim();
                        if (t && !draftTags.includes(t))
                          setDraftTags((prev) => [...prev, t]);
                        setDraftTagInput("");
                      }
                    }}
                    placeholder="Add..."
                    className="flex-1 min-w-12 text-sm outline-none bg-transparent placeholder:text-[#c4cbd6]"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(file.tags || []).length > 0 ? (
                    file.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block bg-gray-100 text-[#475569] text-xs font-medium rounded px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#c4cbd6]">No tags</span>
                  )}
                </div>
              )}
            </div>

            {/* Properties */}
            <div className="border-t border-[rgba(0,0,0,0.06)] pt-3 mb-3">
              <p className="text-[11px] font-semibold text-[#9aa6b2] uppercase tracking-wide mb-2">
                Properties
              </p>
              <div className="space-y-1.5">
                {[
                  { label: "Entity Type", value: file.entity_type },
                  {
                    label: "Entity ID",
                    value: file.entity_id?.substring(0, 8) + "…",
                  },
                  { label: "Source Module", value: file.source_module },
                  { label: "Version", value: `v${file.version}` },
                  { label: "Downloads", value: String(file.download_count) },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center"
                  >
                    <span className="text-xs text-[#9aa6b2]">{label}</span>
                    <span className="text-xs font-medium text-[#0e1b2a]">
                      {value || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata */}
            {file.metadata && Object.keys(file.metadata).length > 0 && (
              <div className="border-t border-[rgba(0,0,0,0.06)] pt-3 mb-3">
                <p className="text-[11px] font-semibold text-[#9aa6b2] uppercase tracking-wide mb-2">
                  Metadata
                </p>
                <div className="space-y-1">
                  {Object.entries(file.metadata).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-xs text-[#9aa6b2] font-mono">
                        {k}:
                      </span>
                      <span className="text-xs font-medium text-[#0e1b2a] font-mono max-w-[140px] truncate">
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical — Admin Only */}
            {isTenantAdmin && (
              <div className="border-t border-[rgba(0,0,0,0.06)] pt-3">
                <p className="text-[11px] font-semibold text-[#9aa6b2] uppercase tracking-wide mb-2">
                  Technical (Admin)
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-[#9aa6b2] mb-1 uppercase font-bold tracking-widest">
                      Stored Path
                    </p>
                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 border border-[rgba(0,0,0,0.04)]">
                      <code className="text-[10px] text-[#475569] flex-1 truncate font-mono">
                        {file.file_path}
                      </code>
                      <button
                        onClick={copyPath}
                        className="shrink-0 text-[#9aa6b2] hover:text-[#084cc8]"
                      >
                        {copiedPath ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  {file.checksum && (
                    <div>
                      <p className="text-[10px] text-[#9aa6b2] mb-1 uppercase font-bold tracking-widest text">
                        SHA-256 Checksum
                      </p>
                      <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 border border-[rgba(0,0,0,0.04)]">
                        <code className="text-[10px] text-[#475569] flex-1 truncate font-mono">
                          {file.checksum}
                        </code>
                        <button
                          onClick={copyChecksum}
                          className="shrink-0 text-[#9aa6b2] hover:text-[#084cc8]"
                        >
                          {copiedChecksum ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version History */}
      <div className="mt-4 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl overflow-hidden">
        <div className="flex border-b border-[rgba(0,0,0,0.08)] bg-gray-50/20">
          <div className="flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 border-[#084cc8] text-[#084cc8]">
            <RefreshCw className="w-3.5 h-3.5" />
            Version History
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.06)]">
                {["Version", "Date", "Uploader", "Size", "Action"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[11px] font-semibold text-[#9aa6b2] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {versions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-[#9aa6b2]"
                  >
                    No version history available
                  </td>
                </tr>
              ) : (
                versions.map((ver) => (
                  <VersionRow
                    key={ver.id}
                    ver={ver}
                    onDownload={() =>
                      fileAttachmentService
                        .download(ver.id, ver.original_name)
                        .catch(() => {})
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isShareModalOpen && file && (
        <FileShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          file={file}
        />
      )}

      {isVersionModalOpen && file && (
        <FileVersionUploadModal
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
          file={file}
          onUploaded={(newFile) => {
            navigate(`/tenant/files/${newFile.id}`);
          }}
        />
      )}
    </Layout>
  );
};

export default FileView;
