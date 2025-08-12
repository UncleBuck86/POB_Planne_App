import { useAuth } from '../auth/AuthContext';
import type { Role } from '../auth/roles';

export function useRole(): { role: Role | null; effectiveRole: Role | null } {
  const { state } = useAuth();
  return { role: state.role, effectiveRole: state.effectiveRole };
}
