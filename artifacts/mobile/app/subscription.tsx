import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";

const PLANS = [
  { id: "monthly", label: "Monthly", price: "$4.99", period: "/month", saving: null },
  { id: "annual", label: "Annual", price: "$39.99", period: "/year", saving: "Save 33%" },
];

const FEATURES = [
  { icon: "book-open" as const, label: "All 8 courses (including premium)", free: false, premium: true },
  { icon: "shield" as const, label: "Cyberbullying & Scam Awareness", free: true, premium: true },
  { icon: "activity" as const, label: "Digital Footprints & Gaming Safety", free: true, premium: true },
  { icon: "eye-off" as const, label: "Online Predator Awareness course", free: false, premium: true },
  { icon: "cpu" as const, label: "AI Safety & Literacy course", free: false, premium: true },
  { icon: "zap" as const, label: "All Family Challenges", free: false, premium: true },
  { icon: "users" as const, label: "Up to 6 child profiles", free: false, premium: true },
  { icon: "file-text" as const, label: "Family Technology Agreement", free: true, premium: true },
  { icon: "clipboard" as const, label: "Social Media Readiness Assessment", free: true, premium: true },
];

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, upgradeToPremium } = useAuth();
  const haptics = useHaptics();
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleUpgrade = async () => {
    if (user?.isPremium) { Alert.alert("Already Premium", "You're already a Premium member!"); return; }
    try {
      setLoading(true);
      await new Promise(r => setTimeout(r, 1200));
      await upgradeToPremium();
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Welcome to Premium!", "You now have full access to all Digital Village content.", [{ text: "Let's go!", onPress: () => router.back() }]);
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={[styles.heroDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Unlock everything to give your family the complete digital safety toolkit.</Text>
      </View>

      <View style={styles.plans}>
        {PLANS.map(plan => (
          <TouchableOpacity
            key={plan.id}
            style={[styles.planCard, { backgroundColor: colors.card, borderColor: selectedPlan === plan.id ? colors.primary : colors.border, borderWidth: selectedPlan === plan.id ? 2 : 1 }]}
            onPress={() => setSelectedPlan(plan.id)}
            activeOpacity={0.8}
          >
            <View style={styles.planLeft}>
              <View style={[styles.planDot, { borderColor: selectedPlan === plan.id ? colors.primary : colors.border }]}>
                {selectedPlan === plan.id && <View style={[styles.planDotFill, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.planLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{plan.label}</Text>
              {plan.saving && (
                <View style={[styles.savingTag, { backgroundColor: colors.success + "22" }]}>
                  <Text style={[styles.savingText, { color: colors.success, fontFamily: "Inter_700Bold" }]}>{plan.saving}</Text>
                </View>
              )}
            </View>
            <View style={styles.planRight}>
              <Text style={[styles.planPrice, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{plan.price}</Text>
              <Text style={[styles.planPeriod, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{plan.period}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.featuresHeader}>
          <Text style={[styles.featuresTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>What's included</Text>
          <View style={styles.planLabels}>
            <Text style={[styles.planLabelText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Free</Text>
            <Text style={[styles.planLabelText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>Pro</Text>
          </View>
        </View>
        {FEATURES.map(feature => (
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

      {user?.isPremium ? (
        <View style={[styles.alreadyPremium, { backgroundColor: colors.success + "18", borderColor: colors.success + "44" }]}>
          <Feather name="check-circle" size={20} color={colors.success} />
          <Text style={[styles.alreadyText, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>You're already a Premium member!</Text>
        </View>
      ) : (
        <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: loading ? colors.muted : colors.accent }]} onPress={handleUpgrade} disabled={loading} activeOpacity={0.85}>
          <Text style={[styles.upgradeBtnText, { fontFamily: "Inter_700Bold" }]}>
            {loading ? "Processing..." : `Start ${PLANS.find(p => p.id === selectedPlan)?.label} Plan`}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.legal, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Cancel anytime. No commitments. Subscriptions renew automatically unless cancelled at least 24 hours before renewal. Payment processed through App Store.
      </Text>
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
  planDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  planDotFill: { width: 10, height: 10, borderRadius: 5 },
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
});
