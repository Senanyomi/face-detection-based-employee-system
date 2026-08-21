import { useEffect, useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import type { Employee, AttendanceSummary } from '../types';
import { Download, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Card } from '../components/ui/card';

interface ReportRow {
  employee: Employee;
  summary: AttendanceSummary | null;
}

interface DailyRow {
  employee: Employee;
  work_date: string;
  duration_seconds: number;
  engagement_score: number | null;
}

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function Reports() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dept, setDept] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.listEmployees().then(async (empRes) => {
      const employees = empRes.data.data;
      const summaries = await Promise.all(
        employees.map(e =>
          api.getAttendanceSummary(e.employee_id)
            .then(r => r.data.data)
            .catch(() => null)
        )
      );
      setRows(employees.map((e, i) => ({ employee: e, summary: summaries[i] })));
    }).catch((err) => { console.error(err); setError(true); }).finally(() => setLoading(false));
  }, []);

  // Per-day worked duration + engagement score, merged per employee per date.
  useEffect(() => {
    if (rows.length === 0) return;
    const employees = rows.map(r => r.employee);
    Promise.all(
      employees.map(e =>
        Promise.all([
          api.getDailyAttendanceSummaries(e.employee_id).then(r => r.data.data).catch(() => []),
          api.getDailyEngagementSummaries(e.employee_id).then(r => r.data.data).catch(() => []),
        ])
      )
    ).then((results) => {
      const merged: DailyRow[] = [];
      results.forEach(([attendance, engagement], i) => {
        const employee = employees[i];
        const engagementByDate = new Map(engagement.map(x => [x.work_date, x.average_engagement_score]));
        const dates = new Set<string>([
          ...attendance.map(a => a.work_date),
          ...engagement.map(x => x.work_date),
        ]);
        dates.forEach(work_date => {
          const att = attendance.find(a => a.work_date === work_date);
          merged.push({
            employee,
            work_date,
            duration_seconds: att?.total_duration_seconds ?? 0,
            engagement_score: engagementByDate.get(work_date) ?? null,
          });
        });
      });
      merged.sort((a, b) => b.work_date.localeCompare(a.work_date));
      setDailyRows(merged);
    }).finally(() => setDailyLoading(false));
  }, [rows]);

  const depts = Array.from(new Set(rows.map(r => r.employee.department).filter(Boolean))) as string[];
  const filtered = rows.filter(r => {
    const matchDept = dept === 'all' || r.employee.department === dept;
    const matchSearch = r.employee.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.employee.employee_id.includes(search);
    return matchDept && matchSearch;
  });
  const dailyFiltered = dailyRows.filter(r => {
    const matchDept = dept === 'all' || r.employee.department === dept;
    const matchSearch = r.employee.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.employee.employee_id.includes(search);
    return matchDept && matchSearch;
  });

  const exportCSV = () => {
    const headers = ['Name', 'Department', 'Role', 'Date', 'Attendance Duration (hours)', 'Engagement Score (%)'];
    const csvRows = dailyFiltered.map(({ employee: e, work_date, duration_seconds, engagement_score }) => [
      e.full_name,
      e.department || '',
      e.role || '',
      work_date,
      (duration_seconds / 3600).toFixed(2),
      engagement_score !== null ? (engagement_score * 100).toFixed(1) : '',
    ]);
    const csv = [headers, ...csvRows].map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `emprod_daily_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSpinner label="Generating report…" />;

  return (
    <div>
      <PageHeader
        title="Attendance Reports"
        subtitle="Aggregated attendance data per employee"
        action={
          <Button onClick={exportCSV} disabled={dailyFiltered.length === 0}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        }
      />

      {error && <div className="mb-4"><ErrorState message="Failed to load report data." /></div>}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="pl-8"
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {depts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="gap-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-medium text-foreground">All-Time Summary</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Check-ins</TableHead>
              <TableHead>Check-outs</TableHead>
              <TableHead>First In</TableHead>
              <TableHead>Last Out</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(({ employee: e, summary: s }) => (
              <TableRow key={e.employee_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6 shrink-0">
                      <AvatarFallback className="bg-brand text-white text-xs font-semibold">{e.full_name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-xs text-foreground">{e.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.department || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.role || '—'}</TableCell>
                <TableCell className="text-xs font-medium text-foreground">{s?.total_check_ins ?? '—'}</TableCell>
                <TableCell className="text-xs font-medium text-foreground">{s?.total_check_outs ?? '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {s?.first_check_in ? new Date(s.first_check_in).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {s?.last_check_out ? new Date(s.last_check_out).toLocaleDateString() : '—'}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No data available</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="gap-0 overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-medium text-foreground">Daily Attendance &amp; Productivity</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Engagement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-sm text-muted-foreground">Loading daily data…</TableCell>
              </TableRow>
            ) : dailyFiltered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-sm text-muted-foreground">No daily data available</TableCell>
              </TableRow>
            ) : (
              dailyFiltered.map((r) => (
                <TableRow key={`${r.employee.employee_id}-${r.work_date}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6 shrink-0">
                        <AvatarFallback className="bg-brand text-white text-xs font-semibold">{r.employee.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-xs text-foreground">{r.employee.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.work_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    {(r.duration_seconds / 3600).toFixed(2)}h
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    {r.engagement_score !== null ? `${(r.engagement_score * 100).toFixed(1)}%` : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
