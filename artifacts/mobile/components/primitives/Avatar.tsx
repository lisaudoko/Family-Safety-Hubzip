import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { AppText } from "@/components/AppText";
import { fontFamily } from "@/constants/typography";
import { radius } from "@/constants/radius";
import { useColors } from "@/hooks/useColors";

interface AvatarProps {
  initial: string;
  color?: string;
  size?: number;
  onPress?: () => void;
}

export function Avatar({ initial, color, size = 46, onPress }: AvatarProps) {
  const colors = useColors();
  const tint = color ?? colors.primary;
  const circleStyle = [
    styles.circle,
    {
      width: size,
      height: size,
      borderRadius: radius.pill,
      backgroundColor: tint + "22",
      borderColor: tint + "44",
    },
  ];
  const label = <AppText style={{ color: tint, fontFamily: fontFamily.bold, fontSize: size * 0.42 }}>{initial.toUpperCase()}</AppText>;

  if (onPress) {
    return (
      <TouchableOpacity style={circleStyle} onPress={onPress} activeOpacity={0.75}>
        {label}
      </TouchableOpacity>
    );
  }

  return <View style={circleStyle}>{label}</View>;
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center", borderWidth: 2 },
});
