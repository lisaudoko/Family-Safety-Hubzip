import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFamily } from "@/context/FamilyContext";
import { AGE_BANDS, AgeBand } from "@/data/seed";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { useChildPolicy } from "@/hooks/useChildPolicy";
import { useChildDevices } from "@/hooks/useChildDevices";
import { useDeviceRestrictions } from "@/hooks/useDeviceRestrictions";
import { useDeviceAppRules } from "@/hooks/useDeviceAppRules";
import { useEffectivePolicy } from "@/hooks/useEffectivePolicy";
import { deviceStatusMeta } from "@/lib/deviceStatus";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { AGE_BAND_COLORS, avatarColorForName } from "@/constants/identityColors";
import type { ApiDevice } from "@/lib/apiClient";
import {
  Avatar,
  Badge,
  Body,
  Button,
  Card,
  Caption,
  H1,
  H2,
  H3,
  Label,
  SegmentedControl,
  Small,
  TextField,
  ToggleRow,
} from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { fontFamily } from "@/constants/typography";

type RestrictionToggles = {
  screenTimeLimitMinutes: number | null;
  bedtimeStart: string | null;
  bedtimeEnd: string | null;
  blockNewAppInstalls: boolean;
  blockSafari: boolean;
  blockExplicitContent: boolean;
  requireParentApproval: boolean;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function RestrictionRows({
  values,
  onChange,
  colors,
}: {
  values: Partial<RestrictionToggles> | null | undefined;
  onChange: (data: Partial<RestrictionToggles>) => void | Promise<void>;
  colors: ReturnType<typeof useColors>;
}) {
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState(values?.screenTimeLimitMinutes ? String(values.screenTimeLimitMinutes) : "");
  const [editingBedtime, setEditingBedtime] = useState(false);
  const [bedtimeStartInput, setBedtimeStartInput] = useState(values?.bedtimeStart ?? "21:00");
  const [bedtimeEndInput, setBedtimeEndInput] = useState(values?.bedtimeEnd ?? "07:00");

  const [savingKey, setSavingKey] = useState<string | null>(null);

  const applyChange = async (key: string, data: Partial<RestrictionToggles>) => {
    setSavingKey(key);
    try {
      await onChange(data);
    } catch (e: any) {
      console.error(`[restrictions] failed to save ${key}:`, e?.message || e);
      Alert.alert("Error", "Failed to save this restriction. Please check your connection and try again.");
    } finally {
      setSavingKey(null);
    }
  };

  const saveLimit = () => {
    const trimmed = limitInput.trim();
    if (!trimmed) {
      applyChange("screenTimeLimitMinutes", { screenTimeLimitMinutes: null });
      setEditingLimit(false);
      return;
    }
    const minutes = parseInt(trimmed, 10);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert("Invalid Limit", "Enter a whole number of minutes greater than 0.");
      return;
    }
    applyChange("screenTimeLimitMinutes", { screenTimeLimitMinutes: minutes });
    setEditingLimit(false);
  };

  const saveBedtime = () => {
    if (!TIME_PATTERN.test(bedtimeStartInput) || !TIME_PATTERN.test(bedtimeEndInput)) {
      Alert.alert("Invalid Time", "Enter times in 24-hour HH:MM format, e.g. 21:00.");
      return;
    }
    applyChange("bedtime", { bedtimeStart: bedtimeStartInput, bedtimeEnd: bedtimeEndInput });
    setEditingBedtime(false);
  };

  return (
    <Card variant="outline" style={styles.settingsList} padding={0}>
      <TouchableOpacity
        style={styles.settingsRow}
        onPress={() => {
          setLimitInput(values?.screenTimeLimitMinutes ? String(values.screenTimeLimitMinutes) : "");
          setEditingLimit((v) => !v);
        }}
      >
        <Feather name="clock" size={18} color={colors.foreground} />
        <Body color={colors.foreground} style={styles.settingsLabel}>Screen Time Limit</Body>
        <Caption color={colors.mutedForeground}>
          {values?.screenTimeLimitMinutes ? `${values.screenTimeLimitMinutes} min` : "Off"}
        </Caption>
      </TouchableOpacity>
      {editingLimit && (
        <View style={styles.editableRow}>
          <TextField
            containerStyle={{ flex: 1 }}
            value={limitInput}
            onChangeText={setLimitInput}
            keyboardType="number-pad"
            placeholder="Minutes per day (blank = off)"
          />
          <TouchableOpacity
            style={[styles.editableSaveBtn, { backgroundColor: colors.primary, opacity: savingKey === "screenTimeLimitMinutes" ? 0.5 : 1 }]}
            onPress={saveLimit}
            disabled={savingKey === "screenTimeLimitMinutes"}
          >
            <Feather name="check" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.settingsRow, styles.rowDivider, { borderTopColor: colors.border }]}
        onPress={() => {
          setBedtimeStartInput(values?.bedtimeStart ?? "21:00");
          setBedtimeEndInput(values?.bedtimeEnd ?? "07:00");
          setEditingBedtime((v) => !v);
        }}
      >
        <Feather name="moon" size={18} color={colors.foreground} />
        <Body color={colors.foreground} style={styles.settingsLabel}>Bedtime</Body>
        <Caption color={colors.mutedForeground}>
          {values?.bedtimeStart && values?.bedtimeEnd ? `${values.bedtimeStart}–${values.bedtimeEnd}` : "Off"}
        </Caption>
      </TouchableOpacity>
      {editingBedtime && (
        <View style={styles.editableRow}>
          <TextField containerStyle={{ flex: 1 }} value={bedtimeStartInput} onChangeText={setBedtimeStartInput} placeholder="Start (HH:MM)" />
          <TextField containerStyle={{ flex: 1 }} value={bedtimeEndInput} onChangeText={setBedtimeEndInput} placeholder="End (HH:MM)" />
          <TouchableOpacity
            style={[styles.editableSaveBtn, { backgroundColor: colors.primary, opacity: savingKey === "bedtime" ? 0.5 : 1 }]}
            onPress={saveBedtime}
            disabled={savingKey === "bedtime"}
          >
            <Feather name="check" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editableSaveBtn, { backgroundColor: colors.border, opacity: savingKey === "bedtime" ? 0.5 : 1 }]}
            onPress={() => applyChange("bedtime", { bedtimeStart: null, bedtimeEnd: null })}
            disabled={savingKey === "bedtime"}
          >
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.togglesWrap, styles.rowDivider, { borderTopColor: colors.border }]}>
        <ToggleRow
          label="Block Search Engines"
          value={!!values?.blockSafari}
          onValueChange={(v) => applyChange("blockSafari", { blockSafari: v })}
          disabled={savingKey === "blockSafari"}
        />
        <ToggleRow
          label="Require Parent Approval"
          value={!!values?.requireParentApproval}
          onValueChange={(v) => applyChange("requireParentApproval", { requireParentApproval: v })}
          disabled={savingKey === "requireParentApproval"}
        />
        <ToggleRow
          label="Block New App Installs"
          value={!!values?.blockNewAppInstalls}
          onValueChange={(v) => applyChange("blockNewAppInstalls", { blockNewAppInstalls: v })}
          disabled={savingKey === "blockNewAppInstalls"}
        />
        <ToggleRow
          label="Block Explicit Content"
          value={!!values?.blockExplicitContent}
          onValueChange={(v) => applyChange("blockExplicitContent", { blockExplicitContent: v })}
          disabled={savingKey === "blockExplicitContent"}
        />
      </View>
    </Card>
  );
}

function GeneralAppsSection({ deviceId, colors }: { deviceId: string; colors: ReturnType<typeof useColors> }) {
  const { rules, addRule, updateRule, removeRule } = useDeviceAppRules(deviceId);
  const [adding, setAdding] = useState(false);
  const [bundleId, setBundleId] = useState("");
  const [appName, setAppName] = useState("");

  const handleAdd = async () => {
    if (!bundleId.trim() || !appName.trim()) {
      Alert.alert("Missing Info", "Enter both an app name and its bundle/package id.");
      return;
    }
    try {
      await addRule({ appBundleId: bundleId.trim(), appName: appName.trim() });
      setBundleId("");
      setAppName("");
      setAdding(false);
    } catch {
      Alert.alert("Error", "Failed to add app. Please try again.");
    }
  };

  return (
    <View style={styles.generalApps}>
      <H3 style={{ marginBottom: 0 }}>General Apps</H3>
      <Caption color={colors.mutedForeground}>
        Set accessible/inaccessible time windows per installed app. Storage only — nothing here blocks the app on
        the device yet; there is no on-device enforcement agent.
      </Caption>
      {rules.map((rule) => (
        <Card key={rule.id} variant="outline" style={styles.appRuleCard}>
          <View style={styles.appRuleHeader}>
            <Body color={colors.foreground} style={{ fontFamily: fontFamily.medium }}>{rule.appName}</Body>
            <TouchableOpacity onPress={() => removeRule(rule.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="trash-2" size={14} color={colors.destructive} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.appRuleRow} onPress={() => updateRule(rule.id, { blocked: !rule.blocked })}>
            <Caption color={colors.mutedForeground}>Blocked</Caption>
            <Caption color={colors.foreground}>{rule.blocked ? "On" : "Off"}</Caption>
          </TouchableOpacity>
          <View style={styles.appRuleRow}>
            <Caption color={colors.mutedForeground}>Inaccessible window</Caption>
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              <TextInput
                style={[styles.appRuleTimeInput, { color: colors.foreground, borderColor: colors.primary }]}
                value={rule.restrictedStart ?? ""}
                placeholder="HH:MM"
                placeholderTextColor={colors.mutedForeground}
                onChangeText={(v) => updateRule(rule.id, { restrictedStart: v || null })}
              />
              <TextInput
                style={[styles.appRuleTimeInput, { color: colors.foreground, borderColor: colors.primary }]}
                value={rule.restrictedEnd ?? ""}
                placeholder="HH:MM"
                placeholderTextColor={colors.mutedForeground}
                onChangeText={(v) => updateRule(rule.id, { restrictedEnd: v || null })}
              />
            </View>
          </View>
        </Card>
      ))}
      {adding ? (
        <View style={styles.editableRow}>
          <TextField containerStyle={{ flex: 1 }} value={appName} onChangeText={setAppName} placeholder="App name (e.g. YouTube)" />
          <TextField containerStyle={{ flex: 1 }} value={bundleId} onChangeText={setBundleId} placeholder="Bundle/package id" autoCapitalize="none" />
          <TouchableOpacity style={[styles.editableSaveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}>
            <Feather name="check" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.addAppBtn, { borderColor: colors.border }]} onPress={() => setAdding(true)}>
          <Feather name="plus" size={14} color={colors.primary} />
          <Caption color={colors.primary}>Add App</Caption>
        </TouchableOpacity>
      )}
    </View>
  );
}

const POLICY_FIELD_LABELS: Record<string, string> = {
  family: "family default",
  child: "child default",
  device: "device override",
};

function EffectivePolicySummary({ childId, colors }: { childId: string; colors: ReturnType<typeof useColors> }) {
  const { policy, loading } = useEffectivePolicy(childId);
  if (loading || !policy) return null;

  const rows: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; value: string; source?: string }[] = [
    {
      icon: "clock",
      label: "Screen Time Limit",
      value: policy.screenTimeLimitMinutes.value ? `${policy.screenTimeLimitMinutes.value} min/day` : "No limit",
      source: policy.screenTimeLimitMinutes.source,
    },
    {
      icon: "moon",
      label: "Bedtime",
      value: policy.bedtimeStart.value && policy.bedtimeEnd.value ? `${policy.bedtimeStart.value}–${policy.bedtimeEnd.value}` : "Off",
      source: policy.bedtimeStart.source,
    },
    { icon: "globe", label: "Block Search Engines", value: policy.blockSafari.value ? "On" : "Off", source: policy.blockSafari.sources[0] },
    {
      icon: "check-circle",
      label: "Require Parent Approval",
      value: policy.requireParentApproval.value ? "On" : "Off",
      source: policy.requireParentApproval.sources[0],
    },
    {
      icon: "download",
      label: "Block New App Installs",
      value: policy.blockNewAppInstalls.value ? "On" : "Off",
      source: policy.blockNewAppInstalls.sources[0],
    },
    {
      icon: "alert-triangle",
      label: "Block Explicit Content",
      value: policy.blockExplicitContent.value ? "On" : "Off",
      source: policy.blockExplicitContent.sources[0],
    },
  ];

  return (
    <Card variant="outline" style={styles.settingsList} padding={0}>
      <View style={[styles.effectiveBanner, { backgroundColor: colors.warning + "18" }]}>
        <Feather name="info" size={13} color={colors.warning} />
        <Small style={[styles.effectiveBannerText, { color: colors.warning }]}>Defined here — not yet enforced on this device</Small>
      </View>
      {rows.map((row) => (
        <View key={row.label} style={styles.settingsRow}>
          <Feather name={row.icon} size={18} color={colors.foreground} />
          <View style={styles.effectiveLabelCol}>
            <Body color={colors.foreground}>{row.label}</Body>
            {row.source && POLICY_FIELD_LABELS[row.source] && (
              <Small color={colors.mutedForeground}>from {POLICY_FIELD_LABELS[row.source]}</Small>
            )}
          </View>
          <Caption color={colors.mutedForeground}>{row.value}</Caption>
        </View>
      ))}
    </Card>
  );
}

function DeviceRow({ device, colors, onRename }: {
  device: ApiDevice;
  colors: ReturnType<typeof useColors>;
  onRename: (name: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(device.name);
  const { restrictions, updateRestrictions } = useDeviceRestrictions(device.id);
  const statusMeta = deviceStatusMeta(device);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    try {
      await onRename(name.trim());
      setRenaming(false);
    } catch {
      Alert.alert("Error", "Failed to rename device. Please try again.");
    }
  };

  return (
    <Card variant="outline" style={styles.deviceCard} padding={0}>
      <TouchableOpacity style={styles.deviceHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.8}>
        <Feather name="smartphone" size={18} color={colors.primary} />
        <View style={styles.deviceNameCol}>
          {renaming ? (
            <TextInput
              style={[styles.deviceNameInput, { color: colors.foreground, borderColor: colors.primary, fontFamily: fontFamily.semibold }]}
              value={name}
              onChangeText={setName}
              autoFocus
              onSubmitEditing={handleSaveName}
            />
          ) : (
            <Body color={colors.foreground} style={{ fontFamily: fontFamily.semibold }}>{device.name}</Body>
          )}
          <Small color={colors.mutedForeground}>
            {statusMeta.label === "Online now" ? statusMeta.label : `Last seen ${formatRelativeTime(device.lastSyncedAt)}`}
          </Small>
        </View>
        <Badge label={statusMeta.label} tone={colors[statusMeta.tone]} variant="soft" />
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => (renaming ? handleSaveName() : setRenaming(true))}
        >
          <Feather name={renaming ? "check" : "edit-2"} size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.deviceRestrictions}>
          <RestrictionRows values={restrictions} onChange={updateRestrictions} colors={colors} />
          <GeneralAppsSection deviceId={device.id} colors={colors} />
        </View>
      )}
    </Card>
  );
}

export default function ChildProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { family, removeChild, updateChild, setChildPin } = useFamily();
  const haptics = useHaptics();

  const child = family?.children.find(c => c.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(child?.name ?? "");
  const [ageBand, setAgeBand] = useState<AgeBand>(child?.ageBand ?? "10-13");
  const [settingPin, setSettingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const { policy, updatePolicy } = useChildPolicy(child?.id);
  const { devices, renameDevice } = useChildDevices(child?.id);

  if (!child) { router.back(); return null; }

  const avatarColor = avatarColorForName(child.name);
  const ageBandColor = AGE_BAND_COLORS[child.ageBand] ?? colors.primary;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Name Required", "Please enter a name."); return; }
    try {
      await updateChild(child.id, { name: name.trim(), ageBand });
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch (e: any) {
      console.error("[child] save error:", e?.message || e);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    }
  };

  const handleSetPin = async () => {
    if (!/^\d{4,6}$/.test(newPin)) {
      Alert.alert("Invalid PIN", "PIN must be 4-6 digits.");
      return;
    }
    try {
      await setChildPin(child.id, newPin);
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      setSettingPin(false);
      setNewPin("");
      Alert.alert("PIN Updated", `${child.name} can now log in with this PIN.`);
    } catch (e: any) {
      console.error("[child] set pin error:", e?.message || e);
      Alert.alert("Error", "Failed to update the PIN. Please try again.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Remove Child", `Remove ${child.name} from your family profile?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try {
          await removeChild(child.id);
          router.back();
        } catch (e: any) {
          console.error("[child] delete error:", e?.message || e);
          Alert.alert("Error", "Failed to remove child. Please try again.");
        }
      } },
    ]);
  };

  const guidance: Record<AgeBand, { title: string; text: string }> = {
    "6-9": {
      title: "Ages 6-9: Foundation Building",
      text: "At this age, focus on basic digital safety: no sharing personal information, always asking permission before downloading, and understanding that not everything online is real or true.\n\nRecommended: Cyberbullying Prevention, Healthy Screen Habits",
    },
    "10-13": {
      title: "Ages 10-13: Social Navigation",
      text: "This age group begins social media exploration and gaming. Key topics: understanding social media age limits, online friendship safety, recognizing scams, and building digital footprint awareness.\n\nRecommended: Social Media Readiness, Online Scam Awareness, Digital Footprints",
    },
    "14-17": {
      title: "Ages 14-17: Digital Independence",
      text: "Teens need preparation for greater digital independence. Key topics: understanding online predator tactics, AI literacy, digital reputation management, and privacy in a data-driven world.\n\nRecommended: AI Safety & Literacy, Online Predator Awareness, Digital Footprints",
    },
  };
  const activeGuidance = { ...guidance[child.ageBand], color: AGE_BAND_COLORS[child.ageBand] ?? colors.primary };
  const ageBandSegments = AGE_BANDS.map(b => ({ key: b, label: `Ages ${b}` }));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditing(!editing)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name={editing ? "x" : "edit-2"} size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.profile}>
        <Avatar initial={child.name[0] ?? "?"} color={avatarColor} size={80} />
        {editing ? (
          <TextInput
            style={[styles.nameInput, { color: colors.foreground, borderColor: colors.primary, fontFamily: fontFamily.bold }]}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
          />
        ) : (
          <H1 style={{ marginBottom: 0 }}>{child.name}</H1>
        )}
        <Badge label={`Ages ${child.ageBand}`} tone={ageBandColor} variant="soft" />
      </View>

      {editing && (
        <View style={styles.editSection}>
          <Label>Age Band</Label>
          <SegmentedControl segments={ageBandSegments} value={ageBand} onChange={setAgeBand} />
          <Button title="Save Changes" onPress={handleSave} />
        </View>
      )}

      <View style={styles.infoSection}>
        <H2 style={{ marginBottom: 0 }}>Age-Appropriate Guidance</H2>
        <Card variant="outline" style={[styles.guidanceCard, { backgroundColor: activeGuidance.color + "18", borderColor: activeGuidance.color + "44" }]}>
          <Body style={{ color: activeGuidance.color, fontFamily: fontFamily.semibold }}>{activeGuidance.title}</Body>
          <Body color={colors.foreground}>{activeGuidance.text}</Body>
        </Card>
      </View>

      <View style={styles.infoSection}>
        <H2 style={{ marginBottom: 0 }}>{child.name}&apos;s Default Restrictions</H2>
        <Caption color={colors.mutedForeground}>Applies to {child.name} generally. Individual devices below can be adjusted separately.</Caption>
        <RestrictionRows values={policy} onChange={updatePolicy} colors={colors} />
      </View>

      <View style={styles.infoSection}>
        <H2 style={{ marginBottom: 0 }}>What Currently Applies</H2>
        <Caption color={colors.mutedForeground}>The resolved result of family defaults, {child.name}&apos;s overrides, and any device-specific settings below.</Caption>
        <EffectivePolicySummary childId={child.id} colors={colors} />
      </View>

      <View style={styles.infoSection}>
        <H2 style={{ marginBottom: 0 }}>Devices</H2>
        {devices.length === 0 ? (
          <Caption color={colors.mutedForeground}>No devices registered for {child.name} yet.</Caption>
        ) : (
          devices.map((device) => (
            <DeviceRow
              key={device.id}
              device={device}
              colors={colors}
              onRename={(newName) => renameDevice(device.id, newName)}
            />
          ))
        )}
      </View>

      <View style={styles.conversationSection}>
        <H2 style={{ marginBottom: 0 }}>Conversation Starters</H2>
        {[
          "What's your favorite thing to do online right now?",
          "Has anything ever made you feel uncomfortable online?",
          "Do you know what to do if someone asks for personal information?",
          "How do you decide who you want to be friends with online?",
        ].map(starter => (
          <Card key={starter} variant="outline" style={styles.starterRow}>
            <View style={[styles.starterDot, { backgroundColor: colors.primary }]} />
            <Body color={colors.foreground} style={styles.starterText}>{starter}</Body>
          </Card>
        ))}
      </View>

      <View style={styles.infoSection}>
        <H2 style={{ marginBottom: 0 }}>Login PIN</H2>
        {settingPin ? (
          <View style={styles.editSection}>
            <TextInput
              style={[styles.nameInput, { color: colors.foreground, borderColor: colors.primary, fontFamily: fontFamily.bold, textAlign: "center", letterSpacing: 4 }]}
              value={newPin}
              onChangeText={setNewPin}
              placeholder="••••"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              autoFocus
            />
            <Button title="Save PIN" onPress={handleSetPin} />
          </View>
        ) : (
          <Card variant="outline" pressable onPress={() => setSettingPin(true)} style={styles.starterRow}>
            <Feather name="lock" size={16} color={colors.primary} />
            <Body color={colors.foreground} style={styles.starterText}>
              {child.name} uses this PIN with the family code to log in as themselves. Tap to change it.
            </Body>
          </Card>
        )}
      </View>

      <Button title="Remove from Profile" icon="trash-2" variant="outline" style={{ borderColor: colors.destructive + "44" }} onPress={handleDelete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xxl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  profile: { alignItems: "center", gap: spacing.md },
  nameInput: { fontSize: 26, borderBottomWidth: 2, paddingBottom: spacing.xs, textAlign: "center", minWidth: 150 },
  editSection: { gap: spacing.md },
  settingsList: { overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 1, gap: spacing.md },
  settingsLabel: { flex: 1 },
  rowDivider: { borderTopWidth: 1 },
  togglesWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  effectiveBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  effectiveBannerText: { flexShrink: 1 },
  effectiveLabelCol: { flex: 1, gap: 2 },
  editableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  editableSaveBtn: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  deviceCard: { overflow: "hidden" },
  deviceHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  deviceNameCol: { flex: 1, gap: 2 },
  deviceNameInput: { fontSize: 15, borderBottomWidth: 1.5, paddingBottom: 2 },
  deviceRestrictions: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  generalApps: { marginTop: spacing.md, gap: spacing.sm },
  appRuleCard: { gap: spacing.xs },
  appRuleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  appRuleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  appRuleTimeInput: { width: 64, fontSize: 12, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.xs, paddingVertical: 4, textAlign: "center" },
  addAppBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderWidth: 1, borderStyle: "dashed", borderRadius: radius.md, paddingVertical: spacing.sm },
  infoSection: { gap: spacing.sm },
  guidanceCard: { gap: spacing.sm },
  conversationSection: { gap: spacing.sm },
  starterRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  starterDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  starterText: { flex: 1, lineHeight: 20 },
});
