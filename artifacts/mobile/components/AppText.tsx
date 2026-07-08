import React from "react";
import { StyleSheet, Text, type TextProps } from "react-native";

import { useAccessibility } from "@/context/AccessibilityContext";

export function AppText({ style, ...props }: TextProps) {
  const { settings } = useAccessibility();
  const flat = StyleSheet.flatten(style) ?? {};
  const scaledStyle =
    typeof flat.fontSize === "number" ? { ...flat, fontSize: flat.fontSize * settings.fontScale } : flat;

  return <Text {...props} style={scaledStyle} allowFontScaling={false} />;
}
