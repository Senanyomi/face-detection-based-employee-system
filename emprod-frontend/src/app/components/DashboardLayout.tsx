import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, Activity, Users, TrendingUp,
  FileText, Terminal, Monitor, LogOut, Menu, Search,
  Sun, Moon, ChevronsLeft, ChevronsRight, User,
} from 'lucide-react';
import { api } from '../api';
import type { Employee } from '../types';
import { BrandMark } from './BrandMark';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu';

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Live Attendance', href: '/attendance', icon: Activity },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Productivity', href: '/productivity', icon: TrendingUp },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Devices', href: '/devices', icon: Monitor },
  { name: 'Audit Logs', href: '/audit', icon: Terminal },
];

function getInitials(name?: string) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'HR';
}

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-5 h-20 shrink-0 border-b border-sidebar-border">
      <BrandMark size={44} className="shrink-0" />
      {!collapsed && (
        <div>
          <h1 className="font-extrabold text-lg text-sidebar-foreground">Emprod</h1>
          <p className="text-xs text-sidebar-muted">AI HR Analytics</p>
        </div>
      )}
    </div>
  );
}

function NavLinks({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5">
      {navigation.map(({ name, href, icon: Icon }) => {
        const active = location.pathname === href;
        const link = (
          <Link
            key={href}
            to={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5',
              active
                ? 'bg-brand text-white'
                : 'text-sidebar-muted hover:bg-secondary',
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{name}</span>}
          </Link>
        );
        if (collapsed) {
          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{name}</TooltipContent>
            </Tooltip>
          );
        }
        return link;
      })}
    </nav>
  );
}

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    api.listEmployees().then(r => setAllEmployees(r.data.data)).catch(() => {});
  }, []);

  const searchResults = query.trim()
    ? allEmployees.filter(e =>
        e.full_name.toLowerCase().includes(query.toLowerCase()) || e.employee_id.includes(query)
      ).slice(0, 6)
    : [];

  const goToEmployees = () => {
    navigate('/employees');
    setQuery('');
    setShowResults(false);
  };

  const handleLogout = async () => {
    if (user) {
      await api.writeAuditLog('HR_ADMIN_LOGOUT', user.employee_id, {
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }
    logout();
    navigate('/login');
  };

  const initials = getInitials(user?.full_name);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex fixed top-0 left-0 bottom-0 z-40 flex-col transition-all duration-300 bg-sidebar border-r border-sidebar-border',
          collapsed ? 'w-[82px]' : 'w-[260px]',
        )}
      >
        <Logo collapsed={collapsed} />
        <NavLinks collapsed={collapsed} />
        <div className="px-3 pb-5 space-y-3">
          <div className="rounded-3xl p-4 flex items-center gap-3 bg-card border border-border">
            <Avatar className="w-11 h-11 rounded-2xl shrink-0">
              <AvatarFallback className="rounded-2xl bg-brand text-white font-bold">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">{user?.full_name}</p>
                <p className="text-xs truncate text-sidebar-muted">{user?.role}</p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 px-4 py-5 rounded-2xl text-sm text-foreground hover:bg-secondary"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sign out</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile nav drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main site navigation</SheetDescription>
          <Logo />
          <NavLinks onNavigate={() => setMobileOpen(false)} />
          <div className="px-3 pb-5">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 px-4 py-5 rounded-2xl text-sm text-foreground hover:bg-secondary"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-[margin] duration-300',
          collapsed ? 'lg:ml-[82px]' : 'lg:ml-[260px]',
        )}
      >
          <header className="sticky top-0 z-30 h-20 flex items-center px-4 sm:px-6 lg:px-8 bg-background border-b border-border">
            <div className="flex items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden rounded-2xl shrink-0"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden lg:inline-flex rounded-2xl shrink-0"
                  onClick={() => setCollapsed(c => !c)}
                >
                  {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
                </Button>
                <div className="hidden sm:block relative min-w-[220px] lg:min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 150)}
                    onKeyDown={(e) => { if (e.key === 'Enter') goToEmployees(); }}
                    placeholder="Search employees, reports, analytics…"
                    className="pl-8 rounded-2xl"
                  />
                  {showResults && query.trim() && (
                    <div className="absolute top-full mt-2 w-full rounded-2xl border border-border bg-popover shadow-md overflow-hidden z-40">
                      {searchResults.length > 0 ? searchResults.map((emp) => (
                        <button
                          key={emp.employee_id}
                          onMouseDown={goToEmployees}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary flex items-center justify-between gap-2"
                        >
                          <span className="truncate text-popover-foreground">{emp.full_name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{emp.department || '—'}</span>
                        </button>
                      )) : (
                        <p className="px-4 py-3 text-sm text-muted-foreground">No matches found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Badge variant="outline" className="hidden md:flex items-center gap-2 px-3 py-2 rounded-2xl border-border bg-card text-foreground font-normal">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  System Active
                </Badge>

                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-2xl"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-2xl pl-1.5 pr-3 gap-2 lg:hidden">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="bg-brand text-white text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user?.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                      <LogOut className="w-4 h-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="mx-auto max-w-7xl w-full">
              <Outlet />
            </div>
          </main>
      </div>
    </div>
  );
}
