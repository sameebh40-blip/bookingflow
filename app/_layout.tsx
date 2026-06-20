import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
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
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

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
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
