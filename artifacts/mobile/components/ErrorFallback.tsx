import { Feather } from "@expo/vector-icons";
import { reloadAppAsync } from "expo";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Body, Button, H1 } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { shadow } from "@/constants/elevation";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const monoFont = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {__DEV__ ? (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="View error details"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.topButton,
            {
              top: insets.top + spacing.lg,
              backgroundColor: colors.card,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="alert-circle" size={20} color={colors.foreground} />
        </Pressable>
      ) : null}

      <View style={styles.content}>
        <H1 style={styles.title}>Something went wrong</H1>
        <Body color={colors.mutedForeground} style={styles.message}>Please reload the app to continue.</Body>
        <Button title="Try Again" onPress={handleRestart} fullWidth={false} style={styles.button} />
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.background }, shadow.lg]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <H1 style={styles.modalTitle}>Error Details</H1>
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  accessibilityLabel="Close error details"
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="x" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={[styles.modalScrollContent, { paddingBottom: insets.bottom + spacing.lg }]}
                showsVerticalScrollIndicator
              >
                <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
                  <Text style={[styles.errorText, { color: colors.foreground, fontFamily: monoFont }]} selectable>
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    width: "100%",
    maxWidth: 600,
  },
  title: { textAlign: "center" },
  message: { textAlign: "center" },
  topButton: {
    position: "absolute",
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  button: { paddingHorizontal: spacing.xxl, minWidth: 200, ...shadow.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    height: "90%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { marginBottom: 0, fontSize: 20 },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.lg,
  },
  errorContainer: {
    width: "100%",
    borderRadius: radius.sm,
    overflow: "hidden",
    padding: spacing.lg,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    width: "100%",
  },
});
