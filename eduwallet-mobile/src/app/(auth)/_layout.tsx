import { Stack } from "expo-router";

/**
 * Layout for authentication routes (login, etc.)
 */
export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
        </Stack>
    );
}

