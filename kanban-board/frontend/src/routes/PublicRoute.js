import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="full-screen-center">
        <Spinner size="large" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/workspaces" replace /> : <Outlet />;
}

export default PublicRoute;
