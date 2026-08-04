import { useEffect, useState } from "react";
import {
  Modal,
  DataTable,
  type Column,
  PrimaryButton,
  StatusBadge,
} from "@/components/shared";
import { aiService } from "@/services/ai-service";
import type { AIPrompt } from "@/types/ai";
import { showToast } from "@/utils/toast";
import { formatDate } from "@/utils/format-date";
import { RotateCcw } from "lucide-react";

interface PromptVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: AIPrompt | null;
  onRollbackSuccess: () => void;
}

export const PromptVersionsModal = ({
  isOpen,
  onClose,
  prompt,
  onRollbackSuccess,
}: PromptVersionsModalProps) => {
  const [versions, setVersions] = useState<AIPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const loadVersions = async () => {
    if (!prompt) return;
    setIsLoading(true);
    try {
      const data = await aiService.getVersions(prompt.id);
      setVersions(data);
    } catch (err: any) {
      showToast.error("Failed to load versions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && prompt) {
      void loadVersions();
    }
  }, [isOpen, prompt]);

  const handleRollback = async (version: number) => {
    if (!prompt) return;
    setIsRollingBack(true);
    try {
      await aiService.rollback(prompt.id, version);
      showToast.success(`Successfully rolled back to version ${version}`);
      onRollbackSuccess();
      onClose();
    } catch (err: any) {
      showToast.error("Failed to rollback version");
    } finally {
      setIsRollingBack(false);
    }
  };

  const columns: Column<AIPrompt>[] = [
    {
      key: "version",
      label: "Version",
      render: (row) => (
        <span className="font-semibold text-gray-900">v{row.version}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge variant={row.status === "active" ? "success" : "process"}>
          {row.status || "draft"}
        </StatusBadge>
      ),
    },
    {
      key: "change_notes",
      label: "Change Notes",
      render: (row) => (
        <span className="text-xs text-gray-500">{row.change_notes}</span>
      ),
    },
    // {
    //   key: "created_by_email",
    //   label: "Created By",
    //   render: (row) => <span className="text-xs text-gray-500">{row.created_by_email}</span>,
    // },
    {
      key: "updated_at",
      label: "Created At",
      render: (row) => (
        <span className="text-xs text-gray-500">
          {formatDate(row.updated_at || row.created_at || "")}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          {row.version !== prompt?.version && (
            <PrimaryButton
              size="small"
              className="h-8 text-[11px] bg-[#112868] hover:bg-[#0a1b4a]"
              onClick={() => handleRollback(row.version!)}
              disabled={isRollingBack}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Rollback
            </PrimaryButton>
          )}
          {row.version === prompt?.version && (
            <span className="text-[11px] font-medium text-gray-400 py-1 px-2 border border-gray-100 rounded bg-gray-50">
              Current
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Version History - ${prompt?.name}`}
      description="View previous versions of this prompt and rollback if needed."
      maxWidth="lg"
    >
      <div className="mx-3">
        <DataTable
          data={versions}
          columns={columns}
          keyExtractor={(item) => item.version?.toString() || item.id}
          isLoading={isLoading}
          emptyMessage="No version history available"
        />
      </div>
    </Modal>
  );
};
