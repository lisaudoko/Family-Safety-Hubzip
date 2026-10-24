import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { AppText } from "@/components/AppText";
import { useAccessibility } from "@/context/AccessibilityContext";
import { fontFamily } from "@/constants/typography";
import { radius } from "@/constants/radius";
import { spacing } from "@/constants/spacing";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 40, md: 52, lg: 56 };
const FONT_SIZES: Record<ButtonSize, number> = { sm: 14, md: 15, lg: 16 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  style,
  testID,
}: ButtonProps) {
  const colors = useColors();
  const { settings } = useAccessibility();
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isDisabled = disabled || loading;

  const tones: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.primaryForeground },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground },
    outline: { bg: "transparent", fg: colors.foreground, border: colors.border },
    ghost: { bg: "transparent", fg: colors.primary },
    destructive: { bg: colors.destructive, fg: colors.destructiveForeground },
  };
  const tone = tones[variant];

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 18, stiffness: 380 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 380 });
  };
  const handlePress = () => {
    if (isDisabled) return;
    haptics.impact(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPress={handlePress}
      onPressIn={settings.reduceMotion ? undefined : handlePressIn}
      onPressOut={settings.reduceMotion ? undefined : handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={[
        settings.reduceMotion ? undefined : animatedStyle,
        styles.base,
        {
          height: HEIGHTS[size],
          borderRadius: radius.md,
          backgroundColor: tone.bg,
          borderWidth: tone.border ? 1 : 0,
          borderColor: tone.border,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <View style={styles.content}>
          {icon && <Feather name={icon} size={size === "sm" ? 16 : 18} color={tone.fg} />}
          <AppText style={{ color: tone.fg, fontSize: FONT_SIZES[size], fontFamily: fontFamily.semibold }}>{title}</AppText>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
