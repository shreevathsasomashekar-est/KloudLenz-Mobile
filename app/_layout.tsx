import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import { F, T } from "../constants/theme";
import { storeFCMToken } from "../services/fcmTokenManager";
import {
  generateFCMToken,
  setupNotificationHandler,
} from "../services/fcmTokenService";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Generate FCM token on app startup and store temporarily
  useEffect(() => {
    const initializeFCMToken = async () => {
      try {
        console.log("🚀 App started - Initializing FCM token...");

        // Setup notification handler first
        setupNotificationHandler();
        console.log("✅ Notification handler configured");

        const fcmResult = await generateFCMToken();

        if (fcmResult.success && fcmResult.token) {
          console.log("✅ FCM Token generated on app startup:");
          console.log("📋 Token:", fcmResult.token);

          // Store token in memory (will be sent to backend after login)
          storeFCMToken(fcmResult.token);
          console.log("⏳ Token will be registered after user login");
        } else {
          console.warn("⚠️ FCM Token generation failed:", fcmResult.error);
        }
      } catch (error) {
        console.error("❌ Error during FCM token initialization:", error);
      }
    };

    // Setup notification listeners
    const setupNotificationListeners = () => {
      // Listener for notifications received while app is foregrounded
      notificationListener.current =
        Notifications.addNotificationReceivedListener((notification) => {
          console.log("🔔 Notification received in foreground:", notification);
          const { title, body } = notification.request.content;

          // Show alert when notification received while app is open
          if (Platform.OS === "android") {
            Alert.alert(
              title || "New Notification",
              body || "You have a new notification",
              [{ text: "OK" }],
            );
          }
        });

      // Listener for user interaction with notification
      responseListener.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
          console.log("👆 User tapped on notification:", response);
          const { title, body, data } = response.notification.request.content;

          // Handle notification tap - you can navigate to specific screens here
          console.log("Notification data:", data);

          const approvalId = data?.approvalId ?? data?.id;
          if (approvalId) {
            router.push({
              pathname: "/(dashboard)/[id]",
              params: { id: String(approvalId) },
            });
          }
        });

      console.log("✅ Notification listeners registered");
    };

    // Call token generation without blocking rendering
    initializeFCMToken();
    setupNotificationListeners();

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []); // Empty dependency array - runs only once on mount

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar />
      <Stack
        screenOptions={{
          headerShown: true,
          headerTintColor: T.brand,
          headerTitleStyle: {
            fontFamily: F.semibold,
            color: T.brand,
          },
          contentStyle: { backgroundColor: T.pageBg },
        }}
      >
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(dashboard)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
