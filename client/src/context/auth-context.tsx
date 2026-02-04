"use client";
import { createContext, useCallback, useEffect, useMemo, useReducer, useContext } from "react";

import { type UserObject } from "../../types";
import { authReducer } from "./auth-reducer";

type AuthProviderType = "firebase" | "google";

export type AuthContextProps = {
  isLoggedIn: boolean;
  hydrated: boolean;
  user: UserObject | null;
  accessToken: string | null;
  /**
   * Backwards-compatible setter for existing UI code.
   * Prefer `loginWithProviderToken` for Firebase/Google flows.
   */
  login: (user: UserObject, accessToken: string | null) => void;
  /**
   * Exchange a Firebase/Google ID token for backend JWTs (access + refresh cookie).
   * This is the “sync point” between Firebase auth and your backend.
   */
  loginWithProviderToken: (provider: AuthProviderType, idToken: string) => Promise<void>;
  /**
   * Uses backend refresh endpoint (expects refresh token cookie).
   */
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  update: (user: UserObject) => void;
};

export const AuthContext = createContext<AuthContextProps>({
  isLoggedIn: false,
  hydrated: false,
  user: null,
  accessToken: null,
  login: () => {},
  loginWithProviderToken: async () => {},
  refreshSession: async () => {},
  logout: async () => {},
  update: (user: UserObject) => {},
});

const LS_USER_KEY = "weedies.user";
const LS_ACCESS_KEY = "weedies.accessToken";

function getApiBase() {
  const raw = process.env.NEXT_PUBLIC_API_KEY || "";
  if (!raw) return "";
  // If caller set NEXT_PUBLIC_SERVER="http://localhost:5001/api", keep it.
  if (raw.endsWith("/api")) return raw;
  if (raw.endsWith("/api/")) return raw.slice(0, -1);
  return `${raw}/api`;
}

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isLoggedIn: false,
    user: null,
    token: null,
    hydrated: false,
  });

  const apiBase = useMemo(() => getApiBase(), []);

  const updateUser = (user: UserObject) => {
    dispatch({
      type: "UPDATE",
      isLoggedIn: state.isLoggedIn,
      user: {
        ...user,
      },
      token: state.token,
    });
  };

  const persist = useCallback((user: UserObject | null, accessToken: string | null) => {
    try {
      if (!user || !accessToken) {
        localStorage.removeItem(LS_USER_KEY);
        localStorage.removeItem(LS_ACCESS_KEY);
        return;
      }
      localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
      localStorage.setItem(LS_ACCESS_KEY, accessToken);
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback(
    (user: UserObject, accessToken: string | null) => {
      dispatch({ type: "LOGIN", user, token: accessToken });
      persist(user, accessToken);
    },
    [persist]
  );

  const hydrateFromStorage = useCallback(() => {
    try {
      const rawUser = localStorage.getItem(LS_USER_KEY);
      const rawToken = localStorage.getItem(LS_ACCESS_KEY);
      const user = rawUser ? (JSON.parse(rawUser) as UserObject) : null;
      const token = rawToken || null;
      dispatch({ type: "HYDRATE", user, token });
    } catch {
      dispatch({ type: "HYDRATE", user: null, token: null });
    }
  }, []);

  const loginWithProviderToken = useCallback(
    async (provider: AuthProviderType, idToken: string) => {
      if (!apiBase) throw new Error("Missing NEXT_PUBLIC_SERVER");

      const resp = await fetch(`${apiBase}/user/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, idToken }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || "Login failed");

      const backendUser = data?.user as any;
      const accessToken = (data?.accessToken as string | undefined) || null;

      const user: UserObject = {
        id: String(backendUser?.id || backendUser?._id || ""),
        email: String(backendUser?.email || ""),
        name: backendUser?.name,
        userName: backendUser?.name, // backwards compatibility with older UI
        role: backendUser?.role,
        authProvider: backendUser?.authProvider,
      };

      dispatch({ type: "LOGIN", user, token: accessToken });
      persist(user, accessToken);
    },
    [apiBase, persist]
  );

  const refreshSession = useCallback(async () => {
    if (!apiBase) return;
    const resp = await fetch(`${apiBase}/user/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
    });
    if (!resp.ok) throw new Error("Refresh failed");
    const data = await resp.json();
    const accessToken = (data?.accessToken as string | undefined) || null;
    dispatch({ type: "UPDATE", token: accessToken });
    persist(state.user, accessToken);
  }, [apiBase, persist, state.user]);

  const logout = useCallback(async () => {
    try {
      if (apiBase) {
        await fetch(`${apiBase}/user/logout`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
        });
      }
    } finally {
      dispatch({ type: "LOGOUT" });
      persist(null, null);
    }
  }, [apiBase, persist]);

  // initial load: hydrate from localStorage, then attempt refresh via cookie (best practice)
  useEffect(() => {
    hydrateFromStorage();
    // Attempt refresh in background; if cookie exists, we get a fresh access token.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    refreshSession().catch(() => undefined);
  }, [hydrateFromStorage, refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: state.isLoggedIn,
        hydrated: state.hydrated,
        user: state.user,
        accessToken: state.token,
        login,
        loginWithProviderToken,
        refreshSession,
        logout,
        update: updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

export const useAuth = () => useContext(AuthContext);
