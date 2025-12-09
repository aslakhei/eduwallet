import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useState } from "react";
import { useAuth } from "../../providers/AuthenticationProvider";
import { useMessages, MessageType } from "../../providers/MessagesProvider";

/**
 * Employer home page displaying employer information and quick actions.
 */
export default function EmployerHomePage() {
    const { employer, logout, refreshEmployer } = useAuth();
    const { showMessage } = useMessages();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshEmployer();
            showMessage("Information refreshed", MessageType.Success);
        } catch (error) {
            console.error("Failed to refresh employer data:", error);
            showMessage("Failed to refresh data", MessageType.Error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <View style={styles.content}>
                <Text style={styles.title}>Employer Dashboard</Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Company Information</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Company Name:</Text>
                        <Text style={styles.infoValue}>{employer.companyName || "N/A"}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Country:</Text>
                        <Text style={styles.infoValue}>{employer.country || "N/A"}</Text>
                    </View>
                    {employer.contactInfo && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Contact:</Text>
                            <Text style={styles.infoValue}>{employer.contactInfo}</Text>
                        </View>
                    )}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Account Address:</Text>
                        <Text style={[styles.infoValue, styles.address]}>{employer.accountAddress}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Quick Actions</Text>
                    <Text style={styles.cardDescription}>
                        Use the tabs below to request access to student records or view students you have access to.
                    </Text>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 24,
        color: "#333",
    },
    card: {
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
        color: "#333",
    },
    cardDescription: {
        fontSize: 14,
        color: "#666",
        lineHeight: 20,
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 12,
        flexWrap: "wrap",
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        width: 120,
    },
    infoValue: {
        fontSize: 14,
        color: "#333",
        flex: 1,
    },
    address: {
        fontFamily: "monospace",
        fontSize: 12,
    },
    logoutButton: {
        backgroundColor: "#e74c3c",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
        marginTop: 20,
    },
    logoutButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});

