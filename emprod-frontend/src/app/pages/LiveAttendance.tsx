import { useEffect, useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge, StatusTone } from '../components/StatusBadge';
import { Card, CardContent } from '../components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import type { AttendanceLog, Device, ReconciledDailySummary } from '../types';

function deviceTone(status: string): StatusTone {
  return status === 'active' ? 'success' : 'destructive';
}

const confTextClass = (c: number) =>
  c >= 0.9 ? 'text-success' : c >= 0.8 ? 'text-warning' : 'text-destructive';

export function LiveAttendance() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [reconciledSummaries, setReconciledSummaries] = useState<ReconciledDailySummary[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = () => {
    Promise.allSettled([
      api.getAttendanceLogs(undefined, 50),
      api.getReconciledDailySummaries(),
      api.getDevices(),
    ]).then(([logResult, summaryResult, deviceResult]) => {
      const failed = [logResult, summaryResult, deviceResult].some(
        (result) => result.status === 'rejected',
      );

      if (logResult.status === 'fulfilled') setLogs(logResult.value.data.data);
      if (summaryResult.status === 'fulfilled') {
        setReconciledSummaries(summaryResult.value.data.data);
      }
      if (deviceResult.status === 'fulfilled') setDevices(deviceResult.value.data.data);
      setLastRefresh(new Date());
      setError(failed && logResult.status === 'rejected' && deviceResult.status === 'rejected');
      if (failed) console.warn('Some attendance data could not be refreshed');
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner label="Loading attendance data…" />;

  return (
    <div>
      <PageHeader
        title="Live Attendance"
        subtitle="Real-time recognition events — auto-refreshes every 10s"
        action={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            Updated {lastRefresh.toLocaleTimeString()}
          </div>
        }
      />

      {error && <div className="mb-6"><ErrorState message="Failed to refresh attendance data. Retrying automatically." /></div>}

      {/* Device status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {devices.map((device) => (
          <Card key={device.device_id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3 gap-2">
                <p className="text-sm font-medium truncate text-foreground">{device.location}</p>
                <StatusBadge tone={deviceTone(device.status)} className="capitalize">{device.status}</StatusBadge>
              </div>
              <p className="text-xs font-mono text-muted-foreground">
                {device.device_id.slice(0, 12)}…
              </p>
              {device.last_heartbeat && (
                <p className="text-xs mt-1 text-muted-foreground">
                  Last heartbeat: {new Date(device.last_heartbeat).toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {devices.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState message="No devices registered yet" />
          </div>
        )}
      </div>

      <Card className="gap-0 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-medium text-foreground">
            Reconciled Daily Attendance ({reconciledSummaries.length})
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee ID</TableHead>
              <TableHead>Sign-ins</TableHead>
              <TableHead>Sign-outs</TableHead>
              <TableHead>First sign-in</TableHead>
              <TableHead>Last sign-out</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reconciledSummaries.map((summary) => (
              <TableRow key={summary.summary_id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {summary.employee_id.slice(0, 12)}…
                </TableCell>
                <TableCell>{summary.total_check_ins}</TableCell>
                <TableCell>{summary.total_check_outs}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {summary.first_check_in ? new Date(summary.first_check_in).toLocaleString() : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {summary.last_check_out ? new Date(summary.last_check_out).toLocaleString() : '—'}
                </TableCell>
              </TableRow>
            ))}
            {reconciledSummaries.length === 0 && (
              <TableRow><TableCell colSpan={5}>No reconciled attendance for today</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Logs table */}
      <Card className="gap-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-medium text-foreground">
            Recognition Events ({logs.length})
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.log_id}>
                <TableCell>
                  <StatusBadge tone={log.entry_type === 'check_in' ? 'success' : 'destructive'}>
                    {log.entry_type === 'check_in' ? 'CHECK IN' : 'CHECK OUT'}
                  </StatusBadge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.employee_id.slice(0, 12)}…
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.device_id.slice(0, 12)}…
                </TableCell>
                <TableCell className={`text-xs font-medium ${log.recognition_confidence ? confTextClass(log.recognition_confidence) : 'text-muted-foreground'}`}>
                  {log.recognition_confidence ? `${(log.recognition_confidence * 100).toFixed(1)}%` : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">No attendance events yet</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
