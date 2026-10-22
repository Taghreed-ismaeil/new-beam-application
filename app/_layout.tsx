import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { Stack, useGlobalSearchParams, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { StaffProvider } from "@/context/StaffContext";
import { AppLangProvider } from "@/lib/app-lang";
import { ARABIC_FONTS } from "@/lib/arabic-font";
import { I18nProvider } from "@/lib/i18n";
import BottomTabBar from "@/components/BottomTabBar/BottomTabBar";
import IntroVideo from "@/components/IntroVideo";
import { preloadLoyalty } from "@/lib/preload";
import { screenAnimationFor } from "@/lib/tab-transition";

export const unstable_settings = { anchor: "(tabs)" };

// IntroVideo hides the splash once the intro's first frame is on screen, so the
// app never shows a blank screen while the video loads.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 250 });

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const { returnTo } = useGlobalSearchParams<{ returnTo?: string }>();

  // Customers sign in once, right at launch: anyone without a saved session is
  // sent to /login (it sits under the intro video, so it shows as the clip fades).
  // Staff routes have their own login and are left alone.
  useEffect(() => {
    if (loading) return;
    const onLoginScreen = segments[0] === "login";
    if (!user && !onLoginScreen && segments[0] !== "admin") {
      router.replace("/login");
    } else if (user && onLoginScreen) {
      if (returnTo === "back" && router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  // Warm the Gifts page (progress, vouchers, tile images) as soon as we know who is signed in.
  useEffect(() => {
    if (user) preloadLoyalty(user.id);
  }, [user]);

  if (loading) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Bundled font files load in a few ms; the native splash stays up until then,
  // so Arabic never flashes in the system font first.
  const [fontsLoaded, fontError] = useFonts(ARABIC_FONTS);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nProvider>
        <AppLangProvider>
        <StaffProvider>
          <AuthProvider>
            <CartProvider>
              <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
                <AuthGate>
                  <Stack
                    screenOptions={({ route }) => ({
                      headerShown: false,
                      animation: screenAnimationFor(route.name),
                      animationTypeForReplace: "push",
                    })}
                  >
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="admin" />
                  </Stack>
                  <BottomTabBar />
                </AuthGate>
                <StatusBar style="auto" />
                <IntroVideo />
              </ThemeProvider>
            </CartProvider>
          </AuthProvider>
        </StaffProvider>
        </AppLangProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );
}
