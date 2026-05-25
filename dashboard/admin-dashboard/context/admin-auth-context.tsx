"use client";

import * as React from "react";
import {
  adminLogin,
  adminLogout,
  clearAdminAuthConfig,
  configureAdminAuth,
  type AdminSession,
} from "@/lib/admin-api";

const STORAGE_ACCESS = "admin_access_token";
const STORAGE_REFRESH = "admin_refresh_token";
const STORAGE_ADMIN = "admin_profile";

type AdminAuthState = {
  admin: AdminSession | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
};

type AdminAuthContextValue = AdminAuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = React.createContext<AdminAuthContextValue | null>(
  null,
);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AdminAuthState>({
    admin: null,
    accessToken: null,
    refreshToken: null,
    hydrated: false,
  });

  const accessRef = React.useRef<string | null>(null);
  const refreshRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    accessRef.current = state.accessToken;
    refreshRef.current = state.refreshToken;
  }, [state.accessToken, state.refreshToken]);

  React.useEffect(() => {
    configureAdminAuth({
      getAccessToken: () => accessRef.current,
      getRefreshToken: () => refreshRef.current,
      setTokens: ({ accessToken, refreshToken }) => {
        accessRef.current = accessToken;
        refreshRef.current = refreshToken;
        localStorage.setItem(STORAGE_ACCESS, accessToken);
        localStorage.setItem(STORAGE_REFRESH, refreshToken);
        setState((s) => ({ ...s, accessToken, refreshToken }));
      },
    });
    return () => {
      clearAdminAuthConfig();
    };
  }, []);

  React.useEffect(() => {
    try {
      const accessToken = localStorage.getItem(STORAGE_ACCESS);
      const refreshToken = localStorage.getItem(STORAGE_REFRESH);
      const raw = localStorage.getItem(STORAGE_ADMIN);
      const admin = raw ? (JSON.parse(raw) as AdminSession) : null;
      accessRef.current = accessToken;
      refreshRef.current = refreshToken;
      setState({
        admin: accessToken ? admin : null,
        accessToken,
        refreshToken,
        hydrated: true,
      });
    } catch {
      setState((s) => ({ ...s, hydrated: true }));
    }
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const { admin, accessToken, refreshToken } = await adminLogin(
      email,
      password,
    );
    localStorage.setItem(STORAGE_ACCESS, accessToken);
    localStorage.setItem(STORAGE_REFRESH, refreshToken);
    localStorage.setItem(STORAGE_ADMIN, JSON.stringify(admin));
    accessRef.current = accessToken;
    refreshRef.current = refreshToken;
    setState({
      admin,
      accessToken,
      refreshToken,
      hydrated: true,
    });
  }, []);

  const logout = React.useCallback(async () => {
    let rt: string | null = null;
    if (typeof window !== "undefined") {
      rt = localStorage.getItem(STORAGE_REFRESH);
    }
    try {
      await adminLogout(rt);
    } catch {
      // ignore
    }
    localStorage.removeItem(STORAGE_ACCESS);
    localStorage.removeItem(STORAGE_REFRESH);
    localStorage.removeItem(STORAGE_ADMIN);
    accessRef.current = null;
    refreshRef.current = null;
    setState({
      admin: null,
      accessToken: null,
      refreshToken: null,
      hydrated: true,
    });
  }, []);

  const value = React.useMemo<AdminAuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
    }),
    [state, login, logout],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = React.useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}
