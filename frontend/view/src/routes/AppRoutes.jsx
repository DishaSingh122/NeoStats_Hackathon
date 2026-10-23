import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { RoleGuard } from './RoleGuard.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';

import { LoginPage } from '../pages/LoginPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { ProjectsPage } from '../pages/ProjectsPage.jsx';
import { ProjectDetailPage } from '../pages/ProjectDetailPage.jsx';
import { ProjectTasksPage } from '../pages/ProjectTasksPage.jsx';
import { ProjectTeamPage } from '../pages/ProjectTeamPage.jsx';
import { TaskDetailPage } from '../pages/TaskDetailPage.jsx';
import { UsersPage } from '../pages/UsersPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes within dashboard layout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:id/tasks" element={<ProjectTasksPage />} />
        <Route path="/projects/:id/team" element={<ProjectTeamPage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
        <Route
          path="/users"
          element={
            <RoleGuard roles={['admin']}>
              <UsersPage />
            </RoleGuard>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* 404 handler */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
