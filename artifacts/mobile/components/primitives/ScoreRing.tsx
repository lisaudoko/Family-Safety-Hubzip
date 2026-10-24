import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { AppText } from "@/components/AppText";
import { fontFamily } from "@/constants/typography";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useColors } from "@/hooks/useColors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreRingProps {
  score: number;
  max: number;
  size?: number;
}

export function ScoreRing({ score, max, size = 80 }: ScoreRingProps) {
  const colors = useColors();
  const { settings } = useAccessibility();
  const pct = max > 0 ? Math.min(score / max, 1) : 0;
  const pctLabel = Math.round(pct * 100);
  const color = pct >= 0.7 ? colors.success : pct >= 0.4 ? colors.warning : colors.destructive;

  const strokeWidth = Math.max(4, size * 0.08);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = settings.reduceMotion ? pct : withTiming(pct, { duration: 700 });
  }, [pct, settings.reduceMotion, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.muted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <AppText style={{ color, fontFamily: fontFamily.bold, fontSize: size * 0.28 }}>{pctLabel}%</AppText>
    </View>
  );
}
