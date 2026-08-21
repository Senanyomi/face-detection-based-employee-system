import { useEffect, useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge, StatusTone } from '../components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import type { Employee, ProductivityRecord, ProductivityAggregation } from '../types';
import { Search } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const POSTURE_COLORS: Record<string, string> = {
  focused: 'var(--success)',
  distracted: 'var(--warning)',
  away: 'var(--destructive)',
  unknown: 'var(--muted-foreground)',
};

const POSTURE_TONE: Record<string, StatusTone> = {
  focused: 'success',
  distracted: 'warning',
  away: 'destructive',
  unknown: 'neutral',
};

export function Productivity() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<ProductivityRecord[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [agg, setAgg] = useState<ProductivityAggregation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [aggLoading, setAggLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');

  useEffect(() => {
    const refresh = () => Promise.all([api.listEmployees(), api.getProductivityRecords(undefined, 200)])
      .then(([empRes, recRes]) => {
        setEmployees(empRes.data.data);
        setRecords(recRes.data.data);
        if (empRes.data.data.length > 0) setSelected(empRes.data.data[0].employee_id);
      })
      .catch((err) => { console.error(err); setError(true); })
      .finally(() => setLoading(false));

    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setAggLoading(true);
    api.getProductivityAggregation(selected)
      .then(r => setAgg(r.data.data))
      .catch(console.error)
      .finally(() => setAggLoading(false));
  }, [selected]);

  if (loading) return <LoadingSpinner label="Loading productivity data…" />;

  const selectedEmployee = employees.find(e => e.employee_id === selected);

  const depts = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[];
  const filteredEmployees = employees.filter(e => {
    const matchSearch = e.full_name.toLowerCase().includes(search.toLowerCase()) || e.employee_id.includes(search);
    const matchDept = dept === 'all' || e.department === dept;
    return matchSearch && matchDept;
  });

  // Per-employee engagement bar chart
  const engagementData = employees.map(emp => {
    const empRecords = records.filter(r => r.employee_id === emp.employee_id);
    const scores = empRecords.map(r => r.engagement_score).filter((s): s is number => s !== null);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { name: emp.full_name.split(' ')[0], score: parseFloat((avg * 100).toFixed(1)) };
  });

  // Posture pie for selected employee
  const empRecords = records.filter(r => r.employee_id === selected);
  const postureCounts = empRecords.reduce<Record<string, number>>((acc, r) => {
    acc[r.posture_state] = (acc[r.posture_state] || 0) + 1;
    return acc;
  }, {});
  const postureData = Object.entries(postureCounts).map(([name, value]) => ({ name, value }));

  const fmtSec = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div>
      <PageHeader title="Productivity Analytics" subtitle="AI-estimated posture and engagement scores" />

      {error && <div className="mb-5"><ErrorState message="Failed to load productivity data." /></div>}

      {/* Filters */}
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

      {/* Employee selector */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">Viewing:</label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {filteredEmployees.map(e => <SelectItem key={e.employee_id} value={e.employee_id}>{e.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedEmployee && (
          <StatusBadge tone="info">{selectedEmployee.department || 'No dept'}</StatusBadge>
        )}
      </div>

      {/* Aggregation cards */}
      {aggLoading ? (
        <LoadingSpinner label="Loading stats…" />
      ) : agg && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Avg Engagement', value: agg.average_engagement ? `${(agg.average_engagement * 100).toFixed(1)}%` : '—' },
            { label: 'Focused Time', value: fmtSec(agg.total_focused_seconds) },
            { label: 'Distracted Time', value: fmtSec(agg.total_distracted_seconds) },
            { label: 'Observations', value: agg.observation_count },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs mb-2 text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold text-foreground">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Posture Classification — {selectedEmployee?.full_name || ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {postureData.length === 0 ? (
              <p className="text-sm text-center py-10 text-muted-foreground">No data for this employee</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={postureData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {postureData.map((entry) => (
                      <Cell key={entry.name} fill={POSTURE_COLORS[entry.name] || 'var(--muted-foreground)'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--popover-foreground)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {Object.entries(POSTURE_COLORS).map(([state, color]) => (
                <div key={state} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  {state.charAt(0).toUpperCase() + state.slice(1)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Engagement Score by Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} unit="%" />
                <Tooltip
                  contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--popover-foreground)' }}
                  formatter={(v: number) => [`${v}%`, 'Engagement']}
                />
                <Bar dataKey="score" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent records table */}
      <Card className="gap-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-medium text-foreground">Recent Observations</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identified employee</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Posture</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empRecords.slice(0, 20).map(r => (
              <TableRow key={r.productivity_id}>
                <TableCell className="text-xs font-medium">{r.identified_employee}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{r.worker_id}</TableCell>
                <TableCell>
                  <StatusBadge tone={POSTURE_TONE[r.posture_state] || 'neutral'} className="capitalize">
                    {r.posture_state}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-xs font-medium text-foreground">
                  {r.engagement_score !== null ? `${(r.engagement_score * 100).toFixed(1)}%` : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtSec(r.duration_seconds)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.timestamp).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {empRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No productivity records yet</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
