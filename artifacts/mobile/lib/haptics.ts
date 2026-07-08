import * as Haptics from "expo-haptics";

import { useAccessibility } from "@/context/AccessibilityContext";

export function useHaptics() {
  const { settings } = useAccessibility();

  return {
    notify: (type: Haptics.NotificationFeedbackType) =>
      settings.reduceHaptics ? Promise.resolve() : Haptics.notificationAsync(type),
    impact: (style: Haptics.ImpactFeedbackStyle) =>
      settings.reduceHaptics ? Promise.resolve() : Haptics.impactAsync(style),
    selection: () => (settings.reduceHaptics ? Promise.resolve() : Haptics.selectionAsync()),
  };
}
