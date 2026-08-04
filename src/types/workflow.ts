export interface WorkflowStep {
  id?: string;
  step_code: string;
  name: string;
  description?: string;
  sequence: number;
  step_type: 'initial' | 'task' | 'approval' | 'terminal';
  assignee: {
    type: 'role' | 'user' | 'originator';
    user_ids?: string[] | null;
    role_ids?: string[] | null;
  };
  available_actions: string[];
  requires_signature?: boolean;
  requires_comment?: boolean;
  requires_attachment?: boolean;
  sla?: {
    hours?: number;
    warning_hours?: number;
    escalation_hours?: number;
  };
  form_config?: any;
}

export interface WorkflowTransition {
  id?: string;
  from_step_id?: string;
  from_step_code: string;
  from_step_name?: string;
  to_step_id?: string;
  to_step_code: string;
  to_step_name?: string;
  action: string;
  name: string;
  requires_signature?: boolean;
  requires_comment?: boolean;
  signature_meaning?: string;
  priority?: number;
}

export interface WorkflowDefinition {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string;
  entity_type: string;
  status: 'active' | 'draft' | 'deprecated' | 'archived';
  version: number;
  is_active: boolean;
  is_default: boolean;
  source_module: string[];
  source_module_id: string[];
  steps: WorkflowStep[];
  transitions: WorkflowTransition[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowDefinitionData {
  code: string;
  name: string;
  description?: string;
  entity_type: string;
  status?: 'active' | 'draft' | 'deprecated' | 'archived';
  source_module?: string[];
  source_module_id?: string[];
  steps: Partial<WorkflowStep>[];
  transitions: Partial<WorkflowTransition>[];
  tenantId?: string;
}

export interface UpdateWorkflowDefinitionData {
  name?: string;
  description?: string;
  entity_type?: string;
  status?: 'active' | 'draft' | 'deprecated' | 'archived';
  source_module?: string[];
  source_module_id?: string[];
  steps?: Partial<WorkflowStep>[];
  transitions?: Partial<WorkflowTransition>[];
  tenantId?: string;
}

export interface WorkflowDefinitionsResponse {
  success: boolean;
  data: WorkflowDefinition[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface WorkflowDefinitionResponse {
  success: boolean;
  data: WorkflowDefinition;
}

export interface WorkflowInstance {
  id: string;
  workflow: {
    id: string;
    name: string;
    code: string;
  };
  entity: {
    type: string;
    id: string;
    name: string | null;
  };
  current_step: {
    id: string;
    code: string;
    name: string;
  };
  status: string;
  context: Record<string, any>;
  tasks: Array<{
    id: string;
    step: string;
    assigned_user_ids?: string[] | null;
    assigned_to_name?: string | null;
    assigned_role_ids?: string[] | null;
    status: string;
    action_taken: string | null;
    completed_at: string | null;
    due_at: string | null;
  }>;
  available_actions: Array<{
    action: string;
    name: string;
    requires_signature: boolean;
    requires_comment: boolean;
    next_step: string;
  }>;
  started_by: {
    email: string;
    name: string;
  };
  started_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
}

export interface WorkflowInstanceResponse {
  success: boolean;
  data: WorkflowInstance;
}

export interface WorkflowDeleteResponse {
  success: boolean;
  message: string;
}

export interface WorkflowTask {
  id: string;
  workflow: {
    instance_id: string;
    name: string;
  };
  step: {
    id: string;
    code: string;
    name: string;
    requires_signature: boolean;
  };
  entity: {
    type: string;
    id: string;
    name: string;
  };
  assignment: {
    assigned_user_ids?: string[] | null;
    assigned_to_name: string | null;
    assigned_users?: Array<{ email: string; name: string | null }> | null;
    assigned_role_ids?: string[] | null;
    assigned_at: string;
  };
  status: string;
  due_at: string;
  is_overdue: boolean;
  completion: any | null;
  escalation: any | null;
  created_at: string;
}

export interface WorkflowTasksResponse {
  success: boolean;
  data: WorkflowTask[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface WorkflowTaskCounts {
  pending: number;
  overdue: number;
  due_soon: number;
  completed_this_week: number;
}

export interface WorkflowTaskCountsResponse {
  success: boolean;
  data: WorkflowTaskCounts;
}
