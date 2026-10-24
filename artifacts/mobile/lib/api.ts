import { Platform } from "react-native";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { getToken } from "@/lib/apiClient";

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

  setAuthTokenGetter(getToken);
}
