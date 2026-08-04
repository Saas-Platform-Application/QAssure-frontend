/**
 * FileVersionUploadModal
 * Specifically for uploading a new version of an existing file attachment.
 * Maps to POST /api/v1/files/:id/versions
 */

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactElement,
  useEffect,
} from "react";
import {
  Upload,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Modal,
  PrimaryButton,
  SecondaryButton,
  FormTextArea,
  FormTagInput,
} from "@/components/shared";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import fileAttachmentService, {
  type FileAttachment,
} from "@/services/file-attachment-service";

interface FileVersionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileAttachment;
  onUploaded?: (newFile: FileAttachment) => void;
}

const fileVersionSchema = z.object({
  description: z.string().max(500, "Notes must be at most 500 characters").optional(),
  tags: z.array(z.string()).default([]),
  file: z.any().refine((file) => !!file, "New file is required"),
});

type FileVersionFormData = z.infer<typeof fileVersionSchema>;

export const FileVersionUploadModal = ({
  isOpen,
  onClose,
  file,
  onUploaded,
}: FileVersionUploadModalProps): ReactElement | null => {
  // ── Form configuration ──
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FileVersionFormData>({
    resolver: zodResolver(fileVersionSchema) as any,
    defaultValues: {
      description: "",
      tags: file.tags || [],
      file: null,
    },
  });

  const selectedFile = watch("file");

  // ── Local UI state ──
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync tags if file prop changes
  useEffect(() => {
    if (isOpen) {
      setValue("tags", file.tags || []);
    }
  }, [isOpen, file.tags, setValue]);

  const handleClose = () => {
    if (isUploading) return;
    reset({
      description: "",
      tags: file.tags || [],
      file: null,
    });
    setUploadError(null);
    onClose();
  };

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) setValue("file", dropped, { shouldValidate: true });
    },
    [setValue]
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setValue("file", e.target.files[0], { shouldValidate: true });
    e.target.value = "";
  };

  const handleUpload = async (data: FileVersionFormData) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await fileAttachmentService.uploadVersion(file.id, data.file, {
        description: data.description?.trim() || undefined,
        tags: data.tags?.length ? data.tags : undefined,
        category: file.category,
      });

      onUploaded?.(res.data);
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Version upload failed";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload New Version"
      description={`Creating version ${file.version + 1} for ${file.original_name}`}
      maxWidth="md"
      footer={
        <>
          <SecondaryButton onClick={handleClose} disabled={isUploading}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            onClick={handleSubmit(handleUpload as any)}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Version
              </>
            )}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-[13px] font-medium text-[#0e1b2a] mb-2">Select New File <span className="text-[#e02424]">*</span></p>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-8 cursor-pointer transition-all",
              errors.file ? "border-[#ef4444] bg-[#ef4444]/5" : isDragging
                ? "border-[#084cc8] bg-[#084cc8]/5"
                : "border-[rgba(0,0,0,0.12)] hover:border-[#084cc8]/50 hover:bg-gray-50",
              selectedFile && !errors.file && "border-emerald-500/50 bg-emerald-50/10"
            )}
          >
            {selectedFile ? (
              <>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#0e1b2a] px-4 truncate max-w-[300px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-[#9aa6b2] mt-0.5">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button type="button" className="text-xs font-semibold text-[#084cc8] mt-2 underline">
                    Change file
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-[#084cc8]/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[#084cc8]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[#0e1b2a]">Click to upload or drag and drop</p>
                  <p className="text-xs text-[#9aa6b2] mt-0.5">
                    Supported: PDF, DOCX, XLSX, Images, etc.
                  </p>
                </div>
              </>
            )}
          </div>
          {errors.file && (
            <p className="text-xs text-[#ef4444] mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.file.message as string}
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={onInputChange}
          />
        </div>

        <div>
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <FormTagInput
                label="Tags"
                value={field.value || []}
                onChange={field.onChange}
                error={errors.tags?.message}
                placeholder="Add a tag..."
              />
            )}
          />
        </div>

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <FormTextArea
              label="Version Notes / Changes"
              {...field}
              disabled={isUploading}
              maxLength={500}
              rows={3}
              placeholder="What's new in this version?"
              error={errors.description?.message}
            />
          )}
        />

        {uploadError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
