import { authClient, attendanceClient, analyticsClient, deviceClient, auditClient } from './client';
import type {
  Employee, AttendanceLog, AttendanceSummary,
  ReconciledDailySummary, ProductivityRecord, ProductivityAggregation,
  DailyAttendanceSummary, DailyEngagementSummary,
  Device, AuditLog, APIResponse
} from '../types';

export const api = {
  issueToken: (employee_id: string) =>
    authClient.post<APIResponse<{ access_token: string; token_type: string; employee_id: string }>>(
      '/api/v1/employees/' + employee_id + '/token'
    ),

  listEmployees: () =>
    authClient.get<APIResponse<Employee[]>>('/api/v1/employees/'),

  getEmployee: (id: string) =>
    authClient.get<APIResponse<Employee>>('/api/v1/employees/' + id),

  createEmployee: (data: { full_name: string; department?: string; role?: string; consent_status: boolean }) =>
    authClient.post<APIResponse<Employee>>('/api/v1/employees/', data),

  updateEmployee: (id: string, data: Partial<{ full_name: string; department: string; role: string; consent_status: boolean }>) =>
    authClient.patch<APIResponse<Employee>>('/api/v1/employees/' + id, data),

  deleteEmployee: (id: string) =>
    authClient.delete<APIResponse<null>>('/api/v1/employees/' + id),

  updateConsent: (id: string, consent_status: boolean) =>
    authClient.patch<APIResponse<Employee>>('/api/v1/employees/' + id + '/consent', { consent_status }),

  getAttendanceLogs: (employee_id?: string, limit = 50) =>
    attendanceClient.get<APIResponse<AttendanceLog[]>>('/api/v1/attendance/', {
      params: { employee_id, limit },
    }),

  getAttendanceSummary: (employee_id: string) =>
    attendanceClient.get<APIResponse<AttendanceSummary>>('/api/v1/attendance/summary/' + employee_id),

  getLogsByDevice: (device_id: string) =>
    attendanceClient.get<APIResponse<AttendanceLog[]>>('/api/v1/attendance/device/' + device_id),

  getDailyAttendanceSummaries: (employee_id: string, limit = 31) =>
    attendanceClient.get<APIResponse<DailyAttendanceSummary[]>>('/api/v1/attendance/daily-summary/' + employee_id, {
      params: { limit },
    }),

  getReconciledDailySummaries: (date?: string) =>
    attendanceClient.get<APIResponse<ReconciledDailySummary[]>>('/api/v1/attendance/daily-summary', {
      params: { date },
    }),

  getProductivityRecords: (employee_id?: string, limit = 100) =>
    analyticsClient.get<APIResponse<ProductivityRecord[]>>('/api/v1/analytics/', {
      params: { employee_id, limit },
    }),

  getProductivityAggregation: (employee_id: string) =>
    analyticsClient.get<APIResponse<ProductivityAggregation>>('/api/v1/analytics/aggregation/' + employee_id),

  getDailyEngagementSummaries: (employee_id: string, limit = 31) =>
    analyticsClient.get<APIResponse<DailyEngagementSummary[]>>('/api/v1/analytics/daily-aggregation/' + employee_id, {
      params: { limit },
    }),

  getDevices: () =>
    deviceClient.get<APIResponse<Device[]>>('/api/v1/devices/'),

  createDevice: (data: { location: string; status?: string }) =>
    deviceClient.post<APIResponse<Device>>('/api/v1/devices/', data),

  updateDevice: (id: string, data: Partial<{ location: string; status: string }>) =>
    deviceClient.patch<APIResponse<Device>>('/api/v1/devices/' + id, data),

  deleteDevice: (id: string) =>
    deviceClient.delete<APIResponse<null>>('/api/v1/devices/' + id),

  getAuditLogs: (limit = 100) =>
    auditClient.get<APIResponse<AuditLog[]>>('/api/v1/audit/', { params: { limit } }),

  writeAuditLog: (action: string, performed_by?: string, metadata?: Record<string, unknown>) =>
    auditClient.post<APIResponse<AuditLog>>('/api/v1/audit/', { action, performed_by, metadata }),
};