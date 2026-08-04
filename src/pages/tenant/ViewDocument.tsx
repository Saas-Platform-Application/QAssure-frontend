import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  FormSelect,
  FormField,
  Modal,
  PrimaryButton,
  SecondaryButton,
  CustomButton,
  RichTextEditor,
  type Column,
} from "@/components/shared";
import {
  documentService,
  type FileAttachmentItem,
} from "@/services/document-service";
import { workflowService } from "@/services/workflow-service";
import { electronicSignatureService } from "@/services/electronic-signature-service";
import type { DocumentDetail, DocumentVersion, DocumentSection, DocumentComment } from "@/types/document";
import type { WorkflowInstance } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { showToast } from "@/utils/toast";
import { useAppTheme } from "@/hooks/useAppTheme";
import { CheckCircle, MessageSquare, Paperclip, Plus, User, XCircle, RotateCcw, ShieldCheck } from "lucide-react";

const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type DocumentAction =
  | "submit"
  | "approve"
  | "reject"
  | "effective"
  | "obsolete"
  | "checkout"
  | "checkin";

const ACTION_LABELS: Record<DocumentAction, string> = {
  submit: "Submit For Review",
  approve: "Approve",
  reject: "Reject",
  effective: "Make Effective",
  obsolete: "Make Obsolete",
  checkout: "Checkout",
  checkin: "Checkin",
};

const ViewDocument = (): ReactElement => {
  const { primaryColor } = useAppTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "sections" | "comments" | "version-history" | "workflow-history"
  >("overview");
  const [workflowHistory, setWorkflowHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [activeAction, setActiveAction] = useState<DocumentAction | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [workflowDefinitionId, setWorkflowDefinitionId] = useState("");
  const [workflowOptions, setWorkflowOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [actionComment, setActionComment] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [actionPassword, setActionPassword] = useState("");
  const [actionPin, setActionPin] = useState("");
  const [showNewVersionForm, setShowNewVersionForm] = useState(false);
  const [newVersionContent, setNewVersionContent] = useState("");
  const [newVersionContentHtml, setNewVersionContentHtml] = useState("");
  const [newVersionChangeReason, setNewVersionChangeReason] =
    useState("minor_edit");
  const [newVersionChangeSummary, setNewVersionChangeSummary] = useState("");
  const [isMajorVersion, setIsMajorVersion] = useState(false);
  const [versionErrors, setVersionErrors] = useState<Record<string, string>>(
    {},
  );
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [isVersionSaving, setIsVersionSaving] = useState(false);
  const [showWorkflowTracker, setShowWorkflowTracker] = useState(false);
  const [workflowInstance, setWorkflowInstance] =
    useState<WorkflowInstance | null>(null);
  const [isWorkflowLoading, setIsWorkflowLoading] = useState(false);

  // Sections & Comments state
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [isSectionsLoading, setIsSectionsLoading] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionContent, setEditingSectionContent] = useState("");
  const [isSectionSaving, setIsSectionSaving] = useState(false);

  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [selectedSectionForComment, setSelectedSectionForComment] = useState<string | "">("");

  // File attachment fields for new version
  const [versionFiles, setVersionFiles] = useState<FileAttachmentItem[]>([]);
  const [versionSelectedFileId, setVersionSelectedFileId] = useState("");
  const [versionFileName, setVersionFileName] = useState("");
  const [transitionComment, setTransitionComment] = useState("");
  const [transitionPassword, setTransitionPassword] = useState("");
  const [transitionPin, setTransitionPin] = useState("");
  const [transitionSignatureAction, setTransitionSignatureAction] = useState<
    'APPROVE' | 'REJECT' | 'REVIEW' | 'AUTHOR' | 'VERIFY' | 'RELEASE' | 'ACKNOWLEDGE' | 'WITHDRAW'
  >("APPROVE");
  const [selectedWorkflowAction, setSelectedWorkflowAction] =
    useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [versionFilePath, setVersionFilePath] = useState("");
  const [versionFileSize, setVersionFileSize] = useState<number | undefined>(
    undefined,
  );
  const [versionMimeType, setVersionMimeType] = useState("");
  const [versionFileHash, setVersionFileHash] = useState("");
  const [isLoadingVersionFiles, setIsLoadingVersionFiles] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadDocument = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const [documentRes, versionsRes] = await Promise.all([
          documentService.getById(id),
          documentService.getVersions(id),
        ]);
        setDocument(documentRes.data);
        setVersions(versionsRes.data || []);
      } catch (err: any) {
        const message =
          err?.response?.data?.error?.message ||
          "Failed to load document details";
        setError(message);
        showToast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadDocument();
    void loadVersionFiles();
  }, [id]);

  useEffect(() => {
    if (activeTab === "workflow-history" && id) {
      void loadWorkflowHistory();
    }
    if (activeTab === "sections" && id) {
      void (async () => {
        setIsSectionsLoading(true);
        try {
          const res = await documentService.getSections(id);
          setSections(res.data || []);
        } catch {
          showToast.error("Failed to load sections");
        } finally {
          setIsSectionsLoading(false);
        }
      })();
    }
    if (activeTab === "comments" && id) {
      void (async () => {
        setIsCommentsLoading(true);
        try {
          const res = await documentService.listComments(id);
          setComments(res.data || []);
        } catch {
          showToast.error("Failed to load comments");
        } finally {
          setIsCommentsLoading(false);
        }
      })();
    }
  }, [activeTab, id]);

  const loadWorkflowHistory = async (): Promise<void> => {
    if (!document?.workflow_instance_id) {
      setWorkflowHistory([]);
      return;
    }

    try {
      setIsHistoryLoading(true);
      const res = await workflowService.getInstanceHistory(
        document.workflow_instance_id,
      );
      const history = res.data || [];

      // Sort history descending by default
      const sortedHistory = [...history].sort(
        (a: any, b: any) =>
          new Date(b.performed_at).getTime() -
          new Date(a.performed_at).getTime(),
      );

      setWorkflowHistory(sortedHistory);
    } catch {
      setWorkflowHistory([]);
      showToast.error("Failed to load workflow history");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const loadVersionFiles = async (): Promise<void> => {
    setIsLoadingVersionFiles(true);
    try {
      const res = await documentService.listFiles();
      setVersionFiles(res.data || []);
    } catch {
      // silent
    } finally {
      setIsLoadingVersionFiles(false);
    }
  };

  const handleVersionFileSelect = async (fileId: string): Promise<void> => {
    setVersionSelectedFileId(fileId);
    if (!fileId) {
      setVersionFileName("");
      setVersionFilePath("");
      setVersionFileSize(undefined);
      setVersionMimeType("");
      setVersionFileHash("");
      return;
    }

    const selected = versionFiles.find((f) => f.id === fileId);
    if (!selected) return;

    setVersionFileName(selected.original_name);
    setVersionFilePath(selected.file_path);
    setVersionFileSize(selected.file_size);
    setVersionMimeType(selected.mime_type);
    setVersionFileHash(selected.checksum);

    try {
      showToast.success(
        `Extracting content from "${selected.original_name}"...`,
      );
      const res = await documentService.getFileContent(fileId);
      if (res.success && res.data) {
        setNewVersionContentHtml(res.data.html || "");
        setNewVersionContent(res.data.text || "");
        showToast.success(`Content loaded from "${selected.original_name}"`);
      } else {
        showToast.error("Failed to extract file content");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || "Failed to extract file content";
      showToast.error(msg);
      const html = `<p>Document sourced from file: <strong>${selected.original_name}</strong></p>`;
      setNewVersionContentHtml(html);
      setNewVersionContent(
        `Document sourced from file: ${selected.original_name}`,
      );
    }
  };

  const refreshData = async (): Promise<void> => {
    if (!id) return;
    const [documentRes, versionsRes] = await Promise.all([
      documentService.getById(id),
      documentService.getVersions(id),
    ]);
    setDocument(documentRes.data);
    setVersions(versionsRes.data || []);
  };

  const openWorkflowTracker = async (instanceId?: string): Promise<void> => {
    const targetId = instanceId || document?.workflow_instance_id;
    if (!targetId) {
      showToast.error("No workflow instance associated with this document");
      return;
    }
    try {
      setIsWorkflowLoading(true);
      setShowWorkflowTracker(true);
      const res = await workflowService.getInstance(targetId);
      setWorkflowInstance(res.data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        "Failed to load workflow tracker";
      showToast.error(msg);
      setShowWorkflowTracker(false);
    } finally {
      setIsWorkflowLoading(false);
    }
  };

  const resetActionModal = (): void => {
    setActiveAction(null);
    setWorkflowDefinitionId("");
    setActionComment("");
    setEffectiveDate("");
    setActionPassword("");
    setActionPin("");
    setWorkflowOptions([]);
    setActionErrors({});
  };

  const openActionModal = async (action: DocumentAction): Promise<void> => {
    if (action === "checkin") {
      await handleAction(action);
      return;
    }
    setActiveAction(action);
    if (action === "submit") {
      try {
        const response = await workflowService.listDefinitions({
          status: "active",
          entity_type: "document",
          source_module_id: document?.source_module_id || undefined,
          limit: 100,
          offset: 0,
        });
        setWorkflowOptions(
          (response.data || []).map((definition) => ({
            value: definition.id,
            label: `${definition.name} (${definition.code})`,
          })),
        );
      } catch {
        setWorkflowOptions([]);
        showToast.error("Failed to load active workflow definitions");
      }
    }
  };

  const handleAction = async (action: DocumentAction): Promise<void> => {
    if (!id) return;

    setActionErrors({});
    const localErrors: Record<string, string> = {};

    if (action === "submit" && !workflowDefinitionId) {
      showToast.error("workflow_definition_id is required");
      return;
    }
    if (action === "reject" && !actionComment.trim()) {
      localErrors.comment = "Reason is required for reject";
    }
    if (action === "effective") {
      if (!effectiveDate) {
        localErrors.effective_date = "Effective date is required";
      }
      if (!actionPassword.trim()) {
        localErrors.password = "Password is required for electronic signature";
      }
    }
    if (action === "obsolete" && !actionComment.trim()) {
      localErrors.comment = "Reason is required to obsolete";
    }
    if (action === "checkout" && !actionComment.trim()) {
      localErrors.comment = "Reason is required for checkout";
    }

    if (Object.keys(localErrors).length > 0) {
      setActionErrors(localErrors);
      return;
    }

    try {
      setIsActionLoading(true);
      if (action === "submit")
        await documentService.submitForReview(id, workflowDefinitionId);
      if (action === "approve")
        await documentService.approve(id, actionComment);
      if (action === "reject") {
        await documentService.reject(id, actionComment.trim());
      }
      if (action === "effective") {
        const currentVersionObj = versions.find(
          (v) => v.version_number === document?.current_version
        ) || versions[0];
        const currentVersionId = currentVersionObj?.id;

        if (!currentVersionId) {
          showToast.error("Current document version could not be resolved.");
          return;
        }

        // Generate electronic signature
        const signRes = await electronicSignatureService.sign({
          resource_type: "document_version",
          resource_id: currentVersionId,
          resource_name: `${document?.document_number || "Document"} - Version ${document?.current_version || "1.0"} - Make Effective`,
          action: "RELEASE",
          meaning: "I authorize the release of this record",
          password: actionPassword.trim(),
          pin: actionPin.trim() || null,
          auth_method: actionPin.trim() ? "password_pin" : "password",
        });

        const finalSignatureId = signRes.data?.id || signRes.data?.signature?.id;

        if (!finalSignatureId) {
          showToast.error("Failed to generate electronic signature.");
          return;
        }

        await documentService.makeEffective(
          id,
          effectiveDate,
          finalSignatureId,
        );
      }
      if (action === "obsolete") {
        await documentService.makeObsolete(id, actionComment.trim());
      }
      if (action === "checkout")
        await documentService.checkout(id, actionComment.trim());
      if (action === "checkin") await documentService.checkin(id);

      showToast.success("Document action completed");
      await refreshData();
      resetActionModal();
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message || "Failed to execute action",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreateVersion = async (): Promise<void> => {
    if (!id) return;

    // Clear previous errors
    setVersionErrors({});
    const localErrors: Record<string, string> = {};

    if (!newVersionChangeReason) {
      localErrors.change_reason = "Change reason is required";
    }
    if (!newVersionContent.trim()) {
      localErrors.content = "Document content is required";
    }

    if (Object.keys(localErrors).length > 0) {
      setVersionErrors(localErrors);
      return;
    }

    try {
      setIsVersionSaving(true);
      await documentService.createVersion(id, {
        content: newVersionContent.trim(),
        content_html: newVersionContentHtml.trim() || undefined,
        change_reason: newVersionChangeReason,
        change_summary: newVersionChangeSummary.trim() || undefined,
        is_major_version: isMajorVersion,
        file_name: versionFileName || undefined,
        file_path: versionFilePath || undefined,
        file_size: versionFileSize,
        mime_type: versionMimeType || undefined,
        file_hash: versionFileHash || undefined,
      });
      showToast.success("New version created successfully");
      setShowNewVersionForm(false);
      setNewVersionChangeSummary("");
      setIsMajorVersion(false);
      setVersionSelectedFileId("");
      setVersionFileName("");
      setVersionFilePath("");
      setVersionFileSize(undefined);
      setVersionMimeType("");
      setVersionFileHash("");
      await refreshData();
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message || "Failed to create version",
      );
    } finally {
      setIsVersionSaving(false);
    }
  };

  const handleWorkflowTransition = async (): Promise<void> => {
    if (!workflowInstance || !selectedWorkflowAction) return;

    const pendingTask = workflowInstance.tasks.find(
      (t) => t.status === "pending",
    );
    if (!pendingTask) {
      showToast.error("No pending task found for this workflow instance");
      return;
    }

    if (selectedWorkflowAction.requires_comment && !transitionComment.trim()) {
      showToast.error("Comments are required for this action");
      return;
    }

    if (selectedWorkflowAction.requires_signature) {
      if (!transitionPassword.trim()) {
        showToast.error("Password is required for electronic signature");
        return;
      }
    }

    let signatureId: string | undefined = undefined;

    try {
      setIsTransitioning(true);

      if (selectedWorkflowAction.requires_signature) {
        // 1. Check if signature is already available for this resource
        try {
          const sigsRes = await electronicSignatureService.getResourceSignatures("workflow_task", pendingTask.id);
          const validSigs = sigsRes.data?.signatures || sigsRes.data || [];
          const activeSig = validSigs.find((s: any) => s.is_valid);
          if (activeSig) {
            signatureId = activeSig.id;
          }
        } catch (e) {
          console.warn("Failed to check existing signatures", e);
        }

        // 2. If no valid signature exists, create one
        if (!signatureId) {
          const signRes = await electronicSignatureService.sign({
            resource_type: "workflow_task",
            resource_id: pendingTask.id,
            resource_name: `${document?.title || "Document"} - ${selectedWorkflowAction.name || selectedWorkflowAction.action}`,
            action: transitionSignatureAction,
            meaning: selectedWorkflowAction.signature_meaning || `I ${selectedWorkflowAction.action} this workflow step`,
            password: transitionPassword,
            pin: transitionPin || null,
            auth_method: transitionPin ? "password_pin" : "password",
            workflow_id: workflowInstance.id
          });
          signatureId = signRes.data?.id || signRes.data?.signature?.id;
        }
      }

      await workflowService.transition(workflowInstance.id, {
        task_id: pendingTask.id,
        action: selectedWorkflowAction.action,
        comments: transitionComment.trim() || undefined,
        signature_id: signatureId,
        signature_action: selectedWorkflowAction.requires_signature ? transitionSignatureAction : undefined,
        password: selectedWorkflowAction.requires_signature ? transitionPassword : undefined,
        pin: selectedWorkflowAction.requires_signature ? transitionPin : undefined,
      });

      showToast.success(`Action "${selectedWorkflowAction.name}" completed`);

      // Refresh workflow instance data
      const res = await workflowService.getInstance(workflowInstance.id);
      setWorkflowInstance(res.data);

      // Reset transition state
      setSelectedWorkflowAction(null);
      setTransitionComment("");
      setTransitionPassword("");
      setTransitionPin("");
      setTransitionSignatureAction("APPROVE");

      // Also refresh document data as it might have changed status
      await refreshData();
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message ||
          "Failed to complete workflow action",
      );
    } finally {
      setIsTransitioning(false);
    }
  };

  const versionColumns: Column<DocumentVersion>[] = [
    { key: "version_number", label: "Version" },
    { key: "status", label: "Status" },
    {
      key: "change_summary",
      label: "Change Summary",
      render: (version) => version.change_summary || "-",
    },
    {
      key: "change_reason",
      label: "Change Reason",
      render: (version) => version.change_reason || "-",
    },
    {
      key: "module_name",
      label: "Module",
      render: (version) => version.module_name || "Platform",
    },
    {
      key: "created_by",
      label: "Author",
      render: (version) => version.created_by || "-",
    },
    {
      key: "created_at",
      label: "Created At",
      render: (version) => formatDateTime(version.created_at),
    },
  ];

  return (
    <Layout
      currentPage="Document Service"
      breadcrumbs={[
        { label: "Document Service", path: "/tenant/documents" },
        { label: "View Document" },
      ]}
      pageHeader={{
        title: document?.title || "View Document",
        description: "View document metadata and version history.",
        action: (
          <div className="flex items-center gap-2">
            {document?.status === "draft" && (
              <div className="flex items-center gap-2">
                <CustomButton
                  variant="secondary"
                  onClick={() => navigate(`/tenant/documents/edit/${id}`)}
                >
                  Edit Document
                </CustomButton>
                <CustomButton
                  variant="primary"
                  onClick={() => void openActionModal("submit")}
                >
                  {ACTION_LABELS["submit"]}
                </CustomButton>
              </div>
            )}
            {document?.status === "in_review" && (
              <div className="flex items-center gap-2">
                <CustomButton
                  variant="primary"
                  onClick={() => void openWorkflowTracker()}
                >
                  Workflow Status
                </CustomButton>
                <CustomButton
                  variant="success"
                  onClick={() => void openActionModal("approve")}
                >
                  {ACTION_LABELS["approve"]}
                </CustomButton>
                <CustomButton
                  variant="danger"
                  onClick={() => void openActionModal("reject")}
                >
                  {ACTION_LABELS["reject"]}
                </CustomButton>
              </div>
            )}
            {document?.status === "approved" && (
              <div className="flex items-center gap-2">
                <CustomButton
                  variant="primary"
                  onClick={() => void openActionModal("effective")}
                >
                  {ACTION_LABELS["effective"]}
                </CustomButton>
                <CustomButton
                  variant="danger"
                  onClick={() => void openActionModal("reject")}
                >
                  {ACTION_LABELS["reject"]}
                </CustomButton>
              </div>
            )}
            {document?.status === "effective" && (
              <CustomButton
                variant="danger"
                onClick={() => void openActionModal("obsolete")}
              >
                {ACTION_LABELS["obsolete"]}
              </CustomButton>
            )}
          </div>
        ),
      }}
    >
      <div className="space-y-4">
        {/* Governance Highlight */}
        <div 
          className="flex items-center gap-3 p-4 rounded-lg border"
          style={{ 
            backgroundColor: `${primaryColor}0D`,
            borderColor: `${primaryColor}33`,
          }}
        >
          <div 
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}1A` }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: primaryColor }}>
              Governed Document Workflow
            </p>
            <p className="text-xs text-[#6b7280]">
              Approved document becomes official governed output for the source application.
            </p>
          </div>
        </div>

        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#0f1724]">
                Document Properties
              </h3>
              <p className="text-xs text-[#6b7280] mt-1">
                Details and classification for{" "}
                {document?.document_number || "-"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-medium">
              {document?.status || "draft"}
            </span>
            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium">
              {document?.document_type || "-"}
            </span>
            <span
              className="px-2 py-1 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: `${primaryColor}1A`,
                color: primaryColor,
              }}
            >
              v{document?.current_version || "-"}
            </span>
            {document?.module_name && (
              <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[11px] font-medium">
                {document.module_name}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] p-5">
          <div className="flex items-center gap-5 border-b border-[rgba(0,0,0,0.08)] mb-4 overflow-x-auto">
            <button
              type="button"
              className={`text-sm pb-2 transition-colors whitespace-nowrap`}
              style={{
                color: activeTab === "overview" ? primaryColor : "#6b7280",
                borderBottom:
                  activeTab === "overview"
                    ? `2px solid ${primaryColor}`
                    : "none",
              }}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              className={`text-sm pb-2 transition-colors whitespace-nowrap`}
              style={{
                color: activeTab === "sections" ? primaryColor : "#6b7280",
                borderBottom:
                  activeTab === "sections"
                    ? `2px solid ${primaryColor}`
                    : "none",
              }}
              onClick={() => setActiveTab("sections")}
            >
              Sections{sections.length > 0 ? ` (${sections.length})` : ""}
            </button>
            <button
              type="button"
              className={`text-sm pb-2 transition-colors whitespace-nowrap`}
              style={{
                color: activeTab === "comments" ? primaryColor : "#6b7280",
                borderBottom:
                  activeTab === "comments"
                    ? `2px solid ${primaryColor}`
                    : "none",
              }}
              onClick={() => setActiveTab("comments")}
            >
              Comments{comments.length > 0 ? ` (${comments.length})` : ""}
            </button>
            <button
              type="button"
              className={`text-sm pb-2 transition-colors whitespace-nowrap`}
              style={{
                color:
                  activeTab === "version-history" ? primaryColor : "#6b7280",
                borderBottom:
                  activeTab === "version-history"
                    ? `2px solid ${primaryColor}`
                    : "none",
              }}
              onClick={() => setActiveTab("version-history")}
            >
              Version History
            </button>
            <button
              type="button"
              className={`text-sm pb-2 transition-colors whitespace-nowrap`}
              style={{
                color:
                  activeTab === "workflow-history" ? primaryColor : "#6b7280",
                borderBottom:
                  activeTab === "workflow-history"
                    ? `2px solid ${primaryColor}`
                    : "none",
              }}
              onClick={() => setActiveTab("workflow-history")}
            >
              Workflow History
            </button>
          </div>

          {isLoading ? (
            <div className="text-sm text-[#6b7280]">Loading document...</div>
          ) : error ? (
            <div className="text-sm text-[#ef4444]">{error}</div>
          ) : document ? (
            <>
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div>
                      <span className="text-[#9aa6b2]">Document Number:</span>
                      <p className="text-[#0f1724]">
                        {document.document_number}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#9aa6b2]">Title:</span>
                      <p className="text-[#0f1724]">{document.title}</p>
                    </div>
                    <div>
                      <span className="text-[#9aa6b2]">Category:</span>
                      <p className="text-[#0f1724]">
                        {document.category?.name || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#9aa6b2]">Department:</span>
                      <p className="text-[#0f1724]">
                        {document.department || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#9aa6b2]">Effective Date:</span>
                      <p className="text-[#0f1724]">
                        {formatDateTime(document.effective_date)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#9aa6b2]">Next Review Date:</span>
                      <p className="text-[#0f1724]">
                        {formatDateTime(document.next_review_date)}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-[#9aa6b2]">Tags:</span>
                      <p className="text-[#0f1724]">
                        {document.tags && document.tags.length > 0
                          ? document.tags.join(", ")
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "sections" && (
                <div className="space-y-3">
                  {isSectionsLoading ? (
                    <div className="text-sm text-[#6b7280] py-4">Loading sections...</div>
                  ) : sections.length === 0 ? (
                    <div className="text-center py-10 text-sm text-[#6b7280]">
                      No sections defined for this document.
                    </div>
                  ) : (
                    sections.map((sec) => {
                      const statusColor =
                        sec.review_status === "reviewed"
                          ? "bg-emerald-50 border-emerald-200"
                          : sec.review_status === "rework"
                          ? "bg-amber-50 border-amber-200"
                          : "bg-white border-[rgba(0,0,0,0.08)]";
                      const isEditing = editingSectionId === sec.id;
                      return (
                        <div
                          key={sec.id}
                          className={`border rounded-lg p-4 transition-colors ${statusColor}`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {sec.section_number && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] shrink-0">
                                  §{sec.section_number}
                                </span>
                              )}
                              <h4 className="text-sm font-semibold text-[#0f1724] truncate">
                                {sec.title || "Untitled Section"}
                              </h4>
                              {sec.is_mandatory && (document.status === "in_review" || document.status === "draft") && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-red-50 text-red-500 border border-red-100 rounded shrink-0">
                                  Required
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Status badge - only in review/draft */}
                              {(document.status === "in_review" || document.status === "draft") && (
                                <span
                                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                    sec.review_status === "reviewed"
                                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                      : sec.review_status === "rework"
                                      ? "bg-amber-100 text-amber-700 border-amber-200"
                                      : "bg-gray-100 text-gray-500 border-gray-200"
                                  }`}
                                >
                                  {sec.review_status}
                                </span>
                              )}
                              {/* Actions available only in review */}
                              {document.status === "in_review" && (
                                <div className="flex items-center gap-2">
                                  {/* Mark reviewed */}
                                  {sec.review_status !== "reviewed" && id && (
                                    <button
                                      type="button"
                                      title="Mark as Reviewed"
                                      className="p-1 rounded hover:bg-emerald-100 text-emerald-600 transition-colors"
                                      onClick={async () => {
                                        try {
                                          const res = await documentService.markSectionStatus(id, sec.id, "reviewed");
                                          setSections((prev) =>
                                            prev.map((s) => (s.id === sec.id ? res.data : s))
                                          );
                                          showToast.success("Section marked as reviewed");
                                        } catch (e: any) {
                                          showToast.error(e?.response?.data?.error?.message || "Failed to update section");
                                        }
                                      }}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  {/* Mark for rework */}
                                  {sec.review_status !== "rework" && id && (
                                    <button
                                      type="button"
                                      title="Mark for Rework"
                                      className="p-1 rounded hover:bg-amber-100 text-amber-600 transition-colors"
                                      onClick={async () => {
                                        try {
                                          const res = await documentService.markSectionStatus(id, sec.id, "rework");
                                          setSections((prev) =>
                                            prev.map((s) => (s.id === sec.id ? res.data : s))
                                          );
                                          showToast.success("Section marked for rework");
                                        } catch (e: any) {
                                          showToast.error(e?.response?.data?.error?.message || "Failed to update section");
                                        }
                                      }}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  {/* Reset to pending */}
                                  {sec.review_status !== "pending" && id && (
                                    <button
                                      type="button"
                                      title="Reset to Pending"
                                      className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors"
                                      onClick={async () => {
                                        try {
                                          const res = await documentService.markSectionStatus(id, sec.id, "pending");
                                          setSections((prev) =>
                                            prev.map((s) => (s.id === sec.id ? res.data : s))
                                          );
                                          showToast.success("Section reset to pending");
                                        } catch (e: any) {
                                          showToast.error(e?.response?.data?.error?.message || "Failed to update section");
                                        }
                                      }}
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {/* Edit toggle */}
                                  {id && (
                                    <button
                                      type="button"
                                      className="text-xs font-medium px-2 py-1 rounded border border-[rgba(0,0,0,0.08)] hover:bg-gray-50 text-[#475569] transition-colors"
                                      onClick={() => {
                                        if (isEditing) {
                                          setEditingSectionId(null);
                                        } else {
                                          setEditingSectionId(sec.id);
                                          setEditingSectionContent(sec.content || "");
                                        }
                                      }}
                                    >
                                      {isEditing ? "Cancel" : "Edit"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Section content */}
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                rows={6}
                                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md text-sm focus:outline-none focus:ring-2 resize-none"
                                style={{ boxShadow: `0 0 0 0px ${primaryColor}33` }}
                                value={editingSectionContent}
                                onChange={(e) => setEditingSectionContent(e.target.value)}
                              />
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  disabled={isSectionSaving}
                                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-opacity disabled:opacity-60"
                                  style={{ backgroundColor: primaryColor }}
                                  onClick={async () => {
                                    if (!id) return;
                                    setIsSectionSaving(true);
                                    try {
                                      const res = await documentService.updateSection(id, sec.id, {
                                        content: editingSectionContent,
                                      });
                                      setSections((prev) =>
                                        prev.map((s) => (s.id === sec.id ? res.data : s))
                                      );
                                      setEditingSectionId(null);
                                      showToast.success("Section updated");
                                    } catch (e: any) {
                                      showToast.error(e?.response?.data?.error?.message || "Failed to save section");
                                    } finally {
                                      setIsSectionSaving(false);
                                    }
                                  }}
                                >
                                  {isSectionSaving ? "Saving..." : "Save"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-[#374151] whitespace-pre-wrap">
                              {sec.content || <span className="italic text-[#94a3b8]">No content</span>}
                            </p>
                          )}

                          {/* Add comment to this section (only in review) */}
                          {document.status === "in_review" && (
                            <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] flex justify-end">
                              <button
                                type="button"
                                className="flex items-center gap-1 text-[11px] text-[#6b7280] hover:text-[#0f1724] transition-colors"
                                onClick={() => {
                                  setSelectedSectionForComment(sec.id);
                                  setActiveTab("comments");
                                }}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Add comment
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "comments" && (
                <div className="space-y-4">
                  {/* Add comment form (only in review) */}
                  {document.status === "in_review" ? (
                    <div className="border border-[rgba(0,0,0,0.08)] rounded-lg p-4 bg-[#f9fafb] space-y-3">
                      <h4 className="text-xs font-semibold text-[#0f1724]">Add Comment</h4>
                      {sections.length > 0 && (
                        <select
                          className="h-9 w-full px-3 border border-[rgba(0,0,0,0.08)] rounded-md text-xs bg-white focus:outline-none"
                          value={selectedSectionForComment}
                          onChange={(e) => setSelectedSectionForComment(e.target.value)}
                        >
                          <option value="">Document-level comment</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.section_number ? `§${s.section_number} — ` : ""}{s.title || "Untitled Section"}
                            </option>
                          ))}
                        </select>
                      )}
                      <textarea
                        rows={3}
                        placeholder="Write a comment..."
                        className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md text-sm focus:outline-none resize-none"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={isAddingComment || !newCommentText.trim()}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-60 transition-opacity"
                          style={{ backgroundColor: primaryColor }}
                          onClick={async () => {
                            if (!id || !newCommentText.trim()) return;
                            setIsAddingComment(true);
                            try {
                              const res = await documentService.addComment(id, {
                                comment_text: newCommentText.trim(),
                                section_id: selectedSectionForComment || undefined,
                              });
                              setComments((prev) => [...prev, res.data]);
                              setNewCommentText("");
                              showToast.success("Comment added");
                            } catch (e: any) {
                              showToast.error(e?.response?.data?.error?.message || "Failed to add comment");
                            } finally {
                              setIsAddingComment(false);
                            }
                          }}
                        >
                          {isAddingComment ? "Posting..." : "Post Comment"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#6b7280] italic px-1">
                      Commenting is only available during the review phase.
                    </div>
                  )}

                  {/* Comment list */}
                  {isCommentsLoading ? (
                    <div className="text-sm text-[#6b7280] py-4">Loading comments...</div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-sm text-[#6b7280]">No comments yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => {
                        const sectionName = sections.find((s) => s.id === c.section_id)?.title;
                        return (
                          <div
                            key={c.id}
                            className={`border rounded-lg p-4 ${
                              c.status === "resolved"
                                ? "border-[rgba(0,0,0,0.06)] bg-[#f9fafb] opacity-70"
                                : "border-[rgba(0,0,0,0.08)] bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Meta */}
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-[11px] font-semibold text-[#0f1724]">
                                    {c.author_name || c.authored_by}
                                  </span>
                                  {sectionName && (
                                    <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 rounded px-1.5 py-0.5">
                                      §{sectionName}
                                    </span>
                                  )}
                                  {c.workflow_step && (
                                    <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 rounded px-1.5 py-0.5">
                                      {c.workflow_step}
                                    </span>
                                  )}
                                  {c.status === "resolved" && (
                                    <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 rounded px-1.5 py-0.5">
                                      Resolved
                                    </span>
                                  )}
                                  <span className="text-[10px] text-[#94a3b8] ml-auto">
                                    {c.created_at ? new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                  </span>
                                </div>
                                <p className="text-sm text-[#374151]">{c.comment_text}</p>
                              </div>
                              {/* Resolve button (only in review) */}
                              {c.status === "open" && id && document.status === "in_review" && (
                                <button
                                  type="button"
                                  title="Resolve comment"
                                  className="shrink-0 p-1 rounded hover:bg-emerald-100 text-emerald-600 transition-colors"
                                  onClick={async () => {
                                    try {
                                      const res = await documentService.resolveComment(id, c.id);
                                      setComments((prev) =>
                                        prev.map((cm) => (cm.id === c.id ? res.data : cm))
                                      );
                                      showToast.success("Comment resolved");
                                    } catch (e: any) {
                                      showToast.error(e?.response?.data?.error?.message || "Failed to resolve comment");
                                    }
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "version-history" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-white text-xs hover:opacity-90 transition-colors"
                      style={{ backgroundColor: primaryColor }}
                      onClick={() => {
                        setShowNewVersionForm((prev) => !prev);
                        setNewVersionContent(document.content || "");
                        setNewVersionContentHtml(document.content_html || "");
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Version
                    </button>
                  </div>
                  {showNewVersionForm && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                      {/* Main Form Area */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-sm overflow-hidden">
                          <div className="p-6 border-b border-[rgba(0,0,0,0.08)] bg-gray-50/50">
                            <h4 className="text-base font-semibold text-[#0f1724]">
                              Update Document Content
                            </h4>
                            <p className="text-xs text-[#6b7280] mt-1">
                              Modify the document content or load it from an
                              existing file attachment.
                            </p>
                          </div>

                          <div className="p-6 space-y-6">
                            {/* File Attachment Selection */}
                            <div className="border border-[rgba(0,0,0,0.08)] rounded-lg p-4 bg-[#f8fafc]/50">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-[#112868]/10 rounded-md">
                                  <Paperclip className="w-4 h-4 text-[#112868]" />
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-[#0f1724]">
                                    Load Content From File
                                  </span>
                                  <p className="text-xs text-[#6b7280]">
                                    Extract text directly from an uploaded PDF
                                    or Word document.
                                  </p>
                                </div>
                              </div>
                              <FormSelect
                                label=""
                                value={versionSelectedFileId}
                                onValueChange={(val) =>
                                  void handleVersionFileSelect(val)
                                }
                                options={[
                                  { value: "", label: "— No file selected —" },
                                  ...versionFiles.map((f) => ({
                                    value: f.id,
                                    label: `${f.original_name} (${f.file_size_formatted})`,
                                  })),
                                ]}
                                placeholder={
                                  isLoadingVersionFiles
                                    ? "Loading files..."
                                    : "Search and select a file..."
                                }
                              />
                              {versionSelectedFileId && (
                                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 p-3 bg-white border border-[rgba(0,0,0,0.08)] rounded-md text-[11px]">
                                  <div>
                                    <span className="text-gray-400">
                                      File Name:
                                    </span>{" "}
                                    <span className="text-[#0f1724] font-medium">
                                      {versionFileName}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">
                                      File Size:
                                    </span>{" "}
                                    <span className="text-[#0f1724] font-medium">
                                      {versionFileSize
                                        ? `${(versionFileSize / 1024 / 1024).toFixed(2)} MB`
                                        : "-"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">
                                      MIME Type:
                                    </span>{" "}
                                    <span className="text-[#0f1724] font-medium">
                                      {versionMimeType}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">
                                      Checksum:
                                    </span>{" "}
                                    <span className="text-[#0f1724] font-mono">
                                      {versionFileHash?.substring(0, 12)}...
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <RichTextEditor
                              label="Document Content"
                              value={newVersionContentHtml}
                              required
                              minHeightClassName="h-[500px] overflow-y-auto"
                              onChange={(html, text) => {
                                setNewVersionContentHtml(html);
                                setNewVersionContent(text);
                                if (text.trim())
                                  setVersionErrors((prev) => ({
                                    ...prev,
                                    content: "",
                                  }));
                              }}
                              error={versionErrors.content}
                            />

                            {/* Version Reason and Increment Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#f8fafc]/30">
                              <div className="space-y-2">
                                <FormSelect
                                  label="Change Reason"
                                  required
                                  options={[
                                    {
                                      value: "minor_edit",
                                      label: "minor_edit",
                                    },
                                    {
                                      value: "correction",
                                      label: "correction",
                                    },
                                    {
                                      value: "regulatory_update",
                                      label: "regulatory_update",
                                    },
                                    {
                                      value: "major_rewrite",
                                      label: "major_rewrite",
                                    },
                                  ]}
                                  value={newVersionChangeReason}
                                  onValueChange={(val) => {
                                    setNewVersionChangeReason(val);
                                    if (val)
                                      setVersionErrors((prev) => ({
                                        ...prev,
                                        change_reason: "",
                                      }));
                                  }}
                                  placeholder="Select change reason"
                                  error={versionErrors.change_reason}
                                />
                                <p className="text-[10px] text-[#6b7280]">
                                  Select a reason category such as minor_edit,
                                  correction, etc.
                                </p>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-[13px] font-semibold text-[#0f1724]">
                                    Major Version?
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setIsMajorVersion(!isMajorVersion)
                                    }
                                    className={cn(
                                      "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                      isMajorVersion
                                        ? "bg-[#112868]"
                                        : "bg-gray-200",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                        isMajorVersion
                                          ? "translate-x-4"
                                          : "translate-x-0",
                                      )}
                                    />
                                  </button>
                                </div>

                                <div className="h-10 px-3 flex items-center justify-between bg-white border border-[rgba(0,0,0,0.08)] rounded-md shadow-sm">
                                  <span className="text-[11px] font-medium text-[#475569]">
                                    {isMajorVersion ? "Major" : "Minor"}{" "}
                                    Increment
                                  </span>
                                  <span className="text-[11px] font-bold text-[#0f1724]">
                                    {`${document?.current_version || "0.0"} to ${(() => {
                                      if (!document?.current_version)
                                        return isMajorVersion ? "1.0" : "0.1";
                                      const parts = document.current_version
                                        .replace("v", "")
                                        .split(".");
                                      let major = parseInt(parts[0]) || 0;
                                      let minor = parseInt(parts[1]) || 0;
                                      if (isMajorVersion) {
                                        major++;
                                        minor = 0;
                                      } else {
                                        minor++;
                                      }
                                      return `${major}.${minor}`;
                                    })()}`}
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#6b7280] leading-tight">
                                  {isMajorVersion
                                    ? "Incrementing to a major version indicates significant changes or a full document overhaul."
                                    : `Turn on major versioning to increment to v${(parseInt((document?.current_version || "0.0").split(".")[0]) || 0) + 1}.0 instead of a minor revision.`}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[13px] font-semibold text-[#0f1724]">
                                Change Summary
                              </label>
                              <textarea
                                rows={3}
                                value={newVersionChangeSummary}
                                onChange={(event) =>
                                  setNewVersionChangeSummary(event.target.value)
                                }
                                placeholder="Provide a brief, professional summary of what has changed in this version..."
                                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-lg text-sm focus:ring-1 focus:ring-[#112868]/20 focus:outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="p-6 py-4 border-t border-[rgba(0,0,0,0.08)] bg-gray-50/50 flex justify-end gap-3">
                            <SecondaryButton
                              onClick={() => setShowNewVersionForm(false)}
                            >
                              Discard Draft
                            </SecondaryButton>
                            <PrimaryButton
                              onClick={() => void handleCreateVersion()}
                              disabled={isVersionSaving}
                              className="px-8"
                            >
                              {isVersionSaving
                                ? "Creating..."
                                : "Save New Version"}
                            </PrimaryButton>
                          </div>
                        </div>
                      </div>

                      {/* Right Sidebar */}
                      <div className="space-y-5">
                        {/* Version Context Card */}
                        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-sm overflow-hidden">
                          <div className="p-5 border-b border-[rgba(0,0,0,0.08)]">
                            <h4 className="text-sm font-bold text-[#0f1724]">
                              Version Context
                            </h4>
                            <p className="text-[11px] text-[#6b7280] mt-0.5">
                              Reference information for current revision.
                            </p>
                          </div>
                          <div className="p-5 pt-4 space-y-4">
                            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#084cc8]/5 text-[#084cc8] text-[11px] font-bold border border-[#084cc8]/10 w-full justify-center">
                              Checked Out for Editing
                            </div>

                            <div className="space-y-3">
                              {[
                                {
                                  label: "Document Number",
                                  value: document?.document_number,
                                },
                                {
                                  label: "Current Version",
                                  value: `v${document?.current_version || "-"}`,
                                },
                                {
                                  label: "Next Version",
                                  value: (() => {
                                    if (!document?.current_version)
                                      return isMajorVersion ? "v1.0" : "v0.1";
                                    const parts = document.current_version
                                      .replace("v", "")
                                      .split(".");
                                    let major = parseInt(parts[0]) || 0;
                                    let minor = parseInt(parts[1]) || 0;
                                    if (isMajorVersion) {
                                      major++;
                                      minor = 0;
                                    } else {
                                      minor++;
                                    }
                                    return `v${major}.${minor}`;
                                  })(),
                                },
                                {
                                  label: "Document Type",
                                  value: document?.document_type,
                                },
                                {
                                  label: "Owner",
                                  value: document?.owner?.name || "-",
                                },
                                {
                                  label: "Department",
                                  value: document?.department || "-",
                                },
                              ].map((item, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                                >
                                  <span className="text-[11px] text-[#6b7280] font-medium">
                                    {item.label}
                                  </span>
                                  <span className="text-[11px] text-[#0f1724] font-bold">
                                    {item.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Review Notes Card */}
                        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-sm p-5 space-y-4">
                          <div>
                            <h4 className="text-sm font-bold text-[#0f1724]">
                              Review Notes
                            </h4>
                            <p className="text-[11px] text-[#6b7280] mt-0.5 leading-relaxed">
                              Creating a new draft revision will automatically
                              trigger the following system actions:
                            </p>
                          </div>

                          <div className="space-y-2">
                            {[
                              "Status resets to Draft",
                              "Workflow restarts",
                              "Version history retained",
                            ].map((note, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100/50"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-[#112868]/40" />
                                <span className="text-[11px] font-semibold text-[#475569]">
                                  {note}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="border border-[rgba(0,0,0,0.08)] rounded-lg overflow-hidden">
                    <DataTable
                      data={versions}
                      columns={versionColumns}
                      keyExtractor={(version) => version.id}
                      emptyMessage="No versions found"
                      isLoading={isLoading}
                    />
                  </div>
                </div>
              )}
              {activeTab === "workflow-history" && (
                <div className="space-y-4">
                  <div className="border border-[rgba(0,0,0,0.08)] rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Event
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Activity/Step
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Performed By
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Comments
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {isHistoryLoading ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-4 text-center text-xs text-gray-500"
                            >
                              Loading history...
                            </td>
                          </tr>
                        ) : workflowHistory.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-4 text-center text-xs text-gray-500"
                            >
                              No workflow history found.
                            </td>
                          </tr>
                        ) : (
                          workflowHistory.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3 whitespace-nowrap text-[11px] text-gray-500">
                                {formatDateTime(item.performed_at)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    item.event_type === "workflow_started"
                                      ? "bg-blue-100 text-blue-700"
                                      : item.event_type === "task_assigned"
                                        ? "bg-orange-100 text-orange-700"
                                        : item.event_type === "task_completed"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : item.event_type ===
                                              "workflow_completed"
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {item.event_type.replace("_", " ")}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-800">
                                {item.to_step || item.action || "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                {item.performed_by || "-"}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 italic max-w-xs truncate">
                                {item.comments || "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
          <div className="mt-4">
            <button
              type="button"
              className="h-10 px-4 border border-[rgba(0,0,0,0.08)] rounded-md text-xs text-[#0f1724] hover:bg-gray-50"
              onClick={() => navigate("/tenant/documents")}
            >
              Back to Documents
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(activeAction)}
        onClose={resetActionModal}
        title={activeAction ? ACTION_LABELS[activeAction] : "Action"}
        description="Complete required details to continue."
        footer={
          <>
            <SecondaryButton
              onClick={resetActionModal}
              disabled={isActionLoading}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={() => activeAction && void handleAction(activeAction)}
              disabled={isActionLoading || !activeAction}
            >
              {isActionLoading ? "Submitting..." : "Submit"}
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          {activeAction === "submit" && (
            <div className="space-y-3">
              <FormSelect
                label="Workflow Definition"
                required
                options={workflowOptions}
                value={workflowDefinitionId}
                onValueChange={setWorkflowDefinitionId}
                placeholder="Select active workflow definition"
                isSearchable
              />
              {/* <div className="flex flex-col gap-1.5 px-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[#64748b] min-w-[80px]">Entity Type:</span>
                  <span className="text-[11px] font-semibold text-[#0f1724] bg-[#f1f5f9] px-2 py-0.5 rounded border border-[#e2e8f0]">
                    Document
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[#64748b] min-w-[80px]">Source Module:</span>
                  <span className="text-[11px] font-semibold text-[#0f1724] bg-[#f1f5f9] px-2 py-0.5 rounded border border-[#e2e8f0]">
                    {document?.module_name || "Platform"}
                  </span>
                </div>
              </div> */}
              <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-[10px] leading-relaxed text-[#e11d48]">
                <strong>Note:</strong> Currently displaying active workflow
                definitions registered for
                <span className="font-semibold mx-0.5">
                  Entity Type: Document
                </span>{" "}
                and
                <span className="font-semibold mx-0.5">
                  Module: {document?.module_name || "Platform"}
                </span>
                . If the list is empty, please go to Workflow Management and
                create a definition for this specific configuration.
              </div>
            </div>
          )}
          {activeAction === "approve" && (
            <div>
              <label className="text-[13px] font-medium text-[#0e1b2a] mb-2 block">
                Comments
              </label>
              <textarea
                rows={4}
                value={actionComment}
                onChange={(event) => setActionComment(event.target.value)}
                placeholder="Add comments (optional)"
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md text-sm"
              />
            </div>
          )}
          {(activeAction === "reject" ||
            activeAction === "obsolete" ||
            activeAction === "checkout") && (
            <div>
              <label className="text-[13px] font-medium text-[#0e1b2a] mb-2 block">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={actionComment}
                onChange={(event) => {
                  setActionComment(event.target.value);
                  if (event.target.value.trim())
                    setActionErrors((prev) => ({ ...prev, comment: "" }));
                }}
                placeholder="Enter reason"
                className={`w-full px-3 py-2 border rounded-md text-sm transition-colors ${
                  actionErrors.comment
                    ? "border-red-500 bg-red-50/30"
                    : "border-[rgba(0,0,0,0.08)]"
                }`}
              />
              {actionErrors.comment && (
                <p className="text-[11px] text-red-500 mt-1 font-medium italic">
                  {actionErrors.comment}
                </p>
              )}
            </div>
          )}
          {activeAction === "effective" && (
            <div className="space-y-4">
              <FormField
                label="Effective Date"
                required
                type="date"
                value={effectiveDate}
                onChange={(event) => {
                  setEffectiveDate(event.target.value);
                  if (event.target.value)
                    setActionErrors((prev) => ({
                      ...prev,
                      effective_date: "",
                    }));
                }}
                error={actionErrors.effective_date}
              />

              <div className="border-t border-[rgba(0,0,0,0.08)] pt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                  Electronic Signature Verification
                </p>
                <p className="text-[11px] text-gray-400 mb-4">
                  Enter your credentials below to electronically sign this document and authorize its release.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    label="Account Password"
                    required
                    type="password"
                    value={actionPassword}
                    onChange={(event) => {
                      setActionPassword(event.target.value);
                      if (event.target.value) {
                        setActionErrors((prev) => ({
                          ...prev,
                          password: "",
                        }));
                      }
                    }}
                    placeholder="Enter password"
                    error={actionErrors.password}
                  />
                  <FormField
                    label="Signature PIN"
                    type="password"
                    value={actionPin}
                    onChange={(event) => setActionPin(event.target.value)}
                    placeholder="Enter PIN (Optional)"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Workflow Instance Tracker Modal */}
      <Modal
        isOpen={showWorkflowTracker}
        onClose={() => {
          setShowWorkflowTracker(false);
          setSelectedWorkflowAction(null);
          setTransitionComment("");
          setTransitionPassword("");
          setTransitionPin("");
          setTransitionSignatureAction("APPROVE");
        }}
        title="Workflow Status Tracker"
        description="Track the progress of this document's approval workflow."
        maxWidth="2xl"
      >
        <div className="">
          {isWorkflowLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#112868]"></div>
              <p className="text-sm text-gray-500 font-medium">
                Loading workflow details...
              </p>
            </div>
          ) : workflowInstance ? (
            <div className="space-y-6">
              {/* Workflow Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">
                    Workflow
                  </label>
                  <p className="text-sm font-semibold text-gray-800">
                    {workflowInstance.workflow.name}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">
                    Current Status
                  </label>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      workflowInstance.status === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : workflowInstance.status === "active"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {workflowInstance.status}
                  </span>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">
                    Started By
                  </label>
                  <p className="text-sm font-medium text-gray-700">
                    {workflowInstance.started_by.name} (
                    {workflowInstance.started_by.email})
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">
                    Started At
                  </label>
                  <p className="text-sm font-medium text-gray-700">
                    {formatDateTime(workflowInstance.started_at)}
                  </p>
                </div>
              </div>

              {/* Available Actions Buttons */}
              {workflowInstance.available_actions &&
                workflowInstance.available_actions.length > 0 && (
                  <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-lg">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-blue-600 block mb-3">
                      Available Actions
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {workflowInstance.available_actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedWorkflowAction(action)}
                          className="px-4 py-2 bg-white border border-blue-200 rounded-md text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          {action.action || action.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Transition Modal content (inline when action selected) */}
              {selectedWorkflowAction && (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Executing Action:{" "}
                      {selectedWorkflowAction.action ||
                        selectedWorkflowAction.name}
                    </h4>
                    <button
                      onClick={() => {
                        setSelectedWorkflowAction(null);
                        setTransitionComment("");
                        setTransitionPassword("");
                        setTransitionPin("");
                        setTransitionSignatureAction("APPROVE");
                      }}
                      className="text-amber-500 hover:text-amber-700"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-amber-800 mb-1.5 block">
                        Comments{" "}
                        {selectedWorkflowAction.requires_comment
                          ? "(Required)"
                          : "(Optional)"}
                      </label>
                      <textarea
                        rows={3}
                        value={transitionComment}
                        onChange={(e) => setTransitionComment(e.target.value)}
                        placeholder={
                          selectedWorkflowAction.requires_comment
                            ? "Enter required comments..."
                            : "Enter optional comments..."
                        }
                        className="w-full px-3 py-2 border border-amber-200 rounded-md text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {selectedWorkflowAction.requires_signature && (
                      <div className="space-y-3 border-t border-amber-200/55 pt-3">
                        <div>
                          <label className="text-[11px] font-bold text-amber-800 mb-1.5 block">
                            Signature Action <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={transitionSignatureAction}
                            onChange={(e) => setTransitionSignatureAction(e.target.value as any)}
                            className="w-full px-3 py-2 border border-amber-200 rounded-md text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                          >
                            <option value="APPROVE">APPROVE (Approve a record or document)</option>
                            <option value="REJECT">REJECT (Reject a record or document)</option>
                            <option value="REVIEW">REVIEW (Mark a record as reviewed)</option>
                            <option value="AUTHOR">AUTHOR (Sign as the author of a record)</option>
                            <option value="VERIFY">VERIFY (Verify the accuracy of a record)</option>
                            <option value="RELEASE">RELEASE (Authorize the release of a record)</option>
                            <option value="ACKNOWLEDGE">ACKNOWLEDGE (Acknowledge receipt and understanding)</option>
                            <option value="WITHDRAW">WITHDRAW (Withdraw a previous signature)</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-amber-800 mb-1.5 block">
                              Password <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="password"
                              value={transitionPassword}
                              onChange={(e) => setTransitionPassword(e.target.value)}
                              placeholder="Enter password to sign"
                              className="w-full px-3 py-2 border border-amber-200 rounded-md text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-amber-800 mb-1.5 block">
                              Signature PIN <span className="text-gray-500">(Optional if not set)</span>
                            </label>
                            <input
                              type="password"
                              value={transitionPin}
                              onChange={(e) => setTransitionPin(e.target.value)}
                              placeholder="Enter 4-6 digit PIN"
                              className="w-full px-3 py-2 border border-amber-200 rounded-md text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <PrimaryButton
                        onClick={() => void handleWorkflowTransition()}
                        disabled={isTransitioning}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {isTransitioning ? "Processing..." : "Confirm Action"}
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks Table View */}
              <div className="overflow-hidden border border-gray-100 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      >
                        Step
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      >
                        Assignee
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      >
                        Action
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      >
                        Due Date
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      >
                        Completed At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {workflowInstance.tasks.map((task) => (
                      <tr
                        key={task.id}
                        className={
                          task.status === "pending" ? "bg-blue-50/30" : ""
                        }
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-xs font-bold ${task.status === "pending" ? "text-blue-700" : "text-gray-800"}`}
                          >
                            {task.step}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <User className="w-3 h-3 text-gray-400" />
                            {task.assigned_to_name || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              task.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : task.status === "pending"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {task.action_taken ? (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-bold uppercase text-[9px]">
                              {task.action_taken}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px] italic">
                              No action
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-semibold ${
                              task.status === "pending" &&
                              task.due_at &&
                              new Date(task.due_at) < new Date()
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {task.due_at ? formatDateTime(task.due_at) : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[11px] text-gray-400 italic">
                            {task.completed_at
                              ? formatDateTime(task.completed_at)
                              : "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500">
                No workflow tracking information available.
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <SecondaryButton
              onClick={() => {
                setShowWorkflowTracker(false);
                setSelectedWorkflowAction(null);
                setTransitionComment("");
              }}
            >
              Close Tracker
            </SecondaryButton>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default ViewDocument;
