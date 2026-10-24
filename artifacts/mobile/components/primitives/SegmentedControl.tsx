import React, { useEffect } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AppText } from "@/components/AppText";
import { useAccessibility } from "@/context/AccessibilityContext";
import { fontFamily } from "@/constants/typography";
import { radius } from "@/constants/radius";
import { spacing } from "@/constants/spacing";
import { shadow } from "@/constants/elevation";
import { useColors } from "@/hooks/useColors";

interface Segment<T extends string> {
  key: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  const colors = useColors();
  const { settings } = useAccessibility();
  const [trackWidth, setTrackWidth] = React.useState(0);
  const segmentWidth = trackWidth / segments.length;
  const activeIndex = Math.max(0, segments.findIndex(s => s.key === value));
  const offset = useSharedValue(0);

  useEffect(() => {
    const target = activeIndex * segmentWidth;
    offset.value = settings.reduceMotion ? target : withTiming(target, { duration: 200 });
  }, [activeIndex, segmentWidth, settings.reduceMotion, offset]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    width: segmentWidth,
  }));

  const handleLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View style={[styles.track, { backgroundColor: colors.muted }]} onLayout={handleLayout}>
      {trackWidth > 0 && (
        <Animated.View
          style={[styles.indicator, indicatorStyle, { backgroundColor: colors.card }, shadow.sm]}
        />
      )}
      {segments.map(segment => {
        const isActive = segment.key === value;
        return (
          <Pressable key={segment.key} style={styles.segment} onPress={() => onChange(segment.key)} accessibilityRole="button">
            <AppText
              style={{
                fontSize: 13,
                fontFamily: isActive ? fontFamily.semibold : fontFamily.regular,
                color: isActive ? colors.foreground : colors.mutedForeground,
              }}
            >
              {segment.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", borderRadius: radius.pill, padding: 4, position: "relative" },
  indicator: { position: "absolute", top: 4, bottom: 4, left: 4, borderRadius: radius.pill },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm, zIndex: 1 },
});
