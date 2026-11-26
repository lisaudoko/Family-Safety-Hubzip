import { Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { PRIVACY_POLICY_URL, TERMS_URL } from "@/constants/links";

// Shown only when no published policy URL is configured. Keep this consistent
// with docs/DATA_INVENTORY.md and the published policy.
export const PRIVACY_SUMMARY =
  "Digital Village stores your family's account, learning progress and linked-device details on our servers so they sync across your devices.\n\n" +
  "On a child's device we record only time spent in Digital Village itself. On iPhone, if a parent allows it, we apply the bedtime and web-filter settings you choose using Apple's Screen Time framework.\n\n" +
  "A parent can see a child's screen live only when the child accepts that request on their phone. It lasts up to 15 minutes, either of them can stop it, and it is never recorded.\n\n" +
  "We never collect messages, browsing history, photos or location. We don't sell your data or show ads. AI Coach messages are sent to our AI provider to generate replies and are not stored on our servers.\n\n" +
  "You can delete your account and all family data at any time from Profile.";

export async function openPrivacyPolicy(): Promise<void> {
  if (PRIVACY_POLICY_URL) {
    await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
    return;
  }
  Alert.alert("Privacy", PRIVACY_SUMMARY, [{ text: "Close" }]);
}

export async function openTerms(): Promise<void> {
  await WebBrowser.openBrowserAsync(TERMS_URL);
}
