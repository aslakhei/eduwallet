import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import AuthenticationProvider from '../providers/AuthenticationProvider';
import UniversitiesProvider from '../providers/UniversitiesProvider';
import EmployersProvider from '../providers/EmployersProvider';
import PermissionsProvider from '../providers/PermissionsProvider';
import MessagesProvider from '../providers/MessagesProvider';
import MessageDisplay from '../components/MessageDisplay';

/**
 * Root layout component that sets up providers and navigation.
 */
export default function RootLayout() {
  return (
    <MessagesProvider>
      <AuthenticationProvider>
        <UniversitiesProvider>
          <EmployersProvider>
            <PermissionsProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(employer)" />
                <Stack.Screen 
                  name="course/[code]" 
                  options={{ 
                    presentation: 'card',
                    headerShown: false 
                  }} 
                />
              </Stack>
              <MessageDisplay />
              <StatusBar style="dark" />
            </PermissionsProvider>
          </EmployersProvider>
        </UniversitiesProvider>
      </AuthenticationProvider>
    </MessagesProvider>
  );
}
