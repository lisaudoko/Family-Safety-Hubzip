import React from "react";
import { type TextProps } from "react-native";

import { AppText } from "@/components/AppText";
import { typeScale } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

interface TypographyProps extends TextProps {
  color?: string;
}

function makeVariant(scaleKey: keyof typeof typeScale, defaultColorKey: "foreground" | "mutedForeground" = "foreground") {
  return function Variant({ style, color, ...props }: TypographyProps) {
    const colors = useColors();
    return (
      <AppText
        {...props}
        style={[typeScale[scaleKey], { color: color ?? colors[defaultColorKey] }, style]}
      />
    );
  };
}

export const Display = makeVariant("display");
export const H1 = makeVariant("h1");
export const H2 = makeVariant("h2");
export const H3 = makeVariant("h3");
export const Body = makeVariant("body");
export const BodyStrong = makeVariant("bodyStrong");
export const Caption = makeVariant("caption", "mutedForeground");
export const Label = makeVariant("label", "mutedForeground");
export const Small = makeVariant("small", "mutedForeground");
