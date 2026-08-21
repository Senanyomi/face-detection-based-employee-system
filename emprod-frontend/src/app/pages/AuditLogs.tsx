import { useEffect, useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge, StatusTone } from '../components/StatusBadge';
import type { AuditLog } from '../types';
import { Search, Eye } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';

function actionTone(action: string): StatusTone {
  const a = action.toUpperCase();
  if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('REVOKE')) return 'destructive';
  if (a.includes('LOGIN') || a.includes('CREATE') || a.includes('REGISTER') || a.includes('GRANT')) return 'success';
  if (a.includes('UPDATE') || a.includes('PATCH') || a.includes('CONSENT')) return 'info';
  if (a.includes('LOGOUT')) return 'neutral';
  return 'neutral';
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);

  useEffect(() => {
    api.getAuditLogs(200)
      .then(r => { setLogs(r.data.data); setError(false); })
      .catch((err) => { console.error(err); setError(true); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.performed_by || '').includes(search)
  );

  if (loading) return <LoadingSpinner label="Loading audit logs…" />;

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Append-only trail of all system actions" />

      {error && <div className="mb-4"><ErrorState message="Failed to load audit logs." /></div>}

      <div className="mb-4 relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by action or employee ID…"
          className="pl-8"
        />
      </div>

      <Card className="gap-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(log => (
              <TableRow key={log.audit_id}>
                <TableCell>
                  <StatusBadge tone={actionTone(log.action)}>{log.action}</StatusBadge>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {log.performed_by ? log.performed_by.slice(0, 12) + '…' : 'System'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>
                  {log.metadata ? (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelected(log)}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-sm text-muted-foreground">No audit logs found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.action}</DialogTitle>
            <DialogDescription>
              {selected && new Date(selected.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <pre className="text-xs font-mono bg-muted rounded-lg p-4 overflow-auto max-h-80 text-foreground">
            {selected?.metadata ? JSON.stringify(selected.metadata, null, 2) : '—'}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
