import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Role } from './roles';
import { ROLES, hasAtLeast } from './roles';
import { mockUsers } from './mockUsers';
import { storageKeys, storageUtil, type StoredAuth } from '../utils/storage';

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

export type AuthState = {
  isAuthenticated: boolean;
  username: string | null;
  role: Role | null;
  effectiveRole: Role | null;
  token: string | null;
  lastActivity: number | null;
};

type Action =
  | { type: 'LOGIN'; payload: { username: string; role: Role; token: string; effectiveRole: Role } }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH' }
  | { type: 'SET_ROLE_OVERRIDE'; payload: { effectiveRole: Role } };

const initialState: AuthState = {
  isAuthenticated: false,
  username: null,
  role: null,
  effectiveRole: null,
  token: null,
  lastActivity: null,
};

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'LOGIN': {
      return {
        isAuthenticated: true,
        username: action.payload.username,
        role: action.payload.role,
        effectiveRole: action.payload.effectiveRole,
        token: action.payload.token,
        lastActivity: Date.now(),
      };
    }
    case 'LOGOUT':
      return initialState;
    case 'REFRESH':
      return { ...state, lastActivity: Date.now() };
    case 'SET_ROLE_OVERRIDE':
      return { ...state, effectiveRole: action.payload.effectiveRole };
    default:
      return state;
  }
}

const AuthCtx = createContext<{
  state: AuthState;
  login: (username: string, password: string, remember: boolean) => Promise<boolean>;
  logout: () => void;
  setRoleOverride: (role: Role) => void;
  hasAtLeast: (required: Role) => boolean;
}>({ state: initialState, login: async () => false, logout: () => {}, setRoleOverride: () => {}, hasAtLeast: () => false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from storage on mount
  useEffect(() => {
    const stored = storageUtil.get<StoredAuth>(storageKeys.auth);
    if (stored && stored.username && stored.role && stored.token) {
      // Idle timeout
      if (Date.now() - (stored.lastActivity || 0) > EIGHT_HOURS) {
        storageUtil.remove(storageKeys.auth);
        return;
      }
      const testing = import.meta.env.VITE_TESTING_MODE === 'true';
      const effectiveRole = (testing ? 'Admin' : stored.effectiveRole || stored.role) as Role;
      dispatch({ type: 'LOGIN', payload: { username: stored.username, role: stored.role as Role, token: stored.token, effectiveRole } });
    }
  }, []);

  // Persist on change
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const toSave: StoredAuth = {
      token: state.token!,
      username: state.username!,
      role: state.role!,
      effectiveRole: state.effectiveRole!,
      lastActivity: state.lastActivity || Date.now(),
    };
    storageUtil.set(storageKeys.auth, toSave);
  }, [state]);

  // Idle timeout listeners
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const bump = () => dispatch({ type: 'REFRESH' });
    const events = ['click', 'keydown', 'mousemove', 'scroll', 'focus'];
    events.forEach(ev => window.addEventListener(ev, bump));
    return () => { events.forEach(ev => window.removeEventListener(ev, bump)); };
  }, [state.isAuthenticated]);

  const login = useCallback(async (username: string, password: string, remember: boolean) => {
    if (!username || !password) return false;
    const user = mockUsers.find(u => u.username === username && u.password === password);
    if (!user) return false;
    const token = Math.random().toString(36).slice(2);
    const testing = import.meta.env.VITE_TESTING_MODE === 'true';
    const effectiveRole = (testing ? 'Admin' : user.role) as Role;
    dispatch({ type: 'LOGIN', payload: { username: user.username, role: user.role, token, effectiveRole } });
    if (!remember) {
      // For non-remember session, avoid persisting across reloads (we still store for idle tracking)
    }
    return true;
  }, []);

  const logout = useCallback(() => {
    storageUtil.remove(storageKeys.auth);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const setRoleOverride = useCallback((role: Role) => {
    dispatch({ type: 'SET_ROLE_OVERRIDE', payload: { effectiveRole: role } });
  }, []);

  const value = useMemo(() => ({
    state,
    login,
    logout,
    setRoleOverride,
    hasAtLeast: (required: Role) => state.effectiveRole ? hasAtLeast(state.effectiveRole, required) : false,
  }), [state, login, logout, setRoleOverride]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export function useAuth() {
  return useContext(AuthCtx);
}
