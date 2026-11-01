import { DarkTheme, ThemeProvider as NavigationThemeProvider } from "expo-router/react-navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, type PropsWithChildren } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppStoreProvider } from "@/lib/app-store";
import { PerformAuthProvider, usePerformAuth } from "@/lib/perform-auth";
import { MacgyverBridge } from "@/components/macgyver-bridge";
import { ThemeProvider } from "@/lib/theme-provider";
import { PrivateRouteBoundary } from "@/components/private-route-boundary";
import { createTRPCClient, trpc } from "@/lib/trpc";

import "../global.css";

export const unstable_settings = { initialRouteName: "(tabs)" };

function AccountStore({ children }: PropsWithChildren) {
  const { account, ready } = usePerformAuth();
  if (!ready) return <View style={{flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#050811"}}><ActivityIndicator accessibilityLabel="Loading account" /></View>;
  return <AppStoreProvider key={account?.id ?? "guest"} accountId={account?.id ?? null}>{children}</AppStoreProvider>;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <NavigationThemeProvider value={DarkTheme}>
              <PerformAuthProvider>
                <AccountStore>
                <PrivateRouteBoundary>
                <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: "#050811" } }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="login" options={{ presentation: "modal" }} />
                  <Stack.Screen name="register" options={{ presentation: "modal" }} />
                  <Stack.Screen name="admin-subscriptions" options={{ presentation: "modal" }} />
                  <Stack.Screen name="script/new" options={{ presentation: "modal" }} />
                  <Stack.Screen name="rehearse" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="results" />
                  <Stack.Screen name="payments" options={{ presentation: "modal" }} />
                  <Stack.Screen name="practice-questions" />
                  <Stack.Screen name="audience-simulation" />
                </Stack>
                </PrivateRouteBoundary>
                <MacgyverBridge />
                <StatusBar style="light" />
                </AccountStore>
              </PerformAuthProvider>
            </NavigationThemeProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
