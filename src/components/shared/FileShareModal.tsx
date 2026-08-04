import React, { useState } from "react";
import {
  Share2,
  Calendar,
  Download,
  Copy,
  Check,
  Loader2,
  Clock,
  Shield,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal, CustomButton } from "./";
import { useAppTheme } from "@/hooks/useAppTheme";
import fileAttachmentService, { type FileAttachment } from "@/services/file-attachment-service";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

interface FileShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileAttachment;
}

export const FileShareModal: React.FC<FileShareModalProps> = ({
  isOpen,
  onClose,
  file,
}) => {
  const [expiresInHours, setExpiresInHours] = useState<number>(24);
  const [maxDownloads, setMaxDownloads] = useState<number | "">("");
  const permissions = "download";
  const { primaryColor } = useAppTheme();
  
  const [isSharing, setIsSharing] = useState(false);
  const [shareData, setShareData] = useState<{ url: string; token: string; id: string } | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateShare = async () => {
    setIsSharing(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
      const res = await fileAttachmentService.createShare(file.id, {
        share_type: "link",
        permissions,
        expires_in_hours: expiresInHours || undefined,
        max_downloads: maxDownloads === "" ? null : Number(maxDownloads),
      });

      const fullUrl = `${baseUrl}/files/shared/${res.data.share_token}`;
      setShareData({ url: fullUrl, token: res.data.share_token, id: res.data.id });
    } catch (error) {
      console.error("Failed to share:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!shareData) return;
    
    setIsRevoking(true);
    try {
      await fileAttachmentService.revokeShare(shareData.id);
      setShareData(null);
      setShowRevokeConfirm(false);
    } catch (error) {
      console.error("Failed to revoke share:", error);
      alert("Failed to revoke share link. Please try again.");
    } finally {
      setIsRevoking(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareData) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareData.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = shareData.url;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (copyErr) {
        console.error("Fallback copy failed:", copyErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share File"
      description={file.original_name}
      maxWidth="md"
      preventCloseOnClickOutside={showRevokeConfirm}
    >
      <div className="space-y-4">
        {!shareData ? (
          <>
            {/* Expiry */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#9aa6b2] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Expires In
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 24, 72, 168].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setExpiresInHours(h)}
                    className={cn(
                      "py-2 text-xs font-medium rounded-lg border transition-all cursor-pointer",
                      expiresInHours === h 
                        ? "text-white shadow-sm"
                        : "border-[rgba(0,0,0,0.08)] text-[#475569] hover:bg-gray-50"
                    )}
                    style={expiresInHours === h ? { 
                      backgroundColor: primaryColor,
                      borderColor: primaryColor
                    } : {}}
                  >
                    {h === 1 ? "1 Hr" : h === 24 ? "1 Day" : h === 72 ? "3 Days" : "7 Days"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Max Downloads */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#9aa6b2] uppercase tracking-wider flex items-center gap-2">
                  <Download className="w-3 h-3" />
                  Max Downloads
                </label>
                <input
                  type="number"
                  value={maxDownloads}
                  onChange={(e) => setMaxDownloads(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Unlimited"
                  className="w-full h-10 border border-[rgba(0,0,0,0.12)] rounded-lg px-3 text-sm focus:outline-none focus:ring-1 transition-all"
                  style={{ 
                    '--tw-ring-color': primaryColor,
                    borderColor: 'rgba(0,0,0,0.12)'
                  } as React.CSSProperties}
                />
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#9aa6b2] uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  Permission
                </label>
                <div className="w-full h-10 border border-[rgba(0,0,0,0.08)] bg-gray-50/50 rounded-lg px-3 flex items-center gap-2 text-sm text-[#475569] font-medium">
                  <Download className="w-3.5 h-3.5 text-[#9aa6b2]" />
                  Download
                </div>
              </div>
            </div>

            <CustomButton
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleCreateShare}
              isLoading={isSharing}
              leftIcon={<Share2 className="w-4 h-4" />}
              className="rounded-xl shadow-lg"
              style={{ boxShadow: `${primaryColor}33 0px 8px 24px` }}
            >
              Generate Secure Link
            </CustomButton>
          </>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-sm font-bold text-emerald-800">Share Link Generated</p>
              </div>
              <p className="text-xs text-emerald-600/80 leading-relaxed">
                Anyone with this link can {permissions === 'download' ? 'download' : 'view'} the file 
                until {new Date(Date.now() + expiresInHours * 3600000).toLocaleString()}.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#9aa6b2] uppercase tracking-widest">Share URL</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-11 bg-gray-50 border border-[rgba(0,0,0,0.08)] rounded-xl px-3 flex items-center overflow-hidden">
                  <code 
                    className="text-[11px] truncate font-mono"
                    style={{ color: primaryColor }}
                  >
                    {shareData.url}
                  </code>
                </div>
                <button
                  onClick={copyToClipboard}
                  className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                    copied ? "bg-emerald-500 text-white shadow-emerald-500/30" : "text-white hover:scale-105"
                  )}
                  style={!copied ? { backgroundColor: primaryColor, boxShadow: `${primaryColor}4D 0px 4px 12px` } : {}}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <CustomButton
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setShareData(null)}
                >
                  Create Another
                </CustomButton>
                <CustomButton
                  variant="outline"
                  className="px-4 rounded-xl"
                  leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  onClick={() => window.open(shareData.url, '_blank')}
                >
                  Test Link
                </CustomButton>
              </div>
              
              <button
                onClick={() => setShowRevokeConfirm(true)}
                disabled={isRevoking}
                className="w-full h-10 border border-red-100 bg-red-50/50 hover:bg-red-50 rounded-xl text-xs font-bold text-red-600 transition-all flex items-center justify-center gap-2"
              >
                {isRevoking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Revoke Link (Stop Sharing)"
                )}
              </button>
            </div>
          </div>
        )}

        <div className="pt-4 mt-6 border-t border-[rgba(0,0,0,0.06)] flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#9aa6b2]" />
          <p className="text-[10px] text-[#9aa6b2] leading-tight">
            Links are automatically revoked after expiration or reaching max downloads for security.
          </p>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showRevokeConfirm}
        onClose={() => setShowRevokeConfirm(false)}
        onConfirm={handleRevokeShare}
        title="Revoke Share Link"
        message="Are you sure you want to revoke this share link? It will stop working immediately."
        isLoading={isRevoking}
      />
    </Modal>
  );
};
