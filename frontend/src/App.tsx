import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { UnauthorizedPage } from './features/auth/UnauthorizedPage';
import { NotFoundPage } from './features/auth/NotFoundPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { UsersPage } from './features/administration/UsersPage';
import { AuditExplorerPage } from './features/audit/AuditExplorerPage';
import { ProjectListPage } from './features/projects/ProjectListPage';
import { ProjectDetailPage } from './features/projects/ProjectDetailPage';
import { VendorListPage } from './features/vendors/VendorListPage';
import { VendorDashboardPage } from './features/vendors/VendorDashboardPage';
import { InspectionListPage } from './features/inspections/InspectionListPage';
import { InspectionDetailPage } from './features/inspections/InspectionDetailPage';
import { DefectListPage } from './features/defects/DefectListPage';
import { DefectDetailPage } from './features/defects/DefectDetailPage';
import { AssetListPage } from './features/assets/AssetListPage';
import { AssetDetailPage } from './features/assets/AssetDetailPage';
import { ReadinessDashboardPage } from './features/readiness/ReadinessDashboardPage';
import { DependencyGraphPage } from './features/dependencies/DependencyGraphPage';
import { MapPage } from './features/map/MapPage';
import { ModulePlaceholderPage } from './components/layout/ModulePlaceholderPage';

const queryClient = new QueryClient();

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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

              {/* Module 1 Administration & Security */}
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredPermission="users:read">
                    <UsersPage />
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

              <Route
                path="/reports"
                element={
                  <ModulePlaceholderPage
                    moduleNumber={12}
                    moduleTitle="Reports, Exports, & Analytics"
                    description="Custom filters, CSV exports, and printable PDF executive briefings."
                  />
                }
              />
              <Route
                path="/my-tasks"
                element={
                  <ModulePlaceholderPage
                    moduleNumber={13}
                    moduleTitle="My Tasks & Action Queue"
                    description="Personalized task list for assigned inspections, reviews, and overdue items."
                  />
                }
              />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
