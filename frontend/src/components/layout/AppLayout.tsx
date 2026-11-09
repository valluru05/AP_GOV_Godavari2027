import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  ClipboardCheck,
  QrCode,
  ShieldAlert,
  MapPin,
  FileSpreadsheet,
  CheckSquare,
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  ArrowRightLeft,
  Sliders,
} from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { NotificationBellDropdown } from '../../features/notifications/NotificationBellDropdown';
import { ApGovernmentSeal, PushkaraluKalash, CivicProofLotusLogo } from '../common/BrandEmblems';
import headerSketch from '../../assets/header-temple-sketch.png';
import sidebarSilhouette from '../../assets/sidebar-silhouette-clean.png';

interface NavGroupItem {
  name: string;
  path: string;
  icon?: any;
  permission?: string;
  badge?: number | string;
}

interface NavGroup {
  id: string;
  name: string;
  icon: any;
  path?: string; // direct link if not expandable
  permission?: string;
  badge?: number | string;
  items?: NavGroupItem[];
}

export const AppLayout: React.FC = () => {
  const { user, logout, quickLogin, hasRole, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState<boolean>(false);
  
  // Track open state for expandable navigation groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    projects: true,
    field: true,
    assets: false,
    readiness: false,
    reports: false,
    admin: false,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isVendor = hasRole('vendor');

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Structured consolidated navigation groups as specified in Section 4
  const navGroups: NavGroup[] = [
    {
      id: 'home',
      name: 'Executive Overview',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'projects',
      name: 'Projects & Works',
      icon: FolderGit2,
      path: '/projects',
      items: [
        { name: 'All Projects', path: '/projects' },
        { name: 'Contractors & Vendors', path: isVendor ? '/vendors/me' : '/vendors' },
      ],
    },
    {
      id: 'field',
      name: 'Field Operations',
      icon: ClipboardCheck,
      path: '/inspections',
      items: [
        { name: 'Inspections', path: '/inspections' },
        { name: 'Defects & Rework', path: '/defects' },
        { name: 'Offline Field Sync', path: '/offline' },
      ],
    },
    {
      id: 'assets',
      name: 'Assets',
      icon: QrCode,
      path: '/assets',
      items: [
        { name: 'Asset Registry', path: '/assets' },
        { name: 'QR Scanner', path: '/assets?scan=open' },
        { name: 'Maintenance', path: '/assets?filter=maintenance' },
      ],
    },
    {
      id: 'readiness',
      name: 'Readiness & Risk',
      icon: ShieldAlert,
      path: '/readiness',
      items: [
        { name: 'Readiness Overview', path: '/readiness' },
        { name: 'Dependency Graph', path: '/dependencies' },
      ],
    },
    {
      id: 'map',
      name: 'Geographic Map',
      path: '/map',
      icon: MapPin,
    },
    {
      id: 'tasks',
      name: 'My Tasks',
      path: '/my-tasks',
      icon: CheckSquare,
      badge: 13,
    },
    {
      id: 'reports',
      name: 'Reports & Audit',
      icon: FileSpreadsheet,
      path: '/reports',
      items: [
        { name: 'Reports & Exports', path: '/reports' },
        { name: 'Audit Explorer', path: '/admin/audit', permission: 'audit:read' },
      ],
    },
    {
      id: 'admin',
      name: 'Administration',
      icon: Sliders,
      permission: 'users:read',
      path: '/admin/system',
      items: [
        { name: 'System Configuration', path: '/admin/system', permission: 'users:read' },
        { name: 'User Management', path: '/admin/users', permission: 'users:read' },
      ],
    },
  ];

  // Filter groups by permissions
  const visibleGroups = navGroups.filter((grp) => {
    if (!grp.permission) return true;
    return hasPermission(grp.permission) || hasRole('super_admin');
  });

  const primaryRole = user?.roles[0]?.name || 'Authorized Official';

  return (
    <div className="min-h-screen bg-[#FFF8EE] flex flex-col font-sans text-textPrimary">
      {/* ========================================================= */}
      {/* TOP HEADER: Government Identity & Pushkaralu 2027 Title  */}
      {/* ========================================================= */}
      <header className="bg-white border-b border-[#E9DED2] sticky top-0 z-30 shadow-subtle">
        <div className="px-3 sm:px-6 h-16 flex items-center justify-between relative overflow-hidden">
          {/* Left: AP Seal + Godavari Pushkaralu Identity */}
          <div className="flex items-center gap-3 sm:gap-6 z-10">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-textSecondary hover:text-textPrimary md:hidden"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Government of Andhra Pradesh Emblem */}
            <div className="flex items-center gap-2.5 pr-3 sm:pr-5 border-r border-[#E9DED2]">
              <ApGovernmentSeal className="w-9 h-9 shrink-0 drop-shadow-sm" />
              <div className="hidden sm:flex flex-col">
                <span className="text-[12px] font-bold text-[#166534] tracking-tight leading-none">
                  Government of
                </span>
                <span className="text-[12px] font-bold text-[#166534] tracking-tight leading-tight">
                  Andhra Pradesh
                </span>
              </div>
            </div>

            {/* Pushkaralu 2027 Logo & Title */}
            <div className="flex items-center gap-2.5">
              <PushkaraluKalash className="w-9 h-9 shrink-0 drop-shadow-sm" />
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-extrabold text-[#8F2D16] tracking-tight font-serif leading-none">
                  Godavari Pushkaralu 2027
                </span>
                <span className="text-[10px] sm:text-[11px] text-textSecondary font-medium mt-0.5 tracking-tight truncate max-w-[200px] sm:max-w-none">
                  Sri Godavari Maha Pushkaralu &nbsp;|&nbsp; Rajamahendravaram
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Subtle temple sketch watermark (hidden on mobile) */}
          <div className="hidden xl:block absolute left-[44%] -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
            <img src={headerSketch} alt="Ghats sketch" className="h-10 object-contain" />
          </div>

          {/* Right: Notification Bell, IAS Profile & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-4 z-10">
            {/* Role Switcher Pill for Reviewers & Evaluators */}
            <button
              onClick={() => setRoleSwitcherOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF3E8] hover:bg-[#FCE4CB] text-[#E87512] border border-[#FCE4CB] transition-colors text-xs font-semibold"
              title="Switch user demo role"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#E87512]" />
              <span>Switch Role</span>
            </button>

            {/* Notification Bell with Badge */}
            <NotificationBellDropdown />

            {/* User Profile Avatar & Designation */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#E9DED2]">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E87512] to-[#8F2D16] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm ring-2 ring-[#FCE4CB]">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-textPrimary leading-none">
                  {user?.full_name || 'Sri K. Ramesh Babu, IAS'}
                </span>
                <span className="text-[11px] text-textSecondary mt-0.5 leading-tight font-medium">
                  {primaryRole}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN CONTAINER: Left Sidebar + Page Workspace             */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar: Deep Temple Red Gradient with Ghat Silhouette */}
        <aside
          className={`hidden md:flex flex-col bg-gradient-to-b from-[#8F2D16] via-[#7B2411] to-[#631B0A] text-white transition-all duration-200 z-20 shrink-0 shadow-lg relative ${
            collapsed ? 'w-[72px]' : 'w-[230px]'
          }`}
        >
          {/* Top Brand Banner: CivicProof Lotus */}
          <div className="h-16 flex items-center px-4 justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <CivicProofLotusLogo className="w-8 h-8 shrink-0 drop-shadow" />
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white tracking-tight leading-none flex items-center gap-1">
                    CivicProof<sup className="text-[9px] font-normal opacity-80">®</sup>
                  </span>
                  <span className="text-[9px] text-[#FCE4CB] tracking-wider uppercase font-medium mt-1 truncate">
                    Readiness & Assets
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title={collapsed ? 'Expand menu' : 'Collapse menu'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links Area */}
          <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
            {visibleGroups.map((group) => {
              const Icon = group.icon;
              const hasSubItems = group.items && group.items.length > 0;
              const isGroupActive =
                group.path &&
                (location.pathname === group.path ||
                  (group.path !== '/dashboard' && location.pathname.startsWith(group.path)));
              const isExpanded = expandedGroups[group.id];

              if (!hasSubItems || collapsed) {
                // Direct nav item without sub-items or when sidebar is collapsed
                return (
                  <NavLink
                    key={group.id}
                    to={group.path || '#'}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive || isGroupActive
                          ? 'bg-[#E87512] text-white shadow-md font-semibold'
                          : 'text-[#F5E6DD] hover:text-white hover:bg-white/10'
                      } ${collapsed ? 'justify-center px-2' : ''}`
                    }
                    title={collapsed ? group.name : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{group.name}</span>}
                    </div>
                    {!collapsed && group.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#F4B942] text-[#35251E] shadow-sm">
                        {group.badge}
                      </span>
                    )}
                  </NavLink>
                );
              }

              // Expandable Group
              return (
                <div key={group.id} className="space-y-0.5">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isGroupActive
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-[#F5E6DD] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{group.name}</span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 opacity-70 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Sub-items dropdown */}
                  {isExpanded && (
                    <div className="pl-6 pr-1 py-0.5 space-y-0.5">
                      {group.items?.map((sub) => {
                        const isSubActive =
                          location.pathname === sub.path ||
                          (sub.path !== '/projects' && location.pathname.startsWith(sub.path));
                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            className={({ isActive }) =>
                              `block px-2.5 py-1.5 rounded-lg text-[11px] transition-colors truncate ${
                                isActive || isSubActive
                                  ? 'bg-[#E87512] text-white font-bold shadow-sm'
                                  : 'text-[#F0D5C7] hover:text-white hover:bg-white/10 font-medium'
                              }`
                            }
                          >
                            {sub.name}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Bottom Ghat Lamps Silhouette Illustration */}
          <div className="mt-auto pointer-events-none opacity-85 shrink-0 overflow-hidden relative">
            <img
              src={sidebarSilhouette}
              alt="Godavari Ghat Sunset Silhouette"
              className="w-full h-20 object-cover object-bottom"
            />
          </div>

          {/* User Signout footer */}
          <div className="p-3 border-t border-white/10 bg-black/15 shrink-0 z-10">
            <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate leading-tight">
                    {user?.full_name}
                  </p>
                  <p className="text-[10px] text-[#FCE4CB] truncate leading-none mt-0.5">
                    {primaryRole}
                  </p>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-md transition-colors"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 bg-gradient-to-b from-[#8F2D16] to-[#631B0A] text-white h-full flex flex-col shadow-2xl z-10">
              <div className="h-16 flex items-center px-4 border-b border-white/10 justify-between">
                <div className="flex items-center gap-2.5">
                  <CivicProofLotusLogo className="w-8 h-8" />
                  <span className="font-bold text-white text-base">CivicProof®</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {visibleGroups.map((group) => {
                  const Icon = group.icon;
                  const hasSubItems = group.items && group.items.length > 0;
                  const isExpanded = expandedGroups[group.id];

                  if (!hasSubItems) {
                    return (
                      <NavLink
                        key={group.id}
                        to={group.path || '#'}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                            isActive
                              ? 'bg-[#E87512] text-white font-semibold'
                              : 'text-[#F5E6DD] hover:bg-white/10'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span>{group.name}</span>
                        </div>
                        {group.badge && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F4B942] text-[#35251E]">
                            {group.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  }

                  return (
                    <div key={group.id} className="space-y-1">
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-[#F5E6DD] hover:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span>{group.name}</span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="pl-8 space-y-1">
                          {group.items?.map((sub) => (
                            <NavLink
                              key={sub.path}
                              to={sub.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={({ isActive }) =>
                                `block px-3 py-2 rounded-lg text-xs ${
                                  isActive
                                    ? 'bg-[#E87512] text-white font-bold'
                                    : 'text-[#F0D5C7] hover:bg-white/10 font-medium'
                                }`
                              }
                            >
                              {sub.name}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center">
                    {user?.full_name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
                    <p className="text-[10px] text-[#FCE4CB]">{primaryRole}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-white/80 hover:text-white"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Workspace */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#FFF8EE]">
          {/* Breadcrumb Header Bar */}
          <div className="px-4 sm:px-8 py-2.5 bg-[#FAF4EC]/80 border-b border-[#E9DED2] flex items-center justify-between text-xs text-textSecondary shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <span className="text-textSecondary">CivicProof</span>
              <span>&gt;</span>
              <span className="text-[#8F2D16] font-semibold">
                {location.pathname === '/dashboard'
                  ? 'Executive Overview'
                  : location.pathname.slice(1).replace('-', ' ').toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-textSecondary">
              <span className="inline-block w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
              <span>Live Database Connection</span>
            </div>
          </div>

          {/* Routed Page Container */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Role Switcher Modal (Allows testing all 7 government roles instantly) */}
      <Modal
        isOpen={roleSwitcherOpen}
        onClose={() => setRoleSwitcherOpen(false)}
        title="Switch Official Role"
        description="Select a role profile to experience role-based home dashboards and permission boundaries."
        maxWidth="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {DEMO_ACCOUNTS.map((acc) => {
            const isCurrent = user?.email === acc.email;
            return (
              <div
                key={acc.email}
                onClick={async () => {
                  await quickLogin(acc.email);
                  setRoleSwitcherOpen(false);
                  navigate('/dashboard');
                }}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isCurrent
                    ? 'border-[#8F2D16] bg-[#FDF2EB] ring-2 ring-[#8F2D16]/20'
                    : 'border-[#E9DED2] bg-white hover:border-[#E87512] hover:shadow-card'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-textPrimary">{acc.name}</span>
                  {isCurrent && <Badge variant="brand" size="sm">Active</Badge>}
                </div>
                <p className="text-xs font-semibold text-[#8F2D16] mb-1">{acc.roleName}</p>
                <p className="text-[11px] text-textSecondary leading-snug">{acc.description}</p>
                <div className="mt-2 text-[10px] font-mono text-textMuted">{acc.department}</div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};
