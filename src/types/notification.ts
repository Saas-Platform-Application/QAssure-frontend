export type NotificationType = 'action_required' | 'info' | 'success' | 'warning' | 'escalation';
export type NotificationCategory = 'capa' | 'document' | 'training' | 'workflow' | 'supplier' | 'system';
export type NotificationPriority = 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  category?: NotificationCategory;
  priority: NotificationPriority;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  is_dismissed: boolean;
  dismissed_at?: string;
  channels_sent: string[];
  expires_at?: string;
  created_at: string;
}

export interface CategoryPreference {
  in_app: boolean;
  email: boolean;
}

export interface NotificationPreferences {
  in_app_enabled: boolean;
  email_enabled: boolean;
  email_digest: 'instant' | 'daily' | 'weekly';
  category_preferences: Record<NotificationCategory, CategoryPreference>;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
}

export interface NotificationState {
  notifications: Notification[];
  unread_count: number;
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
}
