import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useAccessibility } from "@/context/AccessibilityContext";

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Falls back to the light palette when no dark key is defined in
 * constants/colors.ts (the scaffold ships light-only by default).
 * When a sibling web artifact's dark tokens are synced into a `dark`
 * key, this hook will automatically switch palettes based on the
 * device's appearance setting.
 *
 * When the user has enabled high contrast in accessibility settings,
 * a higher-contrast variant of the active scheme is used instead.
 *
 * Color scheme normally follows the device's appearance setting, but
 * can be overridden in-app via the accessibility settings' theme mode
 * (system/light/dark).
 */
export function useColors() {
  const osScheme = useColorScheme();
  const { settings } = useAccessibility();
  const isDark = settings.themeMode === "system" ? osScheme === "dark" : settings.themeMode === "dark";
  const palette = settings.highContrast
    ? isDark
      ? colors.highContrastDark
      : colors.highContrastLight
    : isDark
      ? colors.dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
