---
name: Supabase RN URL polyfill
description: How to safely include react-native-url-polyfill in a project that targets both iOS and web.
---

Never do a top-level `import "react-native-url-polyfill/auto"` in a file that is bundled for web. The polyfill crashes on web with a module evaluation error.

**Why:** react-native-url-polyfill patches the global URL/URLSearchParams with a RN-specific implementation. On web, the global already exists and the patch throws.

**How to apply:** Use a conditional require inside the module body, gated on Platform.OS:

```ts
import { Platform } from "react-native";

if (Platform.OS !== "web") {
  require("react-native-url-polyfill/auto");
}
```

This pattern is safe in all Expo targets (iOS, Android, web) because Metro tree-shakes the require away on web builds.
