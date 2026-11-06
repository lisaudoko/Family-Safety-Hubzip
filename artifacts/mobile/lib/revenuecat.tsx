import React, { createContext, useContext, useEffect, useRef } from "react";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useAuth } from "@/context/AuthContext";
import { apiSyncPurchases } from "@/lib/apiClient";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "premium";

// Returns the key for this platform/build, or null when none is configured. A
// missing key must never crash the app: subscriptions are simply unavailable.
function getRevenueCatApiKey(): string | null {
  // Use Test Store key for dev, web, and store client
  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY ?? null;
  }
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY ?? null;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY ?? null;
  return REVENUECAT_TEST_API_KEY ?? null;
}

let revenueCatConfigured = false;

export function initializeRevenueCat() {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) return;

  if (__DEV__) Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  revenueCatConfigured = true;
}

function useSubscriptionContext() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  // Purchases must be attributed to the family, not an anonymous RevenueCat id,
  // so the server (and webhook) can map them back. Only parents buy; children
  // never log in here.
  const loginRef = useRef<Promise<unknown>>(Promise.resolve());
  const isParent = user?.role === "parent";
  const familyId = isParent ? user?.familyId : undefined;

  useEffect(() => {
    if (!revenueCatConfigured) return;
    loginRef.current = (familyId
      ? Purchases.logIn(familyId)
      : Purchases.logOut()
    )
      .catch(() => undefined) // logOut on an anonymous user throws; harmless
      .then(() => queryClient.invalidateQueries({ queryKey: ["revenuecat"] }));
  }, [familyId, queryClient]);

  // Ask the server to verify with RevenueCat, then reload the user so premium
  // gating (which reads the server-provided tier) updates.
  const syncWithServer = async () => {
    await apiSyncPurchases();
    await refreshUser();
  };

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async () => {
      const info = await Purchases.getCustomerInfo();
      return info;
    },
    staleTime: 60 * 1000,
    enabled: revenueCatConfigured,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      const offerings = await Purchases.getOfferings();
      return offerings;
    },
    staleTime: 300 * 1000,
    enabled: revenueCatConfigured,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: any) => {
      await loginRef.current;
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
    onSuccess: async () => {
      await syncWithServer().catch(() => undefined);
      await customerInfoQuery.refetch();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      return Purchases.restorePurchases();
    },
    onSuccess: async () => {
      await syncWithServer().catch(() => undefined);
      await customerInfoQuery.refetch();
    },
  });

  const isSubscribed =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}