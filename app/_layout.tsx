import { useEffect } from "react";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { queryClient } from "@/utils/queryClient";
import { View, ActivityIndicator } from "react-native";
import { COLORS } from "@/constants";
import { userService } from "@/services/supabase.service";
import { useAuthStore } from "@/store";

// Secure token cache for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  async clearToken(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

// Inner layout that handles auth redirection + Supabase user sync
function AuthGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const segments = useSegments();
  const router = useRouter();
  const { setUser, clearUser } = useAuthStore();

  // ─── Clerk → Supabase bridge ──────────────────────────────
  // Every time Clerk reports a signed-in user, upsert them into
  // the Supabase `users` table and populate the auth store.
  // This ensures user.id is a valid Supabase UUID everywhere.
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && clerkUser) {
      const email =
        clerkUser.primaryEmailAddress?.emailAddress ||
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        "";
      const name =
        `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
        clerkUser.username ||
        "Traveler";
      const avatarUrl = clerkUser.imageUrl || undefined;

      // Upsert into Supabase and populate store
      userService
        .upsertUser(clerkUser.id, email, name, avatarUrl)
        .then((supabaseUser) => {
          setUser(supabaseUser);
        })
        .catch((err) => {
          console.warn("[AuthBridge] upsertUser failed:", err?.message);
        });
    } else if (!isSignedIn) {
      clearUser();
    }
  }, [isLoaded, isSignedIn, clerkUser?.id]);

  // ─── Route guard ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    }
  }, [isLoaded, isSignedIn, segments]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="trip/results"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="place/[id]"
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="post/create"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="post/[id]"
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="list/index"
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="list/create"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="list/[id]"
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="route-community/[id]"
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="leaderboard"
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="search"
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="light" backgroundColor={COLORS.background} />
          <AuthGuard />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

