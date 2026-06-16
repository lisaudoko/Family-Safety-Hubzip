import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FamilyProvider } from "@/context/FamilyContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(tabs)";
    const inWelcome = segments[0] === "welcome";
    const inLogin = segments[0] === "login";
    const inRegister = segments[0] === "register";
    const inOnboarding = segments[0] === "onboarding";
    const inAuthFlow = inWelcome || inLogin || inRegister || inOnboarding;

    if (!isAuthenticated && !inAuthFlow) {
      router.replace("/welcome");
    } else if (isAuthenticated && !user?.hasCompletedOnboarding && !inOnboarding) {
      router.replace("/onboarding");
    } else if (isAuthenticated && user?.hasCompletedOnboarding && inAuthFlow) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, user, segments]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthRedirect />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="register" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="course/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="lesson/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="quiz/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="child/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="agreement" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="subscription" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="challenge/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <FamilyProvider>
                  <RootLayoutNav />
                </FamilyProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
