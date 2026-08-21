import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge, StatusTone } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Device } from '../types';
import { Monitor, Plus, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';

const STATUS_TONE: Record<string, StatusTone> = {
  active: 'success',
  inactive: 'destructive',
  maintenance: 'warning',
};

export function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ location: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => api.getDevices()
    .then(r => { setDevices(r.data.data); setError(false); })
    .catch((err) => { console.error(err); setError(true); })
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.location.trim()) { setFormError('Location is required'); return; }
    setSaving(true); setFormError('');
    try {
      await api.createDevice(form);
      setShowForm(false);
      setForm({ location: '', status: 'active' });
      toast.success('Device registered', { description: `${form.location} was added.` });
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to register device';
      setFormError(msg);
      toast.error('Registration failed', { description: msg });
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateDevice(id, { status });
      toast.success('Device status updated');
      load();
    } catch (e: any) {
      toast.error('Failed to update device', { description: e?.response?.data?.detail });
    }
  };

  const handleDelete = async (id: string, location: string) => {
    try {
      await api.deleteDevice(id);
      toast.success('Device removed', { description: `${location} was deleted.` });
      load();
    } catch (e: any) {
      toast.error('Failed to delete device', { description: e?.response?.data?.detail });
    }
  };

  if (loading) return <LoadingSpinner label="Loading devices…" />;

  return (
    <div>
      <PageHeader
        title="Devices"
        subtitle={`${devices.length} registered edge devices`}
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Add Device
          </Button>
        }
      />

      {error && <div className="mb-6"><ErrorState message="Failed to load devices." /></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map(d => (
          <Card key={d.device_id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-brand-light">
                  <Monitor className="w-5 h-5 text-brand" />
                </div>
                <StatusBadge tone={STATUS_TONE[d.status] || 'neutral'} className="capitalize">{d.status}</StatusBadge>
              </div>
              <p className="font-medium text-sm mb-1 text-foreground">{d.location}</p>
              <p className="text-xs font-mono mb-3 text-muted-foreground">{d.device_id.slice(0, 16)}…</p>
              {d.last_heartbeat && (
                <p className="text-xs mb-3 text-muted-foreground">
                  Last heartbeat: {new Date(d.last_heartbeat).toLocaleString()}
                </p>
              )}
              <div className="flex gap-2">
                <Select value={d.status} onValueChange={(v) => handleStatusChange(d.device_id, v)}>
                  <SelectTrigger size="sm" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <ConfirmDialog
                  trigger={<Button variant="outline" size="sm">Delete</Button>}
                  title="Delete this device?"
                  description={`This will permanently remove ${d.location} and cannot be undone.`}
                  confirmLabel="Delete"
                  onConfirm={() => handleDelete(d.device_id, d.location)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {devices.length === 0 && (
          <div className="col-span-full">
            <EmptyState message="No devices registered yet" icon={Monitor} />
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Register Device</DialogTitle>
            <DialogDescription>Add a new edge device to the network.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Main Entrance"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
}
