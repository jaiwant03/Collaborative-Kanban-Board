import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import WorkspacesPage from '../pages/WorkspacesPage';
import BoardPage from '../pages/BoardPage';
import DashboardPage from '../pages/DashboardPage';
import AcceptInvitePage from '../pages/AcceptInvitePage';
import NotFoundPage from '../pages/NotFoundPage';

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes — redirect to /workspaces if already logged in */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes — redirect to /login if not authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* Accept invitation — handles auth redirect internally */}
        <Route path="/invite/accept" element={<AcceptInvitePage />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/workspaces" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
