import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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
  upgradeToPremi: () => Promise<void>;
  switchToChildMode: (childId: string) => Promise<void>;
  switchToParentMode: () => Promise<void>;
}

const AUTH_KEY = "@digital_village_auth";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true, isAuthenticated: false });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      if (stored) {
        const user: User = JSON.parse(stored);
        setState({ user, isLoading: false, isAuthenticated: true });
      } else {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  };

  const saveUser = async (user: User) => {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
    setState({ user, isLoading: false, isAuthenticated: true });
  };

  const login = useCallback(async (email: string, _password: string) => {
    const stored = await AsyncStorage.getItem(AUTH_KEY);
    if (stored) {
      const user: User = JSON.parse(stored);
      if (user.email === email) {
        await saveUser(user);
        return;
      }
    }
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const user: User = {
      id,
      name: email.split("@")[0] ?? "Parent",
      email,
      role: "parent",
      isPremium: false,
      createdAt: new Date().toISOString(),
      hasCompletedOnboarding: false,
      familyId: "f" + id,
    };
    await saveUser(user);
  }, []);

  const register = useCallback(async (name: string, email: string, _password: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
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
    await saveUser(user);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!state.user) return;
    const updated: User = { ...state.user, hasCompletedOnboarding: true };
    await saveUser(updated);
  }, [state.user]);

  const upgradeToPremi = useCallback(async () => {
    if (!state.user) return;
    const updated: User = { ...state.user, isPremium: true };
    await saveUser(updated);
  }, [state.user]);

  const switchToChildMode = useCallback(async (childId: string) => {
    if (!state.user) return;
    const parentKey = "@digital_village_parent_id";
    await AsyncStorage.setItem(parentKey, state.user.id);
    const updated: User = { ...state.user, role: "child", id: childId };
    setState({ user: updated, isLoading: false, isAuthenticated: true });
  }, [state.user]);

  const switchToParentMode = useCallback(async () => {
    if (!state.user) return;
    await loadUser();
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, completeOnboarding, upgradeToPremi, switchToChildMode, switchToParentMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
