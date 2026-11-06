import React, { useState } from "react";
import { Alert, Platform, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Body, BodyStrong, Button, Caption, Card } from "@/components/primitives";
import { useColors } from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { apiGetDevicePolicy } from "@/lib/apiClient";
import { getOrCreateDeviceId } from "@/lib/deviceSync";
import {
  applyPolicy,
  getScreenControlStatus,
  requestChildAuthorization,
  type ScreenControlStatus,
} from "@/lib/screenControl";

// Shown on a child's own device so they can turn on Screen Time protection.
// Authorization is what lets the app enforce bedtime and web filters that
// the child can't switch off without a parent.
export function ScreenControlCard() {
  const colors = useColors();
  const [status, setStatus] = useState<ScreenControlStatus>(getScreenControlStatus());
  const [busy, setBusy] = useState(false);

  if (Platform.OS !== "ios" || status === "unavailable") return null;

  const enable = async () => {
    setBusy(true);
    try {
      const next = await requestChildAuthorization();
      setStatus(next);
      if (next === "approved") {
        const deviceId = await getOrCreateDeviceId();
        const { policy } = await apiGetDevicePolicy(deviceId);
        applyPolicy(policy);
      } else if (next === "denied") {
        Alert.alert("Not enabled", "A parent needs to approve Screen Time for this device. Please try again with them.");
      }
    } catch {
      Alert.alert("Couldn't enable protection", "Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const approved = status === "approved";

  return (
    <Card variant="outline" style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Feather name={approved ? "shield" : "shield-off"} size={18} color={approved ? colors.success : colors.mutedForeground} />
        <BodyStrong color={colors.foreground}>Screen Time Protection</BodyStrong>
      </View>
      <Body color={colors.foreground}>
        {approved
          ? "Active. Your family's bedtime and web rules apply on this device."
          : "Turn this on with a parent so your family's bedtime and web rules can apply on this device."}
      </Body>
      {!approved && (
        <>
          <Caption color={colors.mutedForeground}>Your parent will be asked to approve with their Apple ID.</Caption>
          <Button title={busy ? "Waiting…" : "Turn on"} onPress={enable} disabled={busy} />
        </>
      )}
    </Card>
  );
}
