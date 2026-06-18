import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

if (Platform.OS !== "web") {
  require("react-native-url-polyfill/auto");
}

const SecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === "web") {
      try { return Promise.resolve(localStorage.getItem(key)); } catch { return Promise.resolve(null); }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === "web") {
      try { localStorage.setItem(key, value); } catch {}
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === "web") {
      try { localStorage.removeItem(key); } catch {}
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

let _client: SupabaseClient | null = null;

// Supabase expects the project base URL (e.g. https://<ref>.supabase.co).
// Normalize to the origin so a value that mistakenly includes a path suffix
// like "/rest/v1/" can't break auth/data calls (the SDK appends /auth/v1,
// /rest/v1, etc. to whatever it is given).
function normalizeSupabaseUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : null;

  if (url && rawUrl && url !== rawUrl.replace(/\/+$/, "")) {
    console.warn(
      "[supabase] EXPO_PUBLIC_SUPABASE_URL contained an extra path/query and was normalized to its origin. " +
        "Set it to the base project URL (https://<ref>.supabase.co) to avoid this.",
    );
  }

  if (!url || !key) return null;

  _client = createClient(url, key, {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return _client;
}
