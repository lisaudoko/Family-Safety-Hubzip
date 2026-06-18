import { Platform } from "react-native";
import { setBaseUrl } from "@workspace/api-client-react";

let configured = false;

export function configureApi() {
  if (configured) return;
  configured = true;

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    setBaseUrl(`https://${domain}`);
  } else if (Platform.OS === "web") {
    setBaseUrl(null);
  }
}
