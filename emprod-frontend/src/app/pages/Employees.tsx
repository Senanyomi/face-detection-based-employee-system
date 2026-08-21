import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Employee } from '../types';
import { UserPlus, Search, Shield, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';

interface FormData {
  full_name: string;
  department: string;
  role: string;
  consent_status: boolean;
}

const DEPARTMENTS = ['Engineering', 'Marketing', 'HR', 'Sales', 'Finance', 'Operations'];
const ROLES = ['HR Admin', 'Engineer', 'Manager', 'Analyst', 'Executive', 'Specialist'];
const EMPTY_FORM: FormData = { full_name: '', department: '', role: '', consent_status: false };

function initialsOf(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const load = () => api.listEmployees()
    .then(r => { setEmployees(r.data.data); setError(false); })
    .catch((err) => { console.error(err); setError(true); })
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e => {
    const matchSearch = e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_id.includes(search);
    const matchDept = dept === 'all' || e.department === dept;
    return matchSearch && matchDept;
  });

  const depts = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[];
  const selected = employees.find(e => e.employee_id === selectedId);

  const handleSave = async () => {
    if (!form.full_name.trim()) { setFormError('Full name is required'); return; }
    setSaving(true); setFormError('');
    try {
      await api.createEmployee(form);
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success('Employee registered', { description: `${form.full_name} was added to the roster.` });
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to register employee';
      setFormError(msg);
      toast.error('Registration failed', { description: msg });
    } finally { setSaving(false); }
  };

  const handleToggleConsent = async (id: string, current: boolean) => {
    try {
      await api.updateConsent(id, !current);
      toast.success(!current ? 'Consent granted' : 'Consent revoked');
      load();
    } catch (e: any) {
      toast.error('Failed to update consent', { description: e?.response?.data?.detail });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await api.deleteEmployee(id);
      toast.success('Employee removed', { description: `${name} was deleted.` });
      load();
    } catch (e: any) {
      toast.error('Failed to delete employee', { description: e?.response?.data?.detail });
    }
  };

  if (loading) return <LoadingSpinner label="Loading employees…" />;

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} registered`}
        action={
          <Button onClick={() => setShowForm(true)}>
            <UserPlus className="w-4 h-4" /> Add Employee
          </Button>
        }
      />

      {error && <div className="mb-6"><ErrorState message="Failed to load employees." /></div>}

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

      {/* Table */}
      <div className="rounded-xl overflow-hidden border bg-card border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Consent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(emp => (
              <TableRow key={emp.employee_id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarFallback className="bg-brand text-white text-xs font-semibold">
                        {initialsOf(emp.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{emp.full_name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{emp.employee_id.slice(0, 8)}…</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-foreground">{emp.department || '—'}</TableCell>
                <TableCell className="text-xs text-foreground">{emp.role || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(emp.date_registered).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <button onClick={() => handleToggleConsent(emp.employee_id, emp.consent_status)}>
                    <StatusBadge tone={emp.consent_status ? 'success' : 'destructive'} className="cursor-pointer">
                      {emp.consent_status ? 'Granted' : 'Pending'}
                    </StatusBadge>
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedId(emp.employee_id)}>View</Button>
                    <ConfirmDialog
                      trigger={<Button variant="secondary" size="sm">Delete</Button>}
                      title="Delete this employee?"
                      description={`This will permanently remove ${emp.full_name} and cannot be undone.`}
                      confirmLabel="Delete"
                      onConfirm={() => handleDelete(emp.employee_id, emp.full_name)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No employees found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add employee dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Employee</DialogTitle>
            <DialogDescription>Create a new employee record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Kwame Asante"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consent_status}
                onChange={e => setForm({ ...form, consent_status: e.target.checked })}
                className="w-4 h-4 rounded accent-brand"
              />
              <span className="text-xs text-foreground">Biometric consent obtained from employee</span>
            </label>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-light">
              <Shield className="w-4 h-4 shrink-0 mt-0.5 text-brand" />
              <p className="text-xs text-brand-dark">
                Face embedding registration happens separately via the AI pipeline. This form creates the employee record only.
              </p>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View employee dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Employee Profile</DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-brand text-white text-lg font-semibold">
                    {initialsOf(selected.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{selected.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selected.role || 'No role set'}</p>
                </div>
              </div>
              <div>
                {[
                  ['Employee ID', selected.employee_id],
                  ['Department', selected.department || '—'],
                  ['Registered', new Date(selected.date_registered).toLocaleString()],
                  ['Biometric Consent', selected.consent_status ? 'Granted' : 'Pending'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2.5 border-b border-border last:border-0">
                    <span className="text-xs text-muted-foreground">{k}</span>
                    <span className="text-xs font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
