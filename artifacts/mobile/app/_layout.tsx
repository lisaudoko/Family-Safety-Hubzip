import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AccessibilityProvider, useAccessibility } from "@/context/AccessibilityContext";
import { FamilyProvider } from "@/context/FamilyContext";
import { CoachProvider } from "@/context/CoachContext";
import { configureApiBase } from "@/lib/apiClient";
import { configureApi } from "@/lib/api";
import { useDeviceSync, useForegroundScreenTime } from "@/lib/deviceSync";
import { initializeRevenueCat } from "@/lib/revenuecat";
import { SubscriptionProvider } from "@/lib/revenuecat";

SplashScreen.preventAutoHideAsync();

configureApiBase();
configureApi();
try {
  initializeRevenueCat();
} catch (err: any) {
  console.warn("RevenueCat init failed:", err?.message);
}
const queryClient = new QueryClient();

function AuthRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready || isLoading) return;
    const inAuthGroup = pathname === "/(tabs)" || pathname.startsWith("/(tabs)/");
    const inWelcome = pathname === "/welcome";
    const inLogin = pathname === "/login";
    const inRegister = pathname === "/register";
    const inOnboarding = pathname === "/onboarding";
    const inForgotPassword = pathname === "/forgot-password";
    const inChildLogin = pathname === "/child-login";
    const inAuthFlow = inWelcome || inLogin || inRegister || inOnboarding || inForgotPassword || inChildLogin;

    if (!isAuthenticated && !inAuthFlow) {
      router.replace("/welcome");
    } else if (isAuthenticated && !user?.hasCompletedOnboarding && !inOnboarding) {
      router.replace("/onboarding");
    } else if (isAuthenticated && user?.hasCompletedOnboarding && inAuthFlow) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, user, pathname, ready]);

  return null;
}

function RootLayoutNav() {
  const { settings } = useAccessibility();
  const { isAuthenticated } = useAuth();
  const slide = settings.reduceMotion ? "none" : "slide_from_right";
  const fade = settings.reduceMotion ? "none" : "fade";

  useDeviceSync(isAuthenticated);
  useForegroundScreenTime(isAuthenticated);

  return (
    <>
      <AuthRedirect />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: fade }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="register" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="child-login" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="course/[id]" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="lesson/[id]" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="quiz/[id]" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="child/[id]" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="agreement" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="subscription" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="challenge/[id]" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="coach/history" options={{ headerShown: false, animation: slide }} />
        <Stack.Screen name="settings/accessibility" options={{ headerShown: false, animation: slide }} />
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
                <SubscriptionProvider>
                  <AccessibilityProvider>
                    <FamilyProvider>
                      <CoachProvider>
                        <RootLayoutNav />
                      </CoachProvider>
                    </FamilyProvider>
                  </AccessibilityProvider>
                </SubscriptionProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
