import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { findNodeHandle, NativeModules, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { Room, RemoteVideoTrack } from "livekit-client";

import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { useColors } from "@/hooks/useColors";
import { Body, Button, Caption, Card, H2, LoadingSpinner } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import {
  apiAcceptScreenShare,
  apiDeclineScreenShare,
  apiEndScreenShare,
  apiGetScreenShare,
  apiGetScreenShareViewerToken,
  type ApiScreenShareRequest,
} from "@/lib/apiClient";
import { loadLiveKit, SCREEN_SHARE_UNAVAILABLE } from "@/lib/screenShare";

// Consent-based live screen viewing (docs/SCREEN_MIRRORING_PLAN.md).
// Parent: waits for the child to accept, then watches. Child: accepts or
// declines, shares, and can stop at any time. Nothing is recorded.

const POLL_MS = 2000;

function formatRemaining(endsAt: string | null): string {
  if (!endsAt) return "";
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useRequest(id: string) {
  const [request, setRequest] = useState<ApiScreenShareRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const { request } = await apiGetScreenShare(id);
      setRequest(request);
      return request;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load this request.");
      return null;
    }
  }, [id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { request, setRequest, error, refresh };
}

// A 1-second tick so the countdown re-renders.
function useTick(active: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
}

export default function ScreenShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  if (!id || !user) return null;
  return user.role === "parent" ? <ParentViewer id={id} /> : <ChildSharer id={id} />;
}

// ── Parent ─────────────────────────────────────────────────────────────────────

function ParentViewer({ id }: { id: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { family } = useFamily();
  const { request, setRequest, error, refresh } = useRequest(id);
  const [track, setTrack] = useState<RemoteVideoTrack | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const childName = family?.children.find((c) => c.id === request?.childId)?.name ?? "Your child";
  const status = request?.status;
  useTick(status === "accepted");

  // Wait for the child's answer.
  useEffect(() => {
    if (status !== "requested") return;
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [status, refresh]);

  // Once accepted: connect watch-only and show the child's screen track.
  useEffect(() => {
    if (status !== "accepted" || roomRef.current) return;
    const lk = loadLiveKit();
    if (!lk) {
      setConnectError(SCREEN_SHARE_UNAVAILABLE);
      return;
    }
    const { Room, RoomEvent, Track } = lk.client;
    let cancelled = false;
    (async () => {
      try {
        const { livekit } = await apiGetScreenShareViewerToken(id);
        if (cancelled) return;
        const room = new Room({ adaptiveStream: true });
        roomRef.current = room;
        room.on(RoomEvent.TrackSubscribed, (t) => {
          if (t.source === Track.Source.ScreenShare) setTrack(t as RemoteVideoTrack);
        });
        room.on(RoomEvent.TrackUnsubscribed, (t) => {
          if (t.source === Track.Source.ScreenShare) setTrack(null);
        });
        room.on(RoomEvent.Disconnected, () => {
          setTrack(null);
          void refresh();
        });
        await room.connect(livekit.url, livekit.token);
      } catch (e) {
        setConnectError(e instanceof Error ? e.message : "Couldn't connect to the live view.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, id, refresh]);

  // While watching, notice when the child stops or time runs out.
  useEffect(() => {
    if (status !== "accepted") return;
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [status, refresh]);

  useEffect(() => {
    if (status && status !== "requested" && status !== "accepted") {
      void roomRef.current?.disconnect();
      roomRef.current = null;
    }
  }, [status]);

  useEffect(() => () => void roomRef.current?.disconnect(), []);

  const end = async () => {
    try {
      const { request } = await apiEndScreenShare(id);
      setRequest(request);
    } catch {
      // the server ends the session on its own when time runs out
    }
    void roomRef.current?.disconnect();
    roomRef.current = null;
  };

  const lk = loadLiveKit();
  const VideoView = lk?.rn.VideoView;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.header}>
        <Button title="Close" variant="ghost" size="sm" fullWidth={false} icon="x" onPress={() => router.back()} />
        {status === "accepted" && <Caption color={colors.mutedForeground}>Ends in {formatRemaining(request?.sessionEndsAt ?? null)}</Caption>}
      </View>

      {error || connectError ? (
        <Card variant="outline" style={styles.center}>
          <Body color={colors.destructive}>{connectError ?? error}</Body>
        </Card>
      ) : !request ? (
        <View style={styles.center}><LoadingSpinner /></View>
      ) : status === "requested" ? (
        <View style={styles.center}>
          <LoadingSpinner />
          <H2 style={styles.centerText}>Waiting for {childName}</H2>
          <Body color={colors.mutedForeground} style={styles.centerText}>
            {childName} needs to accept on their phone. The request expires in 2 minutes.
          </Body>
          <Button title="Cancel request" variant="secondary" onPress={end} />
        </View>
      ) : status === "accepted" ? (
        <View style={styles.viewer}>
          {track && VideoView ? (
            <VideoView videoTrack={track} style={styles.video} objectFit="contain" />
          ) : (
            <View style={styles.center}>
              <LoadingSpinner />
              <Body color={colors.mutedForeground} style={styles.centerText}>
                {childName} accepted. Waiting for them to start sharing…
              </Body>
            </View>
          )}
          <Button title="Stop viewing" icon="square" variant="destructive" onPress={end} />
        </View>
      ) : (
        <View style={styles.center}>
          <Feather name={status === "declined" ? "x-circle" : "check-circle"} size={40} color={colors.mutedForeground} />
          <H2 style={styles.centerText}>
            {status === "declined" ? `${childName} declined` : status === "expired" ? "No answer" : "Session ended"}
          </H2>
          <Body color={colors.mutedForeground} style={styles.centerText}>
            {status === "declined"
              ? "They chose not to share their screen right now."
              : status === "expired"
                ? `${childName} didn't respond in time.`
                : "The screen view has ended."}
          </Body>
          <Button title="Done" onPress={() => router.back()} />
        </View>
      )}
    </View>
  );
}

// ── Child ──────────────────────────────────────────────────────────────────────

function ChildSharer({ id }: { id: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { family } = useFamily();
  const { request, setRequest, error, refresh } = useRequest(id);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const pickerRef = useRef<View>(null);
  const parentName = family?.parents.find((p) => p.id === request?.parentId)?.name ?? "Your parent";
  const status = request?.status;
  useTick(status === "accepted");

  const lk = loadLiveKit();
  const Picker = Platform.OS === "ios" ? lk?.webrtc.ScreenCapturePickerView : undefined;

  const stopLocal = useCallback(async () => {
    try {
      await roomRef.current?.localParticipant.setScreenShareEnabled(false);
    } catch {
      // already stopped
    }
    void roomRef.current?.disconnect();
    roomRef.current = null;
    setSharing(false);
  }, []);

  // Notice when the parent stops viewing or time runs out.
  useEffect(() => {
    if (status !== "accepted") return;
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [status, refresh]);

  useEffect(() => {
    if (status && status !== "requested" && status !== "accepted") void stopLocal();
  }, [status, stopLocal]);

  useEffect(() => () => void stopLocal(), [stopLocal]);

  const accept = async () => {
    if (!lk) {
      setActionError(SCREEN_SHARE_UNAVAILABLE);
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const { request, livekit } = await apiAcceptScreenShare(id);
      setRequest(request);
      const { Room, RoomEvent, Track } = lk.client;
      const room = new Room();
      roomRef.current = room;
      room.on(RoomEvent.Disconnected, () => {
        setSharing(false);
        void refresh();
      });
      // Sharing stopped from the system UI (Control Center / notification).
      room.on(RoomEvent.LocalTrackUnpublished, (pub) => {
        if (pub.source === Track.Source.ScreenShare) void end();
      });
      await room.connect(livekit.url, livekit.token);
      if (Platform.OS === "ios") {
        // Apple requires the child to tap the system broadcast button.
        const tag = findNodeHandle(pickerRef.current);
        await NativeModules.LKRNScreenCapturePickerViewManager?.show(tag);
      }
      await room.localParticipant.setScreenShareEnabled(true);
      setSharing(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't start sharing.");
      void refresh();
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      const { request } = await apiDeclineScreenShare(id);
      setRequest(request);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    await stopLocal();
    try {
      const { request } = await apiEndScreenShare(id);
      setRequest(request);
    } catch {
      void refresh();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
      {/* The iOS broadcast picker must be in the view tree (it stays invisible). */}
      {Picker ? (
        <View style={styles.hiddenPicker} pointerEvents="none">
          <Picker ref={pickerRef as never} />
        </View>
      ) : null}

      {error ? (
        <Card variant="outline" style={styles.center}><Body color={colors.destructive}>{error}</Body></Card>
      ) : !request ? (
        <View style={styles.center}><LoadingSpinner /></View>
      ) : status === "requested" ? (
        <View style={styles.center}>
          <Feather name="monitor" size={44} color={colors.primary} />
          <H2 style={styles.centerText}>{parentName} wants to see your screen</H2>
          <Body color={colors.mutedForeground} style={styles.centerText}>
            If you say yes, {parentName} can see what&apos;s on your screen live until you stop sharing, for up to 15 minutes. Nothing is recorded.
          </Body>
          {actionError && <Body color={colors.destructive} style={styles.centerText}>{actionError}</Body>}
          <Button title="Accept and share" icon="check" onPress={accept} loading={busy} disabled={busy} />
          <Button title="Not now" variant="secondary" onPress={decline} disabled={busy} />
        </View>
      ) : status === "accepted" ? (
        <View style={styles.center}>
          <View style={[styles.liveBanner, { backgroundColor: colors.destructive }]}>
            <Feather name="eye" size={18} color="#fff" />
            <Body color="#fff">{sharing ? `${parentName} can see your screen` : "Starting…"}</Body>
          </View>
          <Caption color={colors.mutedForeground}>Ends in {formatRemaining(request.sessionEndsAt)}</Caption>
          {actionError && <Body color={colors.destructive} style={styles.centerText}>{actionError}</Body>}
          <Button title="Stop sharing" icon="square" variant="destructive" onPress={end} />
          <Caption color={colors.mutedForeground} style={styles.centerText}>
            You can also stop from your phone&apos;s screen recording indicator at any time.
          </Caption>
        </View>
      ) : (
        <View style={styles.center}>
          <Feather name="check-circle" size={40} color={colors.mutedForeground} />
          <H2 style={styles.centerText}>{status === "declined" ? "You said not now" : status === "expired" ? "Request expired" : "Sharing ended"}</H2>
          <Button title="Done" onPress={() => router.back()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  centerText: { textAlign: "center" },
  viewer: { flex: 1, gap: spacing.md },
  video: { flex: 1, backgroundColor: "#000", borderRadius: 12 },
  liveBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 999 },
  hiddenPicker: { width: 1, height: 1, opacity: 0, position: "absolute" },
});
