import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  apiAddChild,
  apiLogin,
  apiRegister,
  apiSaveProgress,
  apiUpsertAgreement,
  apiUpsertFamily,
  setToken,
  type ApiUser,
} from "@/lib/apiClient";

const PENDING_PASSWORD_KEY = "dv_local_pending_password";
const FAMILY_KEY = "@dv_family";
const AGREEMENT_KEY = "@dv_agreement";
const PROGRESS_KEY = "@dv_progress";

function familyKeysFor(userId: string) {
  return {
    family: `${FAMILY_KEY}:${userId}`,
    agreement: `${AGREEMENT_KEY}:${userId}`,
    progress: `${PROGRESS_KEY}:${userId}`,
  };
}

// expo-secure-store has no web implementation, so pending credentials fall
// back to AsyncStorage there — matching the auth token, which is already
// plaintext-in-AsyncStorage on web.
export async function setPendingLocalPassword(password: string): Promise<void> {
  try {
    if (Platform.OS === "web") await AsyncStorage.setItem(PENDING_PASSWORD_KEY, password);
    else await SecureStore.setItemAsync(PENDING_PASSWORD_KEY, password);
  } catch {
    // best-effort — if this fails the account just won't auto-sync later
  }
}

async function getPendingLocalPassword(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return await AsyncStorage.getItem(PENDING_PASSWORD_KEY);
    return await SecureStore.getItemAsync(PENDING_PASSWORD_KEY);
  } catch {
    return null;
  }
}

export async function clearPendingLocalPassword(): Promise<void> {
  try {
    if (Platform.OS === "web") await AsyncStorage.removeItem(PENDING_PASSWORD_KEY);
    else await SecureStore.deleteItemAsync(PENDING_PASSWORD_KEY);
  } catch {
    // ignore
  }
}

// Pushes family/agreement/progress data cached under the offline user id to
// the server, then re-keys the local cache under the new server-issued id so
// FamilyContext finds it there instead of loading an empty server state and
// clobbering what was built while offline. Each piece migrates
// independently — a network drop mid-sync only leaves that one piece behind
// under the old key rather than losing everything.
async function migrateLocalFamilyData(oldUserId: string, newUserId: string): Promise<void> {
  const oldKeys = familyKeysFor(oldUserId);
  const newKeys = familyKeysFor(newUserId);

  const famRaw = await AsyncStorage.getItem(oldKeys.family);
  if (famRaw) {
    try {
      const fam = JSON.parse(famRaw);
      await apiUpsertFamily(fam.id, fam.name);
      for (const child of fam.children ?? []) {
        await apiAddChild(child.id, fam.id, child.name, child.ageBand);
      }
      await AsyncStorage.setItem(newKeys.family, famRaw);
      await AsyncStorage.removeItem(oldKeys.family);
    } catch {
      // left under the old key
    }
  }

  const agrRaw = await AsyncStorage.getItem(oldKeys.agreement);
  if (agrRaw) {
    try {
      const agr = JSON.parse(agrRaw);
      await apiUpsertAgreement({
        id: agr.id,
        familyId: agr.familyId,
        rules: agr.rules,
        customRules: agr.customRules,
        signedAt: agr.signedAt,
      });
      await AsyncStorage.setItem(newKeys.agreement, agrRaw);
      await AsyncStorage.removeItem(oldKeys.agreement);
    } catch {
      // left under the old key
    }
  }

  const progRaw = await AsyncStorage.getItem(oldKeys.progress);
  if (progRaw) {
    try {
      const prog = JSON.parse(progRaw);
      await apiSaveProgress(prog);
      await AsyncStorage.setItem(newKeys.progress, progRaw);
      await AsyncStorage.removeItem(oldKeys.progress);
    } catch {
      // left under the old key
    }
  }
}

// Converts a local-only (`local_*`) account into a real server account:
// registers it, falling back to login if an earlier sync attempt already
// created it server-side but the client never recorded that (e.g. it was
// killed mid-sync). Returns null (and leaves the local account untouched) if
// the server still can't be reached or has no stored password to retry with.
export async function syncLocalAccountToServer(localUser: {
  id: string;
  name: string;
  email: string;
}): Promise<ApiUser | null> {
  if (!localUser.id.startsWith("local_")) return null;

  const password = await getPendingLocalPassword();
  if (!password) return null;

  const finish = async (result: { token: string; user: ApiUser }) => {
    await setToken(result.token);
    await migrateLocalFamilyData(localUser.id, result.user.id);
    await clearPendingLocalPassword();
    return result.user;
  };

  try {
    return await finish(await apiRegister(localUser.name, localUser.email, password));
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      try {
        return await finish(await apiLogin(localUser.email, password));
      } catch {
        return null;
      }
    }
    return null;
  }
}
