import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Lazy-loaded route components for high-performance bundle splitting & fast mobile load
const LoginPage = lazy(() => import('./features/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const UnauthorizedPage = lazy(() => import('./features/auth/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })));
const NotFoundPage = lazy(() => import('./features/auth/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const UsersPage = lazy(() => import('./features/administration/UsersPage').then(m => ({ default: m.UsersPage })));
const AdminHubPage = lazy(() => import('./features/administration/AdminHubPage').then(m => ({ default: m.AdminHubPage })));
const AuditExplorerPage = lazy(() => import('./features/audit/AuditExplorerPage').then(m => ({ default: m.AuditExplorerPage })));
const ProjectListPage = lazy(() => import('./features/projects/ProjectListPage').then(m => ({ default: m.ProjectListPage })));
const ProjectDetailPage = lazy(() => import('./features/projects/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })));
const VendorListPage = lazy(() => import('./features/vendors/VendorListPage').then(m => ({ default: m.VendorListPage })));
const VendorDashboardPage = lazy(() => import('./features/vendors/VendorDashboardPage').then(m => ({ default: m.VendorDashboardPage })));
const InspectionListPage = lazy(() => import('./features/inspections/InspectionListPage').then(m => ({ default: m.InspectionListPage })));
const InspectionDetailPage = lazy(() => import('./features/inspections/InspectionDetailPage').then(m => ({ default: m.InspectionDetailPage })));
const DefectListPage = lazy(() => import('./features/defects/DefectListPage').then(m => ({ default: m.DefectListPage })));
const DefectDetailPage = lazy(() => import('./features/defects/DefectDetailPage').then(m => ({ default: m.DefectDetailPage })));
const AssetListPage = lazy(() => import('./features/assets/AssetListPage').then(m => ({ default: m.AssetListPage })));
const AssetDetailPage = lazy(() => import('./features/assets/AssetDetailPage').then(m => ({ default: m.AssetDetailPage })));
const ReadinessDashboardPage = lazy(() => import('./features/readiness/ReadinessDashboardPage').then(m => ({ default: m.ReadinessDashboardPage })));
const DependencyGraphPage = lazy(() => import('./features/dependencies/DependencyGraphPage').then(m => ({ default: m.DependencyGraphPage })));
const MapPage = lazy(() => import('./features/map/MapPage').then(m => ({ default: m.MapPage })));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const NotificationCenterPage = lazy(() => import('./features/notifications/NotificationCenterPage').then(m => ({ default: m.NotificationCenterPage })));
const MyTasksPage = lazy(() => import('./features/tasks/MyTasksPage').then(m => ({ default: m.MyTasksPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const PageLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8 text-slate-500">
    <div className="w-9 h-9 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-3" />
    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
      Loading Module...
    </span>
  </div>
);

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {/* Public authentication pages */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* Authenticated Application routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />

                  {/* Module 1 & 14 Administration, Governance & Security */}
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute requiredPermission="users:read">
                        <UsersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/system"
                    element={
                      <ProtectedRoute requiredPermission="users:read">
                        <AdminHubPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/audit"
                    element={
                      <ProtectedRoute requiredPermission="audit:read">
                        <AuditExplorerPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Module 3 Project and Work Register */}
                  <Route path="/projects" element={<ProjectListPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />

                  {/* Module 4 Vendor & Service-Provider Management */}
                  <Route path="/vendors" element={<VendorListPage />} />
                  <Route path="/vendors/:id" element={<VendorDashboardPage />} />
                  <Route path="/vendor-portal" element={<VendorDashboardPage />} />

                  {/* Module 5 Field Verification and Mobile Inspections */}
                  <Route path="/inspections" element={<InspectionListPage />} />
                  <Route path="/inspections/:id" element={<InspectionDetailPage />} />

                  {/* Module 6 Defects, Corrective Action, & Rework */}
                  <Route path="/defects" element={<DefectListPage />} />
                  <Route path="/defects/:id" element={<DefectDetailPage />} />

                  {/* Module 7 Municipal Asset Registry & QR Traceability */}
                  <Route path="/assets" element={<AssetListPage />} />
                  <Route path="/assets/:id" element={<AssetDetailPage />} />

                  {/* Module 8 Verified Readiness Chain & Risk Engine */}
                  <Route path="/readiness" element={<ReadinessDashboardPage />} />

                  {/* Module 9 Readiness Dependency Graph & Risk Engine */}
                  <Route path="/dependencies" element={<DependencyGraphPage />} />

                  {/* Module 10 Geographic Map & Zone Monitoring */}
                  <Route path="/map" element={<MapPage />} />

                  {/* Retired Offline Sync -> Redirect to Inspections */}
                  <Route path="/offline" element={<Navigate to="/inspections" replace />} />

                  {/* Module 12 Reports, Exports, & Audit History */}
                  <Route path="/reports" element={<ReportsPage />} />

                  {/* Module 13 Notifications and Task Management / Action Queue */}
                  <Route path="/notifications" element={<NotificationCenterPage />} />
                  <Route path="/my-tasks" element={<MyTasksPage />} />
                </Route>

                {/* 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
