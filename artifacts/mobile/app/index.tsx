import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const colors = useColors();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  if (!user?.hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
