import type { LucideIcon } from "lucide-react";

export interface StatCardData {
  icon: LucideIcon;
  value: string | number;
  label: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'info' | 'error' | 'green' | 'gray';
  };
}

export interface ActivityLog {
  action: 'CREATE' | 'UPDATE' | 'SUSPEND' | 'LOGIN' | 'LOGOUT';
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  timestamp: string;
}

export interface QuickAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  btncolor: string;
}

export interface HealthMetric {
  label: string;
  value: string;
  percentage: number;
  variant: 'success' | 'info' | 'warning';
}
