---
name: Expo Router Entry Point
description: Every Expo Router app needs app/index.tsx as the root entry — missing it causes a blank white screen at /.
---

# Expo Router Entry Point

**Rule:** Always create `app/index.tsx` as the starting route for an Expo Router app.

**Why:** Without `app/index.tsx`, navigating to the root URL `/` finds no matching route and renders a blank white screen. The Stack in `_layout.tsx` needs a route to display.

**How to apply:** For auth-gated apps, make `app/index.tsx` the auth gate:

```tsx
import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <View style={{ flex: 1, backgroundColor: "#F8F6F1" }} />;
  if (!isAuthenticated) return <Redirect href="/welcome" />;
  if (!user?.hasCompletedOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
```

Don't put auth redirect logic in `_layout.tsx` with `useSegments` — it creates timing issues and can cause redirect loops.
