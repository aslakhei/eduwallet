import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/**
 * Tab navigation layout for the main app.
 */
export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "#6c5ce7",
                headerShown: true,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="student"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="permissions"
                options={{
                    title: "Permissions",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="shield" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

