// iOS Broadcast Upload Extension for live screen viewing
// (docs/SCREEN_MIRRORING_PLAN.md). The child taps the system broadcast button,
// iOS starts this extension, and it hands screen frames to the Digital Village
// app over a socket in the shared App Group; the app streams them via LiveKit.
//
// @kingstinct/expo-apple-targets has no "broadcast upload" type, so this uses a
// generic app-extension type that adds no frameworks or special build settings;
// the Info.plist in this folder (kept as-is by the plugin) declares the real
// extension point, com.apple.broadcast-services-upload.
//
// Bundle ID: com.iriemom.digitalvillage.ScreenBroadcast (must exist in the
// Apple Developer portal with the App Group below). Must match
// RTCScreenSharingExtension in app.json.

/** @type {import('@kingstinct/expo-apple-targets/build/config-plugin').ConfigFunction} */
module.exports = () => ({
  type: "notification-service",
  name: "ScreenBroadcast",
  bundleIdentifier: ".ScreenBroadcast",
  deploymentTarget: "16.0",
  frameworks: ["ReplayKit"],
  entitlements: {
    "com.apple.security.application-groups": ["group.com.iriemom.digitalvillage"],
  },
});
