import { useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useAuth, UserType } from "../providers/AuthenticationProvider";

/**
 * Index page that redirects based on authentication status.
 */
export default function Index() {
  const { student, employer, userType } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure providers are initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === "(auth)";
    const inTabsGroup = firstSegment === "(tabs)";
    const inEmployerGroup = firstSegment === "(employer)";

    // Check if user is authenticated
    const isStudentAuthenticated = userType === UserType.Student && student && student.id !== "";
    const isEmployerAuthenticated = userType === UserType.Employer && employer && employer.accountAddress !== "";

    if (!isStudentAuthenticated && !isEmployerAuthenticated) {
      // Redirect to login if not authenticated
      if (!inAuthGroup) {
        router.replace("/(auth)/login" as any);
      }
    } else if (isStudentAuthenticated) {
      // Redirect to student app if student is authenticated
      if (inAuthGroup || (!inTabsGroup && !inEmployerGroup)) {
        router.replace("/(tabs)" as any);
      }
    } else if (isEmployerAuthenticated) {
      // Redirect to employer app if employer is authenticated
      if (inAuthGroup || (!inEmployerGroup && !inTabsGroup)) {
        router.replace("/(employer)" as any);
      }
    }
  }, [student, employer, userType, segments, router, isReady]);

  // Show loading while routing
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#6c5ce7" />
      <Text style={{ marginTop: 10, color: "#666" }}>Loading...</Text>
    </View>
  );
}
