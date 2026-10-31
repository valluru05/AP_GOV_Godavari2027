import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  Building2,
  ClipboardCheck,
  AlertTriangle,
  QrCode,
  ShieldAlert,
  MapPin,
  FileSpreadsheet,
  Users,
  History,
  CheckSquare,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Shield,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

export const AppLayout: React.FC = () => {
  const { user, logout, quickLogin, hasRole, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Executive Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects & Works', path: '/projects', icon: FolderGit2 },
    { name: 'Vendors', path: '/vendors', icon: Building2 },
    { name: 'Field Verification', path: '/inspections', icon: ClipboardCheck },
    { name: 'Defects & Rework', path: '/defects', icon: AlertTriangle },
    { name: 'Asset Registry & QR', path: '/assets', icon: QrCode },
    { name: 'Readiness & Risk', path: '/readiness', icon: ShieldAlert },
    { name: 'Geographic Map', path: '/map', icon: MapPin },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { name: 'My Tasks', path: '/my-tasks', icon: CheckSquare },
    {
      name: 'User Management',
      path: '/admin/users',
      icon: Users,
      permission: 'users:read',
    },
    {
      name: 'Audit Explorer',
      path: '/admin/audit',
      icon: History,
      permission: 'audit:read',
    },
  ];

  // Filter navigation by permissions
  const visibleNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission) || hasRole('super_admin');
  });

  const getBreadcrumbTitle = () => {
    const item = navItems.find((n) => location.pathname.startsWith(n.path));
    return item ? item.name : 'Platform';
  };

  const primaryRole = user?.roles[0]?.name || 'Authorized Official';

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top Banner: Synthetic Demo Indicator (Required by Section 4.3 & 23) */}
      <div className="bg-[#0F172A] text-slate-200 px-4 py-1.5 text-xs flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400 tracking-wide uppercase text-[11px]">
            Demonstration Prototype
          </span>
          <span className="text-slate-400">|</span>
          <span className="truncate">Godavari Pushkaralu 2027 Infrastructure Readiness Cell</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRoleSwitcherOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand/30 hover:bg-brand/50 text-sky-200 hover:text-white border border-sky-400/30 transition-colors text-[11px]"
          >
            <ArrowRightLeft className="w-3 h-3 text-sky-300" />
            <span>Switch Role</span>
          </button>
          <span className="text-slate-400 text-[11px] hidden md:inline">
            Logged in: <strong className="text-white font-medium">{user?.full_name}</strong> ({primaryRole})
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Collapsible Left Sidebar */}
        <aside
          className={`hidden md:flex flex-col bg-surface border-r border-borderLight transition-all duration-200 z-20 ${
            collapsed ? 'w-[76px]' : 'w-[250px]'
          }`}
        >
          {/* Brand header */}
          <div className="h-16 flex items-center px-4 border-b border-borderLight justify-between bg-slate-50/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white shrink-0 shadow-sm">
                <Shield className="w-5 h-5 text-sky-200" />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-brand tracking-tight leading-none truncate">
                    CivicProof
                  </span>
                  <span className="text-[10px] text-textSecondary uppercase tracking-wider font-semibold mt-0.5 truncate">
                    Readiness & Assets
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded text-textSecondary hover:text-textPrimary hover:bg-slate-100 transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-textSecondary hover:text-textPrimary hover:bg-slate-100/80'
                    } ${collapsed ? 'justify-center' : ''}`
                  }
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${collapsed ? '' : ''}`} />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* User footer profile */}
          <div className="p-3 border-t border-borderLight bg-slate-50/70">
            <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-brand-light text-brand font-bold text-xs flex items-center justify-center shrink-0 border border-brand-subtle">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-textPrimary truncate">{user?.full_name}</p>
                  <p className="text-[11px] text-textSecondary truncate">{primaryRole}</p>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-textSecondary hover:text-govError hover:bg-red-50 rounded-md transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 bg-surface h-full flex flex-col shadow-xl z-10">
              <div className="h-16 flex items-center px-4 border-b border-borderLight justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-brand" />
                  <span className="font-bold text-brand">CivicProof</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-textSecondary"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                          isActive
                            ? 'bg-brand text-white'
                            : 'text-textSecondary hover:text-textPrimary hover:bg-slate-100'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-borderLight">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-govError bg-govError-light rounded-md"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Navigation Bar */}
          <header className="h-14 bg-surface border-b border-borderLight px-4 md:px-6 flex items-center justify-between shrink-0 shadow-subtle sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-1.5 text-textSecondary hover:text-textPrimary rounded-md hover:bg-slate-100"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm text-textSecondary">
                <span className="hidden sm:inline font-medium text-slate-400">CivicProof</span>
                <span className="hidden sm:inline text-slate-300">/</span>
                <span className="font-semibold text-textPrimary">{getBreadcrumbTitle()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick role indicator pill */}
              <div className="hidden lg:flex items-center gap-2">
                <Badge variant="brand" size="sm">
                  {primaryRole}
                </Badge>
                {user?.department && (
                  <Badge variant="neutral" size="sm">
                    {user.department.code}
                  </Badge>
                )}
              </div>

              {/* Notification icon */}
              <button
                className="p-1.5 text-textSecondary hover:text-brand hover:bg-slate-100 rounded-lg relative transition-colors"
                title="Notifications"
                onClick={() => navigate('/dashboard')}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-govWarning rounded-full"></span>
              </button>

              {/* Quick Role Switcher Button */}
              <button
                onClick={() => setRoleSwitcherOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand bg-brand-light hover:bg-brand-subtle rounded-lg border border-brand/20 transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Role Switcher</span>
              </button>
            </div>
          </header>

          {/* Page View Body */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Role Switcher Modal (Instant Role Simulation for Evaluators) */}
      <Modal
        isOpen={roleSwitcherOpen}
        onClose={() => setRoleSwitcherOpen(false)}
        title="Interactive Role Simulator"
        description="Switch between pre-configured Godavari Pushkaralu demo accounts to verify permission boundaries."
        maxWidth="lg"
      >
        <div className="space-y-3">
          {DEMO_ACCOUNTS.map((acc) => {
            const isCurrent = user?.email === acc.email;
            return (
              <div
                key={acc.email}
                className={`p-3.5 rounded-lg border transition-all flex items-center justify-between gap-4 ${
                  isCurrent
                    ? 'border-brand bg-brand-light/40 shadow-sm'
                    : 'border-borderLight hover:border-brand/40 hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-textPrimary">{acc.roleName}</span>
                    {isCurrent && (
                      <Badge variant="brand" size="sm">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-textPrimary font-medium mt-0.5 truncate">{acc.name}</p>
                  <p className="text-[11px] text-textSecondary mt-0.5">{acc.description}</p>
                </div>
                <button
                  disabled={isCurrent}
                  onClick={async () => {
                    await quickLogin(acc.email);
                    setRoleSwitcherOpen(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-brand text-white hover:bg-brand-hover shadow-subtle'
                  }`}
                >
                  {isCurrent ? 'Current' : 'Switch To'}
                </button>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};
