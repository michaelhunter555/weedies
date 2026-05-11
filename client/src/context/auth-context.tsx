"use client";
//
// AuthProvider — the single source of truth for "am I logged in?".
//
// Design rules:
// 1. Hydrate from localStorage synchronously in useReducer's lazy init so
//    we never need a hydration useEffect. This removes the class of bugs
//    where dispatching HYDRATE changed the identity of other useCallbacks
//    and retriggered effects in a loop.
// 2. All callbacks returned via context are stable (no reactive deps on
//    state.user / state.token). Consumers can list them in useEffect deps
//    without causing re-runs.
// 3. One useEffect, guarded with a ref, attempts a background refresh
//    exactly once per mount even under React StrictMode.
//
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import { type UserObject } from "../../types";

type AuthProviderType = "firebase" | "google";

type AuthState = {
  hydrated: boolean;
  isLoggedIn: boolean;
  user: UserObject | null;
  accessToken: string | null;
};

type AuthAction =
  | { type: "HYDRATE"; user: UserObject | null; accessToken: string | null }
  | { type: "LOGIN"; user: UserObject; accessToken: string | null }
  | { type: "LOGOUT" }
  | { type: "SET_TOKEN"; accessToken: string | null }
  | { type: "SET_USER"; user: UserObject };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "HYDRATE":
      return {
        hydrated: true,
        isLoggedIn: !!action.accessToken && !!action.user,
        user: action.user,
        accessToken: action.accessToken,
      };
    case "LOGIN":
      return {
        hydrated: true,
        isLoggedIn: true,
        user: action.user,
        accessToken: action.accessToken,
      };
    case "LOGOUT":
      return {
        hydrated: true,
        isLoggedIn: false,
        user: null,
        accessToken: null,
      };
    case "SET_TOKEN":
      return { ...state, accessToken: action.accessToken };
    case "SET_USER":
      return { ...state, user: action.user };
    default:
      return state;
  }
}

const LS_USER_KEY = "weedies.user";
const LS_ACCESS_KEY = "weedies.accessToken";
const LS_REFRESH_KEY = "weedies.refreshToken";

function readFromStorage(): AuthState {
  if (typeof window === "undefined") {
    return { hydrated: false, isLoggedIn: false, user: null, accessToken: null };
  }
  try {
    const rawUser = localStorage.getItem(LS_USER_KEY);
    const rawToken = localStorage.getItem(LS_ACCESS_KEY);
    const user = rawUser ? (JSON.parse(rawUser) as UserObject) : null;
    const accessToken = rawToken || null;
    return {
      hydrated: true,
      isLoggedIn: !!user && !!accessToken,
      user,
      accessToken,
    };
  } catch {
    return { hydrated: true, isLoggedIn: false, user: null, accessToken: null };
  }
}

function writeToStorage(
  user: UserObject | null,
  accessToken: string | null,
  refreshToken?: string | null,
) {
  try {
    if (!user || !accessToken) {
      localStorage.removeItem(LS_USER_KEY);
      localStorage.removeItem(LS_ACCESS_KEY);
      localStorage.removeItem(LS_REFRESH_KEY);
      return;
    }
    localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
    localStorage.setItem(LS_ACCESS_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(LS_REFRESH_KEY, refreshToken);
    }
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

/**
 * Read the refresh token from localStorage. Used as a fallback for environments
 * where the httpOnly refresh cookie didn't get set (3rd-party cookie blocking,
 * cross-site dev setups, etc.).
 */
export function readStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LS_REFRESH_KEY);
  } catch {
    return null;
  }
}

/** Build the API base URL ({NEXT_PUBLIC_API_KEY} + /api). Exported so the
 *  api-fetch hook reuses the same logic. */
export function buildApiBase() {
  const raw = process.env.NEXT_PUBLIC_API_KEY || "";
  if (!raw) return "";
  if (raw.endsWith("/api")) return raw;
  if (raw.endsWith("/api/")) return raw.slice(0, -1);
  return `${raw}/api`;
}

function getApiBase() {
  return buildApiBase();
}

function normalizeUser(backendUser: any): UserObject {
  return {
    id: String(backendUser?.id || backendUser?._id || ""),
    email: String(backendUser?.email || ""),
    name: backendUser?.name,
    userName: backendUser?.name,
    role: backendUser?.role,
    authProvider: backendUser?.authProvider,
    firebaseUid: backendUser?.firebaseUid ?? null,
    googleSub: backendUser?.googleSub ?? null,
    totalListings: backendUser?.totalListings,
    totalSales: backendUser?.totalSales,
    totalReviews: backendUser?.totalReviews,
    rewardPoints: backendUser?.rewardPoints,
    stripeCustomerId: backendUser?.stripeCustomerId ?? undefined,
    stripeConnectAccountId: backendUser?.stripeConnectAccountId ?? undefined,
    outstandingBalance: backendUser?.outstandingBalance,
    isVerifiedCreator: backendUser?.isVerifiedCreator,
    hasVerifiedAnalytics: backendUser?.hasVerifiedAnalytics,
    isOnboarded: backendUser?.isOnboarded ?? backendUser?.isOboarded ?? false,
    lastLoginDate: backendUser?.lastLoginDate ?? null,
    createdAt: backendUser?.createdAt,
    updatedAt: backendUser?.updatedAt,
  };
}

export type AuthContextProps = {
  hydrated: boolean;
  isLoggedIn: boolean;
  user: UserObject | null;
  accessToken: string | null;
  loginWithProviderToken: (
    provider: AuthProviderType,
    idToken: string
  ) => Promise<void>;
  signupWithProviderToken: (
    provider: AuthProviderType,
    idToken: string
  ) => Promise<{ isNewUser: boolean }>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  update: (user: UserObject) => void;
};

export const AuthContext = createContext<AuthContextProps>({
  hydrated: false,
  isLoggedIn: false,
  user: null,
  accessToken: null,
  loginWithProviderToken: async () => {},
  signupWithProviderToken: async () => ({ isNewUser: false }),
  refreshSession: async () => {},
  logout: async () => {},
  update: () => {},
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(
    authReducer,
    undefined,
    readFromStorage
  );

  const apiBase = useMemo(() => getApiBase(), []);

  const exchangeProviderToken = useCallback(
    async (
      path: "login" | "sign-up",
      provider: AuthProviderType,
      idToken: string
    ): Promise<{ isNewUser: boolean }> => {
      if (!apiBase) throw new Error("Missing NEXT_PUBLIC_SERVER");

      const resp = await fetch(`${apiBase}/user/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, idToken }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || `${path} failed`);

      const accessToken =
        (data?.accessToken as string | undefined) || null;
      const refreshToken =
        (data?.refreshToken as string | undefined) || null;
      const user = normalizeUser(data?.user);

      dispatch({ type: "LOGIN", user, accessToken });
      writeToStorage(user, accessToken, refreshToken);

      return { isNewUser: Boolean(data?.isNewUser) };
    },
    [apiBase]
  );

  const loginWithProviderToken = useCallback(
    async (provider: AuthProviderType, idToken: string) => {
      await exchangeProviderToken("login", provider, idToken);
    },
    [exchangeProviderToken]
  );

  const signupWithProviderToken = useCallback(
    (provider: AuthProviderType, idToken: string) =>
      exchangeProviderToken("sign-up", provider, idToken),
    [exchangeProviderToken]
  );

  const refreshSession = useCallback(async () => {
    if (!apiBase) return;
    // Prefer the httpOnly cookie (sent automatically with credentials: include),
    // but also send the stored refresh token in the body so flows that lost
    // the cookie (3rd-party cookie blocking, cross-site dev) still recover.
    const stored = readStoredRefreshToken();
    const resp = await fetch(`${apiBase}/user/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(stored ? { refreshToken: stored } : {}),
    });
    if (!resp.ok) throw new Error("Refresh failed");
    const data = await resp.json().catch(() => ({}));
    const accessToken = (data?.accessToken as string | undefined) || null;
    const newRefresh = (data?.refreshToken as string | undefined) || null;
    dispatch({ type: "SET_TOKEN", accessToken });
    try {
      if (accessToken) localStorage.setItem(LS_ACCESS_KEY, accessToken);
      if (newRefresh) localStorage.setItem(LS_REFRESH_KEY, newRefresh);
    } catch {
      // ignore
    }
  }, [apiBase]);

  const logout = useCallback(async () => {
    try {
      if (apiBase) {
        await fetch(`${apiBase}/user/logout`, {
          method: "POST",
          credentials: "include",
        });
      }
    } finally {
      dispatch({ type: "LOGOUT" });
      writeToStorage(null, null);
    }
  }, [apiBase]);

  const update = useCallback((user: UserObject) => {
    dispatch({ type: "SET_USER", user });
    try {
      localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }, []);

  // One-shot background refresh. Guarded by a ref so StrictMode double-mounts
  // don't fire it twice. refreshSession's identity is stable (only depends
  // on apiBase) so this effect's deps are effectively constant.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    refreshSession().catch(() => undefined);
  }, [refreshSession]);

  const value = useMemo<AuthContextProps>(
    () => ({
      hydrated: state.hydrated,
      isLoggedIn: state.isLoggedIn,
      user: state.user,
      accessToken: state.accessToken,
      loginWithProviderToken,
      signupWithProviderToken,
      refreshSession,
      logout,
      update,
    }),
    [
      state.hydrated,
      state.isLoggedIn,
      state.user,
      state.accessToken,
      loginWithProviderToken,
      signupWithProviderToken,
      refreshSession,
      logout,
      update,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;

export const useAuth = () => useContext(AuthContext);
