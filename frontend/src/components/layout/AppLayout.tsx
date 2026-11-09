import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  X,
} from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { NotificationBellDropdown } from '../../features/notifications/NotificationBellDropdown';
import { LanguageSelector } from '../common/LanguageSelector';
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
  const { t } = useTranslation();
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

  // Structured consolidated navigation groups with full multilingual translation
  // Note: Offline Field Sync is completely removed as mandated.
  const navGroups: NavGroup[] = [
    {
      id: 'home',
      name: t('nav.executiveOverview'),
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'projects',
      name: t('nav.projectsAndWorks'),
      icon: FolderGit2,
      path: '/projects',
      items: [
        { name: t('nav.allProjects'), path: '/projects' },
        { name: t('nav.contractorsAndVendors'), path: isVendor ? '/vendors/me' : '/vendors' },
      ],
    },
    {
      id: 'field',
      name: t('nav.fieldOperations'),
      icon: ClipboardCheck,
      path: '/inspections',
      items: [
        { name: t('nav.inspections'), path: '/inspections' },
        { name: t('nav.defectsAndRework'), path: '/defects' },
      ],
    },
    {
      id: 'assets',
      name: t('nav.assets'),
      icon: QrCode,
      path: '/assets',
      items: [
        { name: t('nav.assetRegistry'), path: '/assets' },
        { name: t('nav.qrScanner'), path: '/assets?scan=open' },
        { name: t('nav.maintenance'), path: '/assets?filter=maintenance' },
      ],
    },
    {
      id: 'readiness',
      name: t('nav.readinessAndRisk'),
      icon: ShieldAlert,
      path: '/readiness',
      items: [
        { name: t('nav.readinessOverview'), path: '/readiness' },
        { name: t('nav.dependencyGraph'), path: '/dependencies' },
      ],
    },
    {
      id: 'map',
      name: t('nav.geographicMap'),
      path: '/map',
      icon: MapPin,
    },
    {
      id: 'tasks',
      name: t('nav.myTasks'),
      path: '/my-tasks',
      icon: CheckSquare,
      badge: 13,
    },
    {
      id: 'reports',
      name: t('nav.reportsAndAudit'),
      icon: FileSpreadsheet,
      path: '/reports',
      items: [
        { name: t('nav.reportsAndExports'), path: '/reports' },
        { name: t('nav.auditExplorer'), path: '/admin/audit', permission: 'audit:read' },
      ],
    },
    {
      id: 'admin',
      name: t('nav.administration'),
      icon: Sliders,
      permission: 'users:read',
      path: '/admin/system',
      items: [
        { name: t('nav.systemConfiguration'), path: '/admin/system', permission: 'users:read' },
        { name: t('nav.userManagement'), path: '/admin/users', permission: 'users:read' },
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
        <div className="px-2.5 sm:px-6 h-16 flex items-center justify-between relative overflow-hidden">
          {/* Left: Hamburger + AP Seal + Godavari Pushkaralu Identity */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 z-10 min-w-0">
            {/* Mobile menu trigger: visible on <1024px screens */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-[#7C7168] hover:text-[#35251E] hover:bg-[#FAF4EC] rounded-lg lg:hidden transition-colors"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Government of Andhra Pradesh Emblem */}
            <div className="flex items-center gap-2 sm:gap-2.5 pr-2 sm:pr-4 border-r border-[#E9DED2] shrink-0">
              <ApGovernmentSeal className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 drop-shadow-sm" />
              <div className="hidden sm:flex flex-col">
                <span className="text-[11px] sm:text-[12px] font-bold text-[#166534] tracking-tight leading-none">
                  {t('header.apGovt').split(' ')[0]} {t('header.apGovt').split(' ')[1] || ''}
                </span>
                <span className="text-[11px] sm:text-[12px] font-bold text-[#166534] tracking-tight leading-tight">
                  {t('header.apGovt').split(' ').slice(2).join(' ') || 'Andhra Pradesh'}
                </span>
              </div>
            </div>

            {/* Pushkaralu 2027 Logo & Title */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <PushkaraluKalash className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 drop-shadow-sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-base font-extrabold text-[#8F2D16] tracking-tight font-serif leading-none truncate">
                  {t('header.eventTitle')}
                </span>
                <span className="text-[9px] sm:text-[11px] text-[#7C7168] font-medium mt-0.5 tracking-tight truncate max-w-[150px] sm:max-w-xs md:max-w-none">
                  {t('header.eventSubtitle')}
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Subtle temple sketch watermark (hidden on mobile and small tablet) */}
          <div className="hidden xl:block absolute left-[48%] -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
            <img src={headerSketch} alt="Ghats sketch" className="h-10 object-contain" />
          </div>

          {/* Right: Language Selector, Role Switcher, Notifications, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-3 z-10 shrink-0">
            {/* Language Selector Dropdown (Pillar 1) */}
            <LanguageSelector compactOnMobile={true} />

            {/* Role Switcher Pill for Reviewers & Evaluators */}
            <button
              onClick={() => setRoleSwitcherOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FEF3E8] hover:bg-[#FCE4CB] text-[#E87512] border border-[#FCE4CB] transition-colors text-xs font-semibold shadow-subtle"
              title={t('header.roleSwitcherTitle')}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#E87512]" />
              <span>{t('nav.switchRole')}</span>
            </button>

            {/* Notification Bell with Badge */}
            <NotificationBellDropdown />

            {/* User Profile Avatar & Designation */}
            <div className="flex items-center gap-2 pl-1.5 sm:pl-2.5 border-l border-[#E9DED2]">
              <div
                onClick={() => setRoleSwitcherOpen(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#E87512] to-[#8F2D16] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm ring-2 ring-[#FCE4CB] cursor-pointer hover:scale-105 transition-transform"
                title={`${user?.full_name || 'Official'} — Click to switch role`}
              >
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-textPrimary leading-none truncate max-w-[140px]">
                  {user?.full_name || 'Sri K. Ramesh Babu, IAS'}
                </span>
                <span className="text-[10px] text-textSecondary mt-0.5 leading-tight font-medium truncate max-w-[140px]">
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
        {/* Desktop Sidebar: Deep Temple Red Gradient (Visible on lg: >=1024px) */}
        <aside
          className={`hidden lg:flex flex-col bg-gradient-to-b from-[#8F2D16] via-[#7B2411] to-[#631B0A] text-white transition-all duration-200 z-20 shrink-0 shadow-lg relative ${
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
                  title={t('nav.signOut')}
                  aria-label={t('nav.signOut')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer: active on <1024px screens */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop Blur */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Sliding Panel */}
            <div className="relative w-80 max-w-[85vw] bg-gradient-to-b from-[#8F2D16] to-[#631B0A] text-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
              {/* Drawer Header */}
              <div className="h-16 flex items-center px-4 border-b border-white/10 justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <CivicProofLotusLogo className="w-8 h-8" />
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-sm leading-tight">CivicProof®</span>
                    <span className="text-[10px] text-[#FCE4CB] uppercase tracking-wider">Pushkaralu 2027</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Language & Role Switcher Bar inside Mobile Drawer */}
              <div className="p-3 bg-black/20 border-b border-white/10 flex items-center justify-between gap-2">
                <div className="flex-1">
                  <LanguageSelector className="w-full" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setRoleSwitcherOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#F4B942]" />
                  <span>{t('nav.switchRole')}</span>
                </button>
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
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
                          `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium ${
                            isActive
                              ? 'bg-[#E87512] text-white font-semibold shadow-md'
                              : 'text-[#F5E6DD] hover:bg-white/10'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span>{group.name}</span>
                        </div>
                        {group.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4B942] text-[#35251E]">
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
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[#F5E6DD] hover:bg-white/10"
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
                        <div className="pl-8 space-y-1 py-1">
                          {group.items?.map((sub) => (
                            <NavLink
                              key={sub.path}
                              to={sub.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={({ isActive }) =>
                                `block px-3 py-2 rounded-lg text-xs font-medium ${
                                  isActive
                                    ? 'bg-[#E87512] text-white font-bold'
                                    : 'text-[#F0D5C7] hover:bg-white/10'
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

              {/* Mobile Drawer Footer with User Signout */}
              <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/30 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {user?.full_name?.charAt(0) || 'A'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
                    <p className="text-[10px] text-[#FCE4CB] truncate">{primaryRole}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title={t('nav.signOut')}
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
          <div className="px-3 sm:px-8 py-2.5 bg-[#FAF4EC]/80 border-b border-[#E9DED2] flex items-center justify-between text-xs text-textSecondary shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 font-medium truncate">
              <span className="text-textSecondary">CivicProof</span>
              <span>&gt;</span>
              <span className="text-[#8F2D16] font-semibold truncate">
                {location.pathname === '/dashboard'
                  ? t('nav.executiveOverview')
                  : location.pathname.slice(1).replace('-', ' ').toUpperCase()}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] text-textSecondary shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
              <span>{t('header.liveDb')}</span>
            </div>
          </div>

          {/* Routed Page Container: Optimized with responsive padding */}
          <div className="flex-1 p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Role Switcher Modal */}
      <Modal
        isOpen={roleSwitcherOpen}
        onClose={() => setRoleSwitcherOpen(false)}
        title={t('header.roleSwitcherTitle')}
        description={t('header.roleSwitcherDesc')}
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
                  {isCurrent && <Badge variant="brand" size="sm">{t('nav.activeRole')}</Badge>}
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
