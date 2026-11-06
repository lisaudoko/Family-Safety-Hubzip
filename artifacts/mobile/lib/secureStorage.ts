import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Credentials (session tokens) belong in the OS keychain/keystore, not plain
// AsyncStorage. Web has no secure store, so it keeps using AsyncStorage.
const useSecure = Platform.OS !== "web";

export async function getSecureItem(key: string): Promise<string | null> {
  if (!useSecure) return AsyncStorage.getItem(key);
  const value = await SecureStore.getItemAsync(key);
  if (value !== null) return value;
  // One-time migration of values written by older builds into AsyncStorage.
  const legacy = await AsyncStorage.getItem(key);
  if (legacy !== null) {
    await SecureStore.setItemAsync(key, legacy);
    await AsyncStorage.removeItem(key);
  }
  return legacy;
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (!useSecure) return AsyncStorage.setItem(key, value);
  await SecureStore.setItemAsync(key, value);
  await AsyncStorage.removeItem(key);
}

export async function removeSecureItem(key: string): Promise<void> {
  if (useSecure) await SecureStore.deleteItemAsync(key);
  await AsyncStorage.removeItem(key);
}
