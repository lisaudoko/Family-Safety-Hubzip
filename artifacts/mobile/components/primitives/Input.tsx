import React, { useState } from "react";
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { AppText } from "@/components/AppText";
import { fontFamily, typeScale } from "@/constants/typography";
import { radius } from "@/constants/radius";
import { spacing } from "@/constants/spacing";
import { useColors } from "@/hooks/useColors";

interface TextFieldProps extends TextInputProps {
  label?: string;
  helperText?: string;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  rightElement?: React.ReactNode;
}

export function TextField({ label, helperText, errorText, containerStyle, rightElement, style, onFocus, onBlur, ...props }: TextFieldProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(errorText);

  const borderColor = hasError ? colors.destructive : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <AppText style={[typeScale.label, { color: colors.mutedForeground, marginBottom: spacing.xs }]}>{label}</AppText>}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.input,
            borderColor,
            borderWidth: focused ? 2 : 1,
          },
        ]}
      >
        <TextInput
          {...props}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, fontFamily: fontFamily.regular }, style]}
        />
        {rightElement}
      </View>
      {(errorText || helperText) && (
        <AppText
          style={[
            typeScale.caption,
            { color: hasError ? colors.destructive : colors.mutedForeground, marginTop: spacing.xs },
          ]}
        >
          {errorText ?? helperText}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  inputRow: { flexDirection: "row", alignItems: "center", height: 52, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  input: { flex: 1, fontSize: 15, height: "100%" },
});
