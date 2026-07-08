import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  apiChildLogin,
  apiCompleteOnboarding,
  apiCreateCheckoutSession,
  apiCreatePortalSession,
  apiGetMe,
  apiLogin,
  apiLogout,
  apiRegister,
  apiUpdateMe,
  clearToken,
  getToken,
  setToken,
} from "@/lib/apiClient";
import {
  clearPendingLocalPassword,
  setPendingLocalPassword,
  syncLocalAccountToServer,
} from "@/lib/localAccountSync";

export interface User {
  id: string;
  name: string;
  email: string | null;
  role: "parent" | "child";
  isPremium: boolean;
  createdAt: string;
  hasCompletedOnboarding: boolean;
  familyId: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  childLogin: (childId: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  startCheckout: (plan: "monthly" | "annual") => Promise<void>;
  manageSubscription: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (partial: Partial<Pick<User, "name" | "email">>) => Promise<void>;
  canReturnToParent: boolean;
  returnToParent: () => Promise<void>;
}

const LOCAL_USER_KEY = "@dv_local_user";
const PARENT_KEY = "@dv_parent_auth";
const PARENT_TOKEN_KEY = "@dv_parent_token";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [canReturnToParent, setCanReturnToParent] = useState(false);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // Check if we have a valid server token first
      const token = await getToken();
      if (token) {
        try {
          const { user } = await apiGetMe();
          setState({ user: apiUserToUser(user), isLoading: false, isAuthenticated: true });
          setCanReturnToParent(user.role === "child" && !!(await AsyncStorage.getItem(PARENT_TOKEN_KEY)));
          return;
        } catch {
          // Token is expired/invalid — clear it and fall through to local check
          await clearToken();
        }
      }
      // Fall back to local-only user (created offline)
      const localRaw = await AsyncStorage.getItem(LOCAL_USER_KEY);
      if (localRaw) {
        const user: User = JSON.parse(localRaw);
        setState({ user, isLoading: false, isAuthenticated: true });
        trySyncLocalAccount();
        return;
      }
    } catch {
      // ignore
    }
    setState({ user: null, isLoading: false, isAuthenticated: false });
  };

  // Retries pushing a local-only account to the server in the background so
  // the user ends up on a real, restart-proof account without noticing.
  const trySyncLocalAccount = useCallback(async () => {
    const localRaw = await AsyncStorage.getItem(LOCAL_USER_KEY);
    if (!localRaw) return;
    const localUser: User = JSON.parse(localRaw);
    if (!localUser.id.startsWith("local_")) return;

    const synced = await syncLocalAccountToServer(localUser);
    if (!synced) return;

    await AsyncStorage.removeItem(LOCAL_USER_KEY);
    const updated = apiUserToUser(synced);
    // Re-apply state the user changed while offline that a fresh server
    // registration wouldn't know about.
    if (localUser.hasCompletedOnboarding && !updated.hasCompletedOnboarding) {
      try {
        const { user } = await apiCompleteOnboarding();
        Object.assign(updated, apiUserToUser(user));
      } catch {
        // best-effort
      }
    }
    setState({ user: updated, isLoading: false, isAuthenticated: true });
  }, []);

  // Retry whenever the app comes back to the foreground — covers the case
  // where connectivity returns while the app is already open.
  useEffect(() => {
    const sub = AppState.addEventListener("change", next => {
      if (next === "active") trySyncLocalAccount();
    });
    return () => sub.remove();
  }, [trySyncLocalAccount]);

  // Maps the API response shape to our internal User shape
  function apiUserToUser(u: {
    id: string;
    email: string | null;
    name: string;
    role: string;
    isPremium: boolean;
    familyId: string;
    hasCompletedOnboarding: boolean;
    createdAt: string;
  }): User {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as "parent" | "child",
      isPremium: u.isPremium,
      createdAt: u.createdAt,
      hasCompletedOnboarding: u.hasCompletedOnboarding,
      familyId: u.familyId,
    };
  }

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { token, user } = await apiLogin(email, password);
      await setToken(token);
      // Clear any stale local-only user so it doesn't shadow the server user
      await AsyncStorage.removeItem(LOCAL_USER_KEY);
      setState({ user: apiUserToUser(user), isLoading: false, isAuthenticated: true });
    } catch (err: any) {
      // If the server is unreachable, try local fallback
      if (isNetworkError(err)) {
        await localLoginFallback(email, password);
        return;
      }
      throw err;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const { token, user } = await apiRegister(name, email, password);
      await setToken(token);
      await AsyncStorage.removeItem(LOCAL_USER_KEY);
      setState({ user: apiUserToUser(user), isLoading: false, isAuthenticated: true });
    } catch (err: any) {
      // If the server is unreachable, create a local-only account
      if (isNetworkError(err)) {
        await localRegisterFallback(name, email, password);
        return;
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    await clearToken();
    await AsyncStorage.removeItem(LOCAL_USER_KEY);
    await AsyncStorage.removeItem(PARENT_TOKEN_KEY);
    await AsyncStorage.removeItem(PARENT_KEY);
    await clearPendingLocalPassword();
    setCanReturnToParent(false);
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!state.user) return;
    try {
      const { user } = await apiCompleteOnboarding();
      const updated = apiUserToUser(user);
      setState(s => ({ ...s, user: updated }));
    } catch {
      // Optimistic local update if server unreachable
      const updated: User = { ...state.user, hasCompletedOnboarding: true };
      await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
      setState(s => ({ ...s, user: updated }));
    }
  }, [state.user]);

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await apiGetMe();
      setState(s => ({ ...s, user: apiUserToUser(user) }));
    } catch {
      // best-effort
    }
  }, []);

  // Opens Stripe Checkout in a browser session. Tier flips to premium
  // asynchronously via the billing webhook, not synchronously here — the
  // caller should refresh the user (e.g. via refreshUser) after this resolves.
  const startCheckout = useCallback(async (plan: "monthly" | "annual") => {
    if (!state.user) return;
    const { url } = await apiCreateCheckoutSession(plan);
    const redirectUrl = Linking.createURL("subscription/success");
    await WebBrowser.openAuthSessionAsync(url, redirectUrl);
    await refreshUser();
  }, [state.user, refreshUser]);

  const manageSubscription = useCallback(async () => {
    if (!state.user) return;
    const { url } = await apiCreatePortalSession();
    const redirectUrl = Linking.createURL("profile");
    await WebBrowser.openAuthSessionAsync(url, redirectUrl);
    await refreshUser();
  }, [state.user, refreshUser]);

  const updateProfile = useCallback(async (partial: Partial<Pick<User, "name" | "email">>) => {
    if (!state.user) return;
    try {
      const { user } = await apiUpdateMe(partial);
      setState(s => ({ ...s, user: apiUserToUser(user) }));
    } catch {
      const updated: User = { ...state.user, ...partial };
      setState(s => ({ ...s, user: updated }));
    }
  }, [state.user]);

  // Logs a child into their own scoped session. If a parent is currently
  // signed in, stashes the parent's token/user so returnToParent can swap
  // back without a fresh login.
  const childLogin = useCallback(async (childId: string, pin: string) => {
    if (state.user?.role === "parent") {
      const parentToken = await getToken();
      if (parentToken) {
        await AsyncStorage.setItem(PARENT_TOKEN_KEY, parentToken);
        await AsyncStorage.setItem(PARENT_KEY, JSON.stringify(state.user));
      }
    }
    const { token, user } = await apiChildLogin(childId, pin);
    await setToken(token);
    await AsyncStorage.removeItem(LOCAL_USER_KEY);
    setState({ user: apiUserToUser(user), isLoading: false, isAuthenticated: true });
    setCanReturnToParent(!!(await AsyncStorage.getItem(PARENT_TOKEN_KEY)));
  }, [state.user]);

  const returnToParent = useCallback(async () => {
    const parentToken = await AsyncStorage.getItem(PARENT_TOKEN_KEY);
    const parentRaw = await AsyncStorage.getItem(PARENT_KEY);
    if (!parentToken || !parentRaw) return;
    await setToken(parentToken);
    await AsyncStorage.removeItem(PARENT_TOKEN_KEY);
    await AsyncStorage.removeItem(PARENT_KEY);
    const parent: User = JSON.parse(parentRaw);
    setState({ user: parent, isLoading: false, isAuthenticated: true });
    setCanReturnToParent(false);
  }, []);

  // ── Offline fallbacks ─────────────────────────────────────────────────────

  const localLoginFallback = async (email: string, password: string) => {
    const raw = await AsyncStorage.getItem(LOCAL_USER_KEY);
    if (raw) {
      const u: User = JSON.parse(raw);
      if (u.email?.toLowerCase() === email.toLowerCase()) {
        setState({ user: u, isLoading: false, isAuthenticated: true });
        return;
      }
    }
    // No offline account to fall back to — surface this rather than
    // silently creating a blank one, which looked like a successful
    // login into an empty account.
    throw new Error(
      "We couldn't reach the server to sign you in, and no offline account was found on this device. Please check your connection and try again.",
    );
  };

  const localRegisterFallback = async (name: string, email: string, password: string) => {
    const id = "local_" + Date.now();
    const user: User = {
      id,
      name,
      email,
      role: "parent",
      isPremium: false,
      createdAt: new Date().toISOString(),
      hasCompletedOnboarding: false,
      familyId: "f" + id,
    };
    await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    // Stash the password so we can register this account for real once the
    // server becomes reachable again — see trySyncLocalAccount.
    await setPendingLocalPassword(password);
    setState({ user, isLoading: false, isAuthenticated: true });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        childLogin,
        logout,
        completeOnboarding,
        startCheckout,
        manageSubscription,
        refreshUser,
        updateProfile,
        canReturnToParent,
        returnToParent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("failed to fetch") ||
    msg.includes("econnrefused") ||
    msg.includes("timeout")
  );
}
