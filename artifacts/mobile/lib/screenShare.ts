import { Platform } from "react-native";

// LiveKit is loaded lazily: its native WebRTC module only exists in development
// and store builds, not in Expo Go (used on Replit) or on web. Requiring it at
// startup there would crash the app, so screens ask `loadLiveKit()` and show a
// "not available on this build" message when it returns null.

type LiveKitRN = typeof import("@livekit/react-native");
type LiveKitClient = typeof import("livekit-client");
type WebRTC = typeof import("@livekit/react-native-webrtc");

export interface LiveKitModules {
  rn: LiveKitRN;
  client: LiveKitClient;
  webrtc: WebRTC;
}

let cached: LiveKitModules | null | undefined;

export function loadLiveKit(): LiveKitModules | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === "web") return (cached = null);
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const rn = require("@livekit/react-native") as LiveKitRN;
    const webrtc = require("@livekit/react-native-webrtc") as WebRTC;
    // Must run before livekit-client is loaded (it installs WebRTC globals).
    rn.registerGlobals();
    const client = require("livekit-client") as LiveKitClient;
    /* eslint-enable @typescript-eslint/no-require-imports */
    cached = { rn, client, webrtc };
  } catch {
    cached = null;
  }
  return cached;
}

export const SCREEN_SHARE_UNAVAILABLE =
  "Live screen viewing isn't available in this version of the app. Please update Digital Village.";
