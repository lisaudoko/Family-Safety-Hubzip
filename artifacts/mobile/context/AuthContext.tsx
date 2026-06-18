import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session } from "@supabase/supabase-js";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "parent" | "child";
  subscription_tier: "free" | "premium";
  family_id: string | null;
  has_completed_onboarding: boolean;
}

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
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  upgradeToPremium: () => Promise<void>;
  switchToChildMode: (childId: string) => Promise<void>;
  switchToParentMode: () => Promise<void>;
}

const AUTH_KEY = "@digital_village_auth";
const PARENT_KEY = "@digital_village_parent_auth";

const AuthContext = createContext<AuthContextType | null>(null);

function profileToUser(profile: Profile): User {
  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: profile.role,
    isPremium: profile.subscription_tier === "premium",
    createdAt: new Date().toISOString(),
    hasCompletedOnboarding: profile.has_completed_onboarding,
    familyId: profile.family_id ?? "",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const initialized = useRef(false);
  const supabase = getSupabase();
  const hasSupabase = !!supabase;

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let cleanup: (() => void) | undefined;
    if (hasSupabase) {
      initWithSupabase().then(fn => { cleanup = fn; });
    } else {
      loadLocalUser();
    }
    return () => cleanup?.();
  }, []);

  const initWithSupabase = async () => {
    const sb = getSupabase();
    if (!sb) {
      setState(s => ({ ...s, isLoading: false }));
      return () => {};
    }

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const user = await fetchOrCreateProfile(session);
        setState({ user, session, isLoading: false, isAuthenticated: !!user });
      } else {
        setState({ user: null, session: null, isLoading: false, isAuthenticated: false });
      }
    });

    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      setState(s => ({ ...s, isLoading: false }));
    }

    return () => subscription.unsubscribe();
  };

  const fetchOrCreateProfile = async (session: Session): Promise<User | null> => {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const { data, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error && error.code === "PGRST116") {
        const { data: newProfile, error: createError } = await sb
          .from("profiles")
          .insert({
            id: session.user.id,
            email: session.user.email ?? "",
            full_name: session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "Parent",
            role: "parent",
            subscription_tier: "free",
            has_completed_onboarding: false,
          })
          .select()
          .single();

        if (createError || !newProfile) return null;
        return profileToUser(newProfile as Profile);
      }

      if (error || !data) return null;
      return profileToUser(data as Profile);
    } catch {
      return null;
    }
  };

  const loadLocalUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      if (stored) {
        const user: User = JSON.parse(stored);
        setState({ user, session: null, isLoading: false, isAuthenticated: true });
      } else {
        setState(s => ({ ...s, isLoading: false }));
      }
    } catch {
      setState(s => ({ ...s, isLoading: false }));
    }
  };

  const saveLocalUser = async (user: User) => {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
    setState({ user, session: null, isLoading: false, isAuthenticated: true });
  };

  const login = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Eagerly set user so the next screen doesn't see a stale null state
      // while waiting for the onAuthStateChange listener to fire.
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        const user = await fetchOrCreateProfile(session);
        setState({ user, session, isLoading: false, isAuthenticated: !!user });
      }
    } else {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      if (stored) {
        const user: User = JSON.parse(stored);
        if (user.email === email) { await saveLocalUser(user); return; }
      }
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      await saveLocalUser({
        id, name: email.split("@")[0] ?? "Parent", email,
        role: "parent", isPremium: false,
        createdAt: new Date().toISOString(),
        hasCompletedOnboarding: false,
        familyId: "f" + id,
      });
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw error;
      // Eagerly set user so the onboarding screen sees the user immediately.
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        const user = await fetchOrCreateProfile(session);
        setState({ user, session, isLoading: false, isAuthenticated: !!user });
      }
    } else {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      await saveLocalUser({
        id, name, email, role: "parent", isPremium: false,
        createdAt: new Date().toISOString(),
        hasCompletedOnboarding: false,
        familyId: "f" + id,
      });
    }
  }, []);

  const logout = useCallback(async () => {
    const sb = getSupabase();
    if (sb) {
      await sb.auth.signOut();
    } else {
      await AsyncStorage.removeItem(AUTH_KEY);
      setState({ user: null, session: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!state.user) return;
    const sb = getSupabase();
    try {
      if (sb) {
        await sb.from("profiles").update({ has_completed_onboarding: true }).eq("id", state.user.id);
      }
    } catch (e: any) {
      console.error("[completeOnboarding] Supabase error:", e?.message || e);
    }
    const updated: User = { ...state.user, hasCompletedOnboarding: true };
    if (!sb) await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated));
    setState(s => ({ ...s, user: updated }));
  }, [state.user]);

  const upgradeToPremium = useCallback(async () => {
    if (!state.user) return;
    const sb = getSupabase();
    try {
      if (sb) {
        await sb.from("profiles").update({ subscription_tier: "premium" }).eq("id", state.user.id);
      }
    } catch (e: any) {
      console.error("[upgradeToPremium] Supabase error:", e?.message || e);
    }
    const updated: User = { ...state.user, isPremium: true };
    if (!sb) await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated));
    setState(s => ({ ...s, user: updated }));
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

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, completeOnboarding, upgradeToPremium, switchToChildMode, switchToParentMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
