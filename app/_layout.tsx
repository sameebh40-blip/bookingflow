import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;


SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function RoleRouter() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    if (!segments || (segments as string[]).length === 0) return; // guard null/empty
    const isPartner = profile?.role === 'shop_owner' || profile?.role === 'barber';
    const inPartner = segments[0] === '(partner)';
    const inTabs = segments[0] === '(tabs)';

    console.log('[RoleRouter] profile role:', profile?.role, 'segments:', segments[0], 'isPartner:', isPartner);

    // Only enforce the role boundary at the TOP-LEVEL group. Shared routes
    // (chat, venue, booking, barber, wallet, appointment, …) are open to
    // everyone, so we must NOT bounce a partner away from them — doing that was
    // why tapping a chat kicked shop-owner accounts back to the dashboard.
    if (isPartner && inTabs) {
      const hasShop = !!profile?.shop_id;
      console.log('[RoleRouter] Partner in customer tabs → redirecting to partner area');
      router.replace(hasShop ? '/(partner)' : '/(partner)/setup');
    } else if (profile && !isPartner && inPartner) {
      console.log('[RoleRouter] Customer in partner area, redirecting to tabs');
      router.replace('/(tabs)' as never);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading, segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const MadarDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: '#C9A84C',
      background: '#0A0A0F',
      card: '#13131A',
      text: '#F0EDE8',
      border: 'rgba(240,237,232,0.08)',
      notification: '#E85454',
    },
  };

  const MadarLightTheme: Theme = {
    ...DefaultTheme,
    colors: {
      primary: '#C9A84C',
      background: '#0A0A0F',
      card: '#13131A',
      text: '#F0EDE8',
      border: 'rgba(240,237,232,0.08)',
      notification: '#E85454',
    },
  };

  return (
    <DevErrorBoundary>
      <StatusBar style="light" animated />
      <ThemeProvider value={colorScheme === "dark" ? MadarDarkTheme : MadarLightTheme}>
        <SafeAreaProvider>
          <AuthProvider>
            <NotificationProvider>
              <WidgetProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <RoleRouter />
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="(partner)" options={{ headerShown: false }} />
                    <Stack.Screen name="auth" options={{ headerShown: false }} />
                    <Stack.Screen name="venue/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="booking/services" options={{ headerShown: false }} />
                    <Stack.Screen name="booking/staff" options={{ headerShown: false }} />
                    <Stack.Screen name="booking/datetime" options={{ headerShown: false }} />
                    <Stack.Screen name="booking/confirm" options={{ headerShown: false }} />
                    <Stack.Screen name="chat/[venueId]" options={{ headerShown: false }} />
                    <Stack.Screen name="favourites" options={{ headerShown: false }} />
                    <Stack.Screen name="wallet" options={{ headerShown: false }} />
                    <Stack.Screen name="settings" options={{ headerShown: false }} />
                    <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
                    <Stack.Screen name="reels" options={{ headerShown: false }} />
                    <Stack.Screen name="search-modal" options={{ headerShown: false, presentation: 'modal' }} />
                    <Stack.Screen name="filter-amenities" options={{ headerShown: false, presentation: 'formSheet' }} />
                    <Stack.Screen name="filter-options" options={{ headerShown: false, presentation: 'formSheet' }} />
                    <Stack.Screen name="filter-service-type" options={{ headerShown: false, presentation: 'formSheet' }} />
                    <Stack.Screen name="map-search" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="top-barbers" options={{ headerShown: false }} />
                    <Stack.Screen name="barber/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="appointment/[id]" options={{ headerShown: false }} />
                  </Stack>
                  <SystemBars style="light" />
                </GestureHandlerRootView>
              </WidgetProvider>
            </NotificationProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
