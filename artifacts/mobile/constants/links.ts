// Public legal/support links. Set these per EAS environment (they are public).
// App Store review requires working Privacy Policy and Terms of Use links in the
// app and on the subscription screen.
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || null;
// Without a custom terms page, Apple's standard licensed-application EULA applies.
export const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL || "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
export const SUPPORT_URL = process.env.EXPO_PUBLIC_SUPPORT_URL || null;
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "admin@nexgenoptimize.com";
