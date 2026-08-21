// ── Aligned exactly with backend API response shapes ──────────────────────────

export interface Employee {
  employee_id: string;
  full_name: string;
  department: string | null;
  role: string | null;
  consent_status: boolean;
  date_registered: string;
}

export interface AttendanceLog {
  log_id: string;
  employee_id: string;
  timestamp: string;
  entry_type: 'check_in' | 'check_out';
  recognition_confidence: number | null;
  device_id: string;
}

export interface AttendanceSummary {
  employee_id: string;
  total_check_ins: number;
  total_check_outs: number;
  first_check_in: string | null;
  last_check_out: string | null;
}

export interface ReconciledDailySummary {
  summary_id: string;
  employee_id: string;
  summary_date: string;
  first_check_in: string | null;
  last_check_out: string | null;
  total_check_ins: number;
  total_check_outs: number;
}

export interface ProductivityRecord {
  productivity_id: string;
  employee_id: string;
  identified_employee: string;
  worker_id: string;
  posture_state: 'focused' | 'distracted' | 'away' | 'unknown';
  engagement_score: number | null;
  duration_seconds: number;
  timestamp: string;
}

export interface ProductivityAggregation {
  employee_id: string;
  average_engagement: number | null;
  total_focused_seconds: number;
  total_distracted_seconds: number;
  total_away_seconds: number;
  observation_count: number;
}

export interface DailyAttendanceSummary {
  employee_id: string;
  work_date: string;
  total_duration_seconds: number;
  first_check_in: string | null;
  last_check_out: string | null;
}

export interface DailyEngagementSummary {
  employee_id: string;
  work_date: string;
  average_engagement_score: number | null;
  observation_count: number;
}

export interface Device {
  device_id: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
  last_heartbeat: string | null;
}

export interface AuditLog {
  audit_id: string;
  action: string;
  performed_by: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

export interface AuthUser {
  employee_id: string;
  full_name: string;
  role: string;
  token: string;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
