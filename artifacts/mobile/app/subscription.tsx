import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { useSubscription } from "@/lib/revenuecat";
import { Badge, Body, Button, Card, Caption, H1, H2, H3, LoadingSpinner, Small } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";

function formatPeriod(period: string): string {
  const map: Record<string, string> = {
    P1W: "week",
    P1M: "month",
    P2M: "2 months",
    P3M: "3 months",
    P6M: "6 months",
    P1Y: "year",
  };
  return map[period] || period;
}

const FEATURES = [
  { icon: "book-open" as const, label: "All 8 courses (including premium)", free: false, premium: true },
  { icon: "shield" as const, label: "Cyberbullying & Scam Awareness", free: true, premium: true },
  { icon: "activity" as const, label: "Digital Footprints & Gaming Safety", free: true, premium: true },
  { icon: "eye-off" as const, label: "Online Predator Awareness course", free: false, premium: true },
  { icon: "cpu" as const, label: "AI Safety & Literacy course", free: false, premium: true },
  { icon: "zap" as const, label: "All Family Challenges", free: false, premium: true },
  { icon: "user" as const, label: "1 child profile", free: true, premium: true },
  { icon: "users" as const, label: "Up to 6 child profiles", free: false, premium: true },
  { icon: "file-text" as const, label: "Family Technology Agreement", free: true, premium: true },
  { icon: "clipboard" as const, label: "Social Media Readiness Assessment", free: true, premium: true },
  { icon: "message-circle" as const, label: "10 coach messages / month", free: true, premium: true },
  { icon: "message-circle" as const, label: "Unlimited AI coach access", free: false, premium: true },
  { icon: "trending-up" as const, label: "Monthly Family Digital-Safety Report", free: false, premium: true },
];

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const haptics = useHaptics();
  const { offerings, isSubscribed, isLoading, purchase, isPurchasing, restore, isRestoring } = useSubscription();
  const [confirmModal, setConfirmModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const currentOffering = offerings?.current;
  const availablePackages = currentOffering?.availablePackages || [];

  const handleSelectPackage = (pkg: any) => {
    setSelectedPackage(pkg);
    setConfirmModal(true);
  };

  const handleConfirmPurchase = async () => {
    setConfirmModal(false);
    if (!selectedPackage) return;
    try {
      await purchase(selectedPackage);
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Welcome to Premium!", "Your subscription is active.");
    } catch (err: any) {
      if (err.userCancelled) {
        // User cancelled — no alert needed
        return;
      }
      Alert.alert("Purchase Failed", err?.message || "Something went wrong. Please try again.");
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Restored", "Your purchases have been restored.");
    } catch (err: any) {
      Alert.alert("Restore Failed", err?.message || "Could not restore purchases.");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background, paddingTop: topPad + spacing.lg }]}>
        <LoadingSpinner />
        <Body color={colors.mutedForeground} style={{ marginTop: spacing.md }}>Loading subscription options...</Body>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: topPad + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroSection}>
        <View style={[styles.starIcon, { backgroundColor: colors.accent + "22" }]}>
          <Feather name="star" size={32} color={colors.accent} />
        </View>
        <H1 style={styles.heroTitle}>Digital Village Premium</H1>
        <Body color={colors.mutedForeground} style={styles.heroDesc}>
          Unlock everything to give your family the complete digital safety toolkit.
        </Body>
      </View>

      <View style={styles.plans}>
        {availablePackages.length === 0 ? (
          <Card variant="outline" style={styles.planCard}>
            <Body color={colors.mutedForeground}>No subscription options available right now.</Body>
          </Card>
        ) : (
          availablePackages.map((pkg) => (
            <Card key={pkg.identifier} variant="outline" pressable onPress={() => handleSelectPackage(pkg)} style={styles.planCardRow}>
              <View style={styles.planLeft}>
                <Body color={colors.foreground}>{pkg.product.title || pkg.packageType}</Body>
                {pkg.product.introPrice && <Badge label="Intro offer" tone={colors.success} variant="soft" />}
              </View>
              <View style={styles.planRight}>
                <H3 style={{ marginBottom: 0 }}>{pkg.product.priceString}</H3>
                <Caption color={colors.mutedForeground}>
                  {pkg.product.subscriptionPeriod ? `/${formatPeriod(pkg.product.subscriptionPeriod)}` : ""}
                </Caption>
              </View>
            </Card>
          ))
        )}
      </View>

      <Card variant="outline" style={styles.featuresCard} padding={0}>
        <View style={styles.featuresHeader}>
          <H2 style={{ marginBottom: 0 }}>What&apos;s included</H2>
          <View style={styles.planLabels}>
            <Small color={colors.mutedForeground} style={styles.planLabelText}>Free</Small>
            <Small color={colors.accent} style={styles.planLabelText}>Pro</Small>
          </View>
        </View>
        {FEATURES.map((feature) => (
          <View key={feature.label} style={[styles.featureRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Feather name={feature.icon} size={15} color={colors.mutedForeground} style={{ flexShrink: 0 }} />
            <Caption color={colors.foreground} style={styles.featureLabel}>{feature.label}</Caption>
            <View style={styles.featureChecks}>
              {feature.free ? <Feather name="check" size={16} color={colors.success} /> : <Feather name="minus" size={16} color={colors.mutedForeground} />}
              <Feather name="check" size={16} color={colors.success} />
            </View>
          </View>
        ))}
      </Card>

      {isSubscribed || user?.isPremium ? (
        <Card variant="outline" style={[styles.alreadyPremium, { backgroundColor: colors.success + "18", borderColor: colors.success + "44" }]}>
          <Feather name="check-circle" size={20} color={colors.success} />
          <Body color={colors.success}>You&apos;re already a Premium member!</Body>
        </Card>
      ) : (
        <>
          <Button
            title={isPurchasing ? "Processing..." : availablePackages.length > 0 ? "Start Premium Plan" : "Subscription unavailable"}
            loading={isPurchasing}
            disabled={isPurchasing || availablePackages.length === 0}
            style={{ backgroundColor: colors.accent }}
            onPress={() => availablePackages[0] && handleSelectPackage(availablePackages[0])}
          />

          <TouchableOpacity onPress={handleRestore} disabled={isRestoring} style={{ alignItems: "center", marginTop: spacing.sm }}>
            <Body color={colors.primary} style={{ fontSize: 14 }}>{isRestoring ? "Restoring..." : "Restore Purchases"}</Body>
          </TouchableOpacity>
        </>
      )}

      <Caption color={colors.mutedForeground} style={styles.legal}>
        Cancel anytime. No commitments. Subscriptions renew automatically unless cancelled at least 24 hours before renewal.
      </Caption>

      <Modal visible={confirmModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <Card variant="elevated" style={styles.modalCard}>
            <H2 style={{ textAlign: "center", marginBottom: 0 }}>Confirm Purchase</H2>
            <Body color={colors.mutedForeground} style={styles.modalDesc}>
              Subscribe to {selectedPackage?.product?.title || "Premium"} for {selectedPackage?.product?.priceString || ""}?
            </Body>
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setConfirmModal(false)} />
              <Button title="Subscribe" style={{ flex: 1, backgroundColor: colors.accent }} onPress={handleConfirmPurchase} />
            </View>
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xxl },
  header: { alignItems: "flex-end" },
  heroSection: { alignItems: "center", gap: spacing.md },
  starIcon: { width: 72, height: 72, borderRadius: radius.xl, alignItems: "center", justifyContent: "center" },
  heroTitle: { textAlign: "center" },
  heroDesc: { textAlign: "center" },
  plans: { gap: spacing.sm },
  planCard: { alignItems: "center" },
  planCardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  planRight: { alignItems: "flex-end" },
  featuresCard: { overflow: "hidden" },
  featuresHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md },
  planLabels: { flexDirection: "row", gap: spacing.lg },
  planLabelText: { width: 32, textAlign: "center" },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  featureLabel: { flex: 1, lineHeight: 18 },
  featureChecks: { flexDirection: "row", gap: spacing.lg },
  alreadyPremium: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  legal: { textAlign: "center", lineHeight: 16 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modalCard: { width: "100%", maxWidth: 340, gap: spacing.lg },
  modalDesc: { textAlign: "center" },
  modalButtons: { flexDirection: "row", gap: spacing.md },
});
