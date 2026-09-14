import {useState} from 'react';
import {useNavigate} from 'react-router';
import {useAuth} from '../context/AuthContext';
import {api} from '../api';
import {Loader2, ShieldCheck, Camera, Activity, Lock} from 'lucide-react';
import {BrandMark} from '../components/BrandMark';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Label} from '../components/ui/label';
import {Alert, AlertDescription} from '../components/ui/alert';

export function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login} = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
	e.preventDefault();
    setError('');
    if (!employeeId.trim()) { setError('Employee ID is required'); return; }
    setLoading(true);
    try {
      const empRes = await api.getEmployee(employeeId.trim());
      const employee = empRes.data.data;

      const allowedRoles = ['HR) Admin', 'HR_Admin', 'admin', 'HR', 'System Admin'];
      const isAllowed = allowedRoles.some(r =>
        employee.role?.toLowerCase().includes(r.toLowerCase())
     );
      if (!isAllowed) {
        setError('Access denied. Only HR Admin accounts can log in here');
        setLoading(false);
        return;
      }

      const tokenRes = await api.issueToken(employeeId.trim());
      const { access_token } = tokenRes.data.data;

      await api.writeAuditLog('HR_ADMIN_LOGIN', employee.employee_id, {
        role: employee.role,
        timestamp: new Date().toISOString(),
      });

      login({
        employee_id: employee.employee_id,
        full_name: employee.full_name,
        role: employee.role || 'HR Admin',
        token: access_token,
      });

      navigate('/');
    } catch (err: any) {
      const msg = err?.response?.data  ? err?.response.data.detail || err?.response.data.message : 'Login failed. Check your Employee ID and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Camera, label: 'Face Recognition', value: 'AI-powered' },
    { icon: Activity, label: 'Live Monitoring', value: 'Real-time' },
    { icon: Lock, label: 'Data Security', value: 'Encrypted' },
  ];

    return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center gap-3">
          <BrandMark size={36} />
          <span className="text-lg font-extrabold tracking-tight">Emprod</span>
        </div>
        <div>
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-6 bg-success-light text-success">
              <ShieldCheck className="w-3.5 h-3.5" />
              HR Management Platform
            </div>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight mb-4 text-sidebar-foreground">
              Employee Productivity<br />Analysis System
            </h2>
            <p className="text-base leading-relaxed text-sidebar-muted">
              Real-time AI-driven attendance logging and productivity estimation for your workforce.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {features.map(({ icon: Icon, label, value }) => (
              <div key={label} className="p-4 rounded-xl bg-secondary border border-sidebar-border">
                <Icon className="w-4 h-4 mb-2 text-sidebar-muted" />
                <p className="text-xs mb-1 text-sidebar-muted">{label}</p>
                <p className="text-sm font-medium text-sidebar-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-sidebar-muted">
          © 2026 Emprod. Secure biometric attendance management.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="flex flex-col items-center text-center mb-8">
              <BrandMark size={48} className="mb-4 lg:hidden" />
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                HR Admin Sign In
              </h1>
              <p className="text-sm mt-1.5 text-muted-foreground">
                Enter your Employee ID to access the dashboard
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. 3c4d5e6f-..."
                  className="font-mono"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Your UUID employee ID from the system
                </p>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>
          <div className="mt-6 p-4 rounded-xl text-xs space-y-1 bg-brand-light text-brand-dark">
            <p className="font-medium">First time?</p>
            <p>
              Ask your system administrator to register your employee record with an
              HR Admin role, then use your assigned Employee ID to sign in.
            </p>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            © 2026 Emprod. Secure biometric attendance management.
          </p>
        </div>
      </div>
    </div>
  );
}
