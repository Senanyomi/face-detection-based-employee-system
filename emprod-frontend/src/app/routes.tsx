import { createBrowserRouter, Navigate } from 'react-router';
import { DashboardLayout } from './components/DashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { LiveAttendance } from './pages/LiveAttendance';
import { Employees } from './pages/Employees';
import { Productivity } from './pages/Productivity';
import { Reports } from './pages/Reports';
import { Devices } from './pages/Devices';
import { AuditLogs } from './pages/AuditLogs';
import { useAuth } from './context/AuthContext';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Still reading localStorage — don't redirect yet
  if (isLoading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <RequireAuth><DashboardLayout /></RequireAuth>,
    children: [
      { index: true,            element: <Dashboard /> },
      { path: 'attendance',     element: <LiveAttendance /> },
      { path: 'employees',      element: <Employees /> },
      { path: 'productivity',   element: <Productivity /> },
      { path: 'reports',        element: <Reports /> },
      { path: 'devices',        element: <Devices /> },
      { path: 'audit',          element: <AuditLogs /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);