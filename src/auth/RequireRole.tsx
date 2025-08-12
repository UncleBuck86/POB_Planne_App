import React from 'react';
import type { Role } from './roles';
import { useAuth } from './AuthContext';
import { hasAtLeast } from './roles';

export const RequireRole: React.FC<{ roles: Role[]; children: React.ReactNode }>
  = ({ roles, children }) => {
  const { state } = useAuth();
  if (!state.isAuthenticated || !state.effectiveRole) return null;
  const ok = roles.some(r => hasAtLeast(state.effectiveRole!, r));
  return ok ? <>{children}</> : null;
};
