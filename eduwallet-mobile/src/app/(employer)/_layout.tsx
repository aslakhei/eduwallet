import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/**
 * Tab navigation layout for the employer app.
 */
export default function EmployerTabsLayout() {
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
                name="request-access"
                options={{
                    title: "Request Access",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="key" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="students"
                options={{
                    title: "Students",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="student/[address]"
                options={{
                    href: null, // Hide from tab bar
                }}
            />
        </Tabs>
    );
}

