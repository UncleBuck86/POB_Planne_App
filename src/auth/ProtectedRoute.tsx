import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from './roles';
import { useAuth } from './AuthContext';
import { hasAtLeast as roleAtLeast } from './roles';

export const ProtectedRoute: React.FC<{ requiredRoles?: Role[] }>
  = ({ requiredRoles }) => {
  const { state } = useAuth();
  if (!state.isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRoles && requiredRoles.length) {
    const ok = requiredRoles.some(r => state.effectiveRole && roleAtLeast(state.effectiveRole, r));
    if (!ok) return <Navigate to="/access-denied" replace />;
  }
  return <Outlet />;
};
