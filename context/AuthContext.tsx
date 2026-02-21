// ============================================================
// Axon — Auth Context
// Manages authentication state, session restore, and provides
// user/membership data to the entire app.
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  AuthUser,
  Membership,
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOut as apiSignOut,
  restoreSession,
  getStoredToken,
  getStoredUser,
  getStoredMemberships,
  clearAuthData,
  AuthApiError,
} from '@/services/authApi';

// ── Types ─────────────────────────────────────────────────

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  status: AuthStatus;
  user: AuthUser | null;
  memberships: Membership[];
  activeMembership: Membership | null;
  setActiveMembership: (m: Membership) => void;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, institutionId?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  status: 'loading',
  user: null,
  memberships: [],
  activeMembership: null,
  setActiveMembership: () => {},
  accessToken: null,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
});

// ── Provider ──────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeMembership, setActiveMembershipState] = useState<Membership | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // ── Restore session on mount ────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const token = getStoredToken();
      if (!token) {
        setStatus('unauthenticated');
        return;
      }

      // Optimistic: show stored data immediately
      const storedUser = getStoredUser();
      const storedMemberships = getStoredMemberships();
      if (storedUser) {
        setUser(storedUser);
        setMemberships(storedMemberships);
        setAccessToken(token);
        setActiveMembershipState(storedMemberships[0] || null);
      }

      try {
        const res = await restoreSession();
        if (cancelled) return;

        if (res.success && res.data) {
          setUser(res.data.user);
          setMemberships(res.data.memberships);
          setAccessToken(token);
          setActiveMembershipState(res.data.memberships[0] || null);
          setStatus('authenticated');
          console.log('[AuthContext] Session restored from server');
        } else {
          // Token expired or invalid
          clearAuthData();
          setUser(null);
          setMemberships([]);
          setAccessToken(null);
          setActiveMembershipState(null);
          setStatus('unauthenticated');
          console.log('[AuthContext] Session restore failed, clearing data');
        }
      } catch (err) {
        if (cancelled) return;
        // If server unreachable but we have stored data, use it
        if (storedUser) {
          setStatus('authenticated');
          console.warn('[AuthContext] Server unreachable, using cached session');
        } else {
          clearAuthData();
          setStatus('unauthenticated');
          console.error('[AuthContext] Session restore error:', err);
        }
      }
    }

    restore();
    return () => { cancelled = true; };
  }, []);

  // ── Sign In ─────────────────────────────────────────────
  const handleSignIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiSignIn(email, password);
      if (res.success && res.data) {
        setUser(res.data.user);
        setMemberships(res.data.memberships);
        setAccessToken(res.data.access_token);
        setActiveMembershipState(res.data.memberships[0] || null);
        setStatus('authenticated');
        return { success: true };
      }
      return { success: false, error: res.error?.message || 'Sign in failed' };
    } catch (err) {
      const msg = err instanceof AuthApiError ? err.message : 'Connection error';
      console.error('[AuthContext] Sign in error:', err);
      return { success: false, error: msg };
    }
  }, []);

  // ── Sign Up ─────────────────────────────────────────────
  const handleSignUp = useCallback(async (email: string, password: string, name: string, institutionId?: string) => {
    try {
      const res = await apiSignUp(email, password, name, institutionId);
      if (res.success && res.data) {
        setUser(res.data.user);
        setMemberships(res.data.memberships);
        setAccessToken(res.data.access_token);
        setActiveMembershipState(res.data.memberships[0] || null);
        setStatus('authenticated');
        return { success: true };
      }
      return { success: false, error: res.error?.message || 'Sign up failed' };
    } catch (err) {
      const msg = err instanceof AuthApiError ? err.message : 'Connection error';
      console.error('[AuthContext] Sign up error:', err);
      return { success: false, error: msg };
    }
  }, []);

  // ── Sign Out ────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    await apiSignOut();
    setUser(null);
    setMemberships([]);
    setAccessToken(null);
    setActiveMembershipState(null);
    setStatus('unauthenticated');
  }, []);

  // ── Set Active Membership ───────────────────────────────
  const setActiveMembership = useCallback((m: Membership) => {
    setActiveMembershipState(m);
    localStorage.setItem('axon_active_membership', JSON.stringify(m));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        memberships,
        activeMembership,
        setActiveMembership,
        accessToken,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
