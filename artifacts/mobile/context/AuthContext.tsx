import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  apiCompleteOnboarding,
  apiGetMe,
  apiLogin,
  apiLogout,
  apiRegister,
  apiUpdateMe,
  apiUpgradePremium,
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
  email: string;
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
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  upgradeToPremium: () => Promise<void>;
  updateProfile: (partial: Partial<Pick<User, "name" | "email">>) => Promise<void>;
  switchToChildMode: (childId: string) => Promise<void>;
  switchToParentMode: () => Promise<void>;
}

const LOCAL_USER_KEY = "@dv_local_user";
const PARENT_KEY = "@dv_parent_auth";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

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
    if (localUser.isPremium && !updated.isPremium) {
      try {
        const { user } = await apiUpgradePremium();
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
    email: string;
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
    await clearPendingLocalPassword();
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

  const upgradeToPremium = useCallback(async () => {
    if (!state.user) return;
    try {
      const { user } = await apiUpgradePremium();
      setState(s => ({ ...s, user: apiUserToUser(user) }));
    } catch {
      const updated: User = { ...state.user, isPremium: true };
      setState(s => ({ ...s, user: updated }));
    }
  }, [state.user]);

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

  const switchToChildMode = useCallback(async (childId: string) => {
    if (!state.user) return;
    await AsyncStorage.setItem(PARENT_KEY, JSON.stringify(state.user));
    setState(s => {
      if (!s.user) return s;
      return { ...s, user: { ...s.user, role: "child", id: childId } };
    });
  }, [state.user]);

  const switchToParentMode = useCallback(async () => {
    const stored = await AsyncStorage.getItem(PARENT_KEY);
    if (stored) {
      const parent: User = JSON.parse(stored);
      setState(s => ({ ...s, user: parent }));
    }
  }, []);

  // ── Offline fallbacks ─────────────────────────────────────────────────────

  const localLoginFallback = async (email: string, password: string) => {
    const raw = await AsyncStorage.getItem(LOCAL_USER_KEY);
    if (raw) {
      const u: User = JSON.parse(raw);
      if (u.email === email) {
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
        logout,
        completeOnboarding,
        upgradeToPremium,
        updateProfile,
        switchToChildMode,
        switchToParentMode,
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
