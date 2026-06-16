import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: "#F8F6F1" }} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  if (!user?.hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
