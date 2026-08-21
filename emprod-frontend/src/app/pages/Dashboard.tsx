import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Monitor } from 'lucide-react';
import { api } from '../api';
import { Stat } from '../components/Stat';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import type { Employee, AttendanceLog, Device } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

export function Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      api.listEmployees(),
      api.getAttendanceLogs(undefined, 200),
      api.getDevices(),
    ])
      .then(([e, l, d]) => {
        setEmployees(e.data.data);
        setLogs(l.data.data);
        setDevices(d.data.data);
      })
      .catch((err) => {
        console.error('Dashboard fetch error:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading dashboard…" />;

  const today = new Date().toDateString();
  const todayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === today);
  const presentIds = new Set(todayLogs.filter(l => l.entry_type === 'check_in').map(l => l.employee_id));
  const presentCount = presentIds.size;
  const absentCount = Math.max(0, employees.length - presentCount);
  const activeDevices = devices.filter(d => d.status === 'active').length;
  const recentLogs = logs.slice(0, 8);

  // Weekly attendance trend (last 7 days)
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toDateString();
    const count = new Set(logs.filter(l => new Date(l.timestamp).toDateString() === ds && l.entry_type === 'check_in').map(l => l.employee_id)).size;
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), present: count };
  });

  // Confidence distribution
  const confData = ['90-100', '80-90', '70-80', '<70'].map((range, i) => {
    const [lo, hi] = i < 3 ? [90 - i * 10, 100 - i * 10] : [0, 70];
    return {
      range,
      count: logs.filter(l => {
        const c = (l.recognition_confidence || 0) * 100;
        return i < 3 ? c >= lo && c < hi : c < hi;
      }).length,
    };
  });

  return (
    <div>
      <PageHeader title="Overview" subtitle="Live attendance and system summary" />

      {error && <div className="mb-6"><ErrorState message="Some dashboard data failed to load. Showing partial results." /></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <Stat label="Total Employees" value={employees.length} icon={<Users className="w-4 h-4 text-brand" />} />
        <Stat label="Present Today" value={presentCount} icon={<UserCheck className="w-4 h-4 text-success" />} iconClassName="bg-success-light" />
        <Stat label="Absent Today" value={absentCount} icon={<UserX className="w-4 h-4 text-destructive" />} iconClassName="bg-destructive-light" />
        <Stat label="Active Devices" value={activeDevices} icon={<Monitor className="w-4 h-4 text-gold" />} iconClassName="bg-gold-light" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Weekly Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--popover-foreground)' }} />
                <Line type="monotone" dataKey="present" stroke="var(--brand)" strokeWidth={3} dot={{ fill: 'var(--brand)', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Recognition Confidence Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={confData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--popover-foreground)' }} />
                <Bar dataKey="count" fill="var(--cyan-glow)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Recent Attendance Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {recentLogs.length === 0 && <p className="text-sm text-center py-6 text-muted-foreground">No events yet</p>}
            {recentLogs.map((log) => (
              <div key={log.log_id} className="flex items-center justify-between py-3 px-3 rounded-xl border bg-secondary border-border">
                <div className="flex items-center gap-3">
                  <StatusBadge tone={log.entry_type === 'check_in' ? 'success' : 'destructive'}>
                    {log.entry_type === 'check_in' ? 'IN' : 'OUT'}
                  </StatusBadge>
                  <span className="text-xs font-mono text-muted-foreground">
                    {log.employee_id.slice(0, 8)}…
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {log.recognition_confidence !== null && (
                    <span
                      className={
                        (log.recognition_confidence || 0) >= 0.9 ? 'text-success'
                          : (log.recognition_confidence || 0) >= 0.8 ? 'text-warning' : 'text-destructive'
                      }
                    >
                      {((log.recognition_confidence || 0) * 100).toFixed(1)}%
                    </span>
                  )}
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
