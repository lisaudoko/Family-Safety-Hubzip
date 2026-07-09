import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { useSubscription } from "@/lib/revenuecat";

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
      <View style={[styles.loader, { backgroundColor: colors.background, paddingTop: topPad + 16 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_400Regular" }}>
          Loading subscription options...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroSection}>
        <View style={[styles.starIcon, { backgroundColor: colors.accent + "22" }]}>
          <Feather name="star" size={32} color={colors.accent} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Digital Village Premium</Text>
        <Text style={[styles.heroDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Unlock everything to give your family the complete digital safety toolkit.
        </Text>
      </View>

      {/* Plans from RevenueCat */}
      <View style={styles.plans}>
        {availablePackages.length === 0 ? (
          <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.planLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              No subscription options available right now.
            </Text>
          </View>
        ) : (
          availablePackages.map((pkg) => (
            <TouchableOpacity
              key={pkg.identifier}
              style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => handleSelectPackage(pkg)}
              activeOpacity={0.8}
            >
              <View style={styles.planLeft}>
                <Text style={[styles.planLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {pkg.product.title || pkg.packageType}
                </Text>
                {pkg.product.introPrice && (
                  <View style={[styles.savingTag, { backgroundColor: colors.success + "22" }]}>
                    <Text style={[styles.savingText, { color: colors.success, fontFamily: "Inter_700Bold" }]}>
                      Intro offer
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.planRight}>
                <Text style={[styles.planPrice, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {pkg.product.priceString}
                </Text>
                <Text style={[styles.planPeriod, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {pkg.product.subscriptionPeriod ? `/${pkg.product.subscriptionPeriod}` : ""}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.featuresHeader}>
          <Text style={[styles.featuresTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>What's included</Text>
          <View style={styles.planLabels}>
            <Text style={[styles.planLabelText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Free</Text>
            <Text style={[styles.planLabelText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>Pro</Text>
          </View>
        </View>
        {FEATURES.map((feature) => (
          <View key={feature.label} style={[styles.featureRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Feather name={feature.icon} size={15} color={colors.mutedForeground} style={{ flexShrink: 0 }} />
            <Text style={[styles.featureLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{feature.label}</Text>
            <View style={styles.featureChecks}>
              {feature.free ? <Feather name="check" size={16} color={colors.success} /> : <Feather name="minus" size={16} color={colors.mutedForeground} />}
              <Feather name="check" size={16} color={colors.success} />
            </View>
          </View>
        ))}
      </View>

      {isSubscribed || user?.isPremium ? (
        <View style={[styles.alreadyPremium, { backgroundColor: colors.success + "18", borderColor: colors.success + "44" }]}>
          <Feather name="check-circle" size={20} color={colors.success} />
          <Text style={[styles.alreadyText, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>You're already a Premium member!</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.upgradeBtn, { backgroundColor: isPurchasing ? colors.muted : colors.accent }]}
            onPress={() => availablePackages[0] && handleSelectPackage(availablePackages[0])}
            disabled={isPurchasing || availablePackages.length === 0}
            activeOpacity={0.85}
          >
            <Text style={[styles.upgradeBtnText, { fontFamily: "Inter_700Bold" }]}>
              {isPurchasing ? "Processing..." : availablePackages.length > 0 ? "Start Premium Plan" : "Subscription unavailable"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRestore} disabled={isRestoring} style={{ alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", fontSize: 14 }}>
              {isRestoring ? "Restoring..." : "Restore Purchases"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={[styles.legal, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Cancel anytime. No commitments. Subscriptions renew automatically unless cancelled at least 24 hours before renewal.
      </Text>

      {/* Confirmation Modal */}
      <Modal visible={confirmModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Confirm Purchase
            </Text>
            <Text style={[styles.modalDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Subscribe to {selectedPackage?.product?.title || "Premium"} for {selectedPackage?.product?.priceString || ""}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setConfirmModal(false)} style={[styles.modalBtn, { backgroundColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmPurchase} style={[styles.modalBtn, { backgroundColor: colors.accent }]}>
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold" }}>Subscribe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 24 },
  header: { alignItems: "flex-end" },
  heroSection: { alignItems: "center", gap: 12 },
  starIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 26, textAlign: "center" },
  heroDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  plans: { gap: 10 },
  planCard: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  planLabel: { fontSize: 15 },
  savingTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  savingText: { fontSize: 12 },
  planRight: { alignItems: "flex-end" },
  planPrice: { fontSize: 18 },
  planPeriod: { fontSize: 12 },
  featuresCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  featuresHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  featuresTitle: { fontSize: 16 },
  planLabels: { flexDirection: "row", gap: 16 },
  planLabelText: { fontSize: 13, width: 32, textAlign: "center" },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  featureLabel: { flex: 1, fontSize: 13, lineHeight: 18 },
  featureChecks: { flexDirection: "row", gap: 16 },
  alreadyPremium: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  alreadyText: { fontSize: 15 },
  upgradeBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  upgradeBtnText: { color: "#FFFFFF", fontSize: 17 },
  legal: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, gap: 16 },
  modalTitle: { fontSize: 20, textAlign: "center" },
  modalDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
});