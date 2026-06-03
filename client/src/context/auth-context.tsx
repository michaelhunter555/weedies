"use client";
//
// AuthProvider - the single source of truth for "am I logged in?".
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
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "firebase/auth";

import { type UserObject } from "../../types";
import { auth as firebaseAuth } from "@/lib/firebase";
import { readBrowserLocalePreferences } from "@/utils/user-locale";

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
  const raw = process.env.NEXT_PUBLIC_API_KEY?.trim() || "";
  if (!raw) {
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:5001/api";
    }
    return "";
  }
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
    accountStanding:
      backendUser?.accountStanding === "suspended" ||
      backendUser?.accountStanding === "banned"
        ? backendUser.accountStanding
        : "good",
    authProvider: backendUser?.authProvider,
    emailVerified: backendUser?.emailVerified === true,
    firebaseUid: backendUser?.firebaseUid ?? null,
    googleSub: backendUser?.googleSub ?? null,
    totalListings: backendUser?.totalListings,
    totalSales: backendUser?.totalSales,
    totalReviews: backendUser?.totalReviews,
    rewardPoints: backendUser?.rewardPoints,
  stripeCustomerId: backendUser?.stripeCustomerId ?? undefined,
  stripeConnectAccountId:
    backendUser?.stripeConnectAccountId ?? backendUser?.stripeAccountId ?? undefined,
  /** Stripe Connect Express account id (same as `stripeConnectAccountId`). */
  stripeAccountId:
    backendUser?.stripeAccountId ?? backendUser?.stripeConnectAccountId ?? undefined,
  outstandingBalance: backendUser?.outstandingBalance,
    defaultPaymentIntendId: backendUser?.defaultPaymentIntendId ?? undefined,
    stripeDefaultPaymentMethodId:
      backendUser?.stripeDefaultPaymentMethodId ??
      backendUser?.defaultPaymentIntendId ??
      undefined,
    isVerifiedCreator: backendUser?.isVerifiedCreator,
    hasVerifiedAnalytics: backendUser?.hasVerifiedAnalytics,
    isOnboarded: backendUser?.isOnboarded ?? backendUser?.isOboarded ?? false,
    lastLoginDate: backendUser?.lastLoginDate ?? null,
    timezone: backendUser?.timezone ?? null,
    locale: backendUser?.locale ?? null,
    createdAt: backendUser?.createdAt,
    updatedAt: backendUser?.updatedAt,
  };
}

export type AuthContextProps = {
  hydrated: boolean;
  /** True after the one-shot refresh + `/user/me` sync on mount (avoids stale LS profile). */
  sessionReady: boolean;
  isLoggedIn: boolean;
  user: UserObject | null;
  accessToken: string | null;
  loginWithProviderToken: (
    provider: AuthProviderType,
    idToken: string
  ) => Promise<{ isNewUser: boolean; user: UserObject }>;
  signupWithProviderToken: (
    provider: AuthProviderType,
    idToken: string
  ) => Promise<{ isNewUser: boolean; user: UserObject }>;
  /** OAuth redirect: exchange `code` from `/callback/google` (server uses client secret). */
  completeGoogleOAuthRedirect: (
    code: string,
    redirectUri: string,
    intent: "login" | "signup",
  ) => Promise<{ user: UserObject }>;
  refreshSession: () => Promise<void>;
  /** Reload profile from `/user/me` (syncs Stripe Connect onboarding flags). */
  syncUserFromServer: () => Promise<UserObject | null>;
  logout: () => Promise<void>;
  update: (user: UserObject) => void;
};

export const AuthContext = createContext<AuthContextProps>({
  hydrated: false,
  sessionReady: false,
  isLoggedIn: false,
  user: null,
  accessToken: null,
  loginWithProviderToken: async () => ({
    isNewUser: false,
    user: { id: "", email: "" },
  }),
  signupWithProviderToken: async () => ({
    isNewUser: false,
    user: { id: "", email: "" },
  }),
  completeGoogleOAuthRedirect: async () => ({
    user: { id: "", email: "" },
  }),
  refreshSession: async () => {},
  syncUserFromServer: async () => null,
  logout: async () => {},
  update: () => {},
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(
    authReducer,
    undefined,
    readFromStorage
  );
  const [sessionReady, setSessionReady] = useState(false);
  const queryClient = useQueryClient();

  const apiBase = useMemo(() => getApiBase(), []);

  const exchangeProviderToken = useCallback(
    async (
      path: "login" | "sign-up",
      provider: AuthProviderType,
      idToken: string
    ): Promise<{ isNewUser: boolean; user: UserObject }> => {
      if (!apiBase) throw new Error("Missing NEXT_PUBLIC_SERVER");

      const localePrefs = readBrowserLocalePreferences();
      const resp = await fetch(`${apiBase}/user/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider,
          idToken,
          ...(localePrefs ?? {}),
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const err = new Error(
          (data?.message as string) || `${path} failed`,
        ) as Error & { code?: string; status?: number };
        err.code = data?.code as string | undefined;
        err.status = resp.status;
        throw err;
      }

      const accessToken =
        (data?.accessToken as string | undefined) || null;
      const refreshToken =
        (data?.refreshToken as string | undefined) || null;
      const user = normalizeUser(data?.user);

      dispatch({ type: "LOGIN", user, accessToken });
      writeToStorage(user, accessToken, refreshToken);
      setSessionReady(true);

      return { isNewUser: Boolean(data?.isNewUser), user };
    },
    [apiBase]
  );

  const loginWithProviderToken = useCallback(
    async (provider: AuthProviderType, idToken: string) => {
      return exchangeProviderToken("login", provider, idToken);
    },
    [exchangeProviderToken]
  );

  const signupWithProviderToken = useCallback(
    (provider: AuthProviderType, idToken: string) =>
      exchangeProviderToken("sign-up", provider, idToken),
    [exchangeProviderToken]
  );

  const completeGoogleOAuthRedirect = useCallback(
    async (
      code: string,
      redirectUri: string,
      intent: "login" | "signup",
    ): Promise<{ user: UserObject }> => {
      if (!apiBase) throw new Error("Missing NEXT_PUBLIC_SERVER");

      const localePrefs = readBrowserLocalePreferences();
      const post = async (mode: "login" | "signup") => {
        const resp = await fetch(`${apiBase}/user/google-auth/callback`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            code,
            redirectUri,
            intent: mode,
            ...localePrefs,
          }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          const err = new Error(
            (data?.message as string) || "Google sign-in failed",
          ) as Error & { code?: string; status?: number };
          err.code = data?.code as string | undefined;
          err.status = resp.status;
          throw err;
        }
        const accessToken = (data?.accessToken as string | undefined) || null;
        const refreshToken =
          (data?.refreshToken as string | undefined) || null;
        const user = normalizeUser(data?.user);
        if (!user || !accessToken) {
          throw new Error("Google sign-in returned an incomplete session");
        }
        dispatch({ type: "LOGIN", user, accessToken });
        writeToStorage(user, accessToken, refreshToken);
        setSessionReady(true);
        return { user };
      };

      try {
        return await post(intent);
      } catch (err: unknown) {
        const code =
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code?: string }).code === "ACCOUNT_EXISTS";
        const status =
          err &&
          typeof err === "object" &&
          "status" in err &&
          (err as { status?: number }).status === 409;
        if (intent === "signup" && (code || status)) {
          return post("login");
        }
        throw err;
      }
    },
    [apiBase],
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

  const syncUserFromServer = useCallback(async (): Promise<UserObject | null> => {
    if (!apiBase) return null;
    let token: string | null = null;
    try {
      token = localStorage.getItem(LS_ACCESS_KEY);
    } catch {
      return null;
    }
    if (!token) return null;
    const resp = await fetch(`${apiBase}/user/me`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
    });
    if (!resp.ok) return null;
    const data = await resp.json().catch(() => ({}));
    const next = normalizeUser(data?.user);
    if (!next?.id) return null;
    dispatch({ type: "SET_USER", user: next });
    try {
      const at = localStorage.getItem(LS_ACCESS_KEY);
      if (at) writeToStorage(next, at);
    } catch {
      // ignore
    }
    return next;
  }, [apiBase]);

  const logout = useCallback(async () => {
    try {
      if (apiBase) {
        const storedRefresh = readStoredRefreshToken();
        await fetch(`${apiBase}/user/logout`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            storedRefresh ? { refreshToken: storedRefresh } : {},
          ),
        });
      }
    } catch {
      // Still clear local session if the API call fails.
    } finally {
      try {
        await signOut(firebaseAuth);
      } catch {
        // ignore Firebase sign-out errors
      }
      queryClient.clear();
      dispatch({ type: "LOGOUT" });
      writeToStorage(null, null);
      setSessionReady(false);
    }
  }, [apiBase, queryClient]);

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
    void refreshSession()
      .then(() => syncUserFromServer())
      .catch(() => undefined)
      .finally(() => setSessionReady(true));
  }, [refreshSession, syncUserFromServer]);

  const value = useMemo<AuthContextProps>(
    () => ({
      hydrated: state.hydrated,
      sessionReady,
      isLoggedIn: state.isLoggedIn,
      user: state.user,
      accessToken: state.accessToken,
      loginWithProviderToken,
      signupWithProviderToken,
      completeGoogleOAuthRedirect,
      refreshSession,
      syncUserFromServer,
      logout,
      update,
    }),
    [
      state.hydrated,
      sessionReady,
      state.isLoggedIn,
      state.user,
      state.accessToken,
      loginWithProviderToken,
      signupWithProviderToken,
      completeGoogleOAuthRedirect,
      refreshSession,
      syncUserFromServer,
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
