import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { useAccessibility } from "@/context/AccessibilityContext";
import { radius } from "@/constants/radius";
import { spacing } from "@/constants/spacing";
import { shadow } from "@/constants/elevation";
import { useColors } from "@/hooks/useColors";

export type CardVariant = "elevated" | "flat" | "outline";

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  pressable?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ children, variant = "elevated", pressable = false, onPress, style, padding = spacing.lg, testID }: CardProps) {
  const colors = useColors();
  const { settings } = useAccessibility();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const baseStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding,
      borderWidth: variant === "outline" ? 1 : 0,
      borderColor: colors.border,
      ...(variant === "elevated" ? shadow.md : null),
    },
    style,
  ];

  if (!pressable) {
    return (
      <View style={baseStyle} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={settings.reduceMotion ? undefined : () => (scale.value = withSpring(0.98, { damping: 18, stiffness: 380 }))}
      onPressOut={settings.reduceMotion ? undefined : () => (scale.value = withSpring(1, { damping: 18, stiffness: 380 }))}
      accessibilityRole="button"
      style={[settings.reduceMotion ? undefined : animatedStyle, baseStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
