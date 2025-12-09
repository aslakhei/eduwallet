import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "../../providers/AuthenticationProvider";

/**
 * StudentPage component displays the student's personal information.
 */
export default function StudentPage() {
    const { student } = useAuth();

    if (!student || student.id === "") {
        return (
            <View style={styles.container}>
                <Text>Please log in to view your profile.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Your Profile</Text>

            <View style={styles.section}>
                <Text style={styles.label}>ID</Text>
                <Text style={styles.value}>{student.id || "N/A"}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>
                    {student.name} {student.surname}
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Date of Birth</Text>
                <Text style={styles.value}>{student.birthDate || "N/A"}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Place of Birth</Text>
                <Text style={styles.value}>{student.birthPlace || "N/A"}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Country</Text>
                <Text style={styles.value}>{student.country || "N/A"}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Wallet Address</Text>
                <Text style={styles.valueSmall}>{student.accountAddress}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#fff",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 24,
    },
    section: {
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#e9ecef",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
    },
    value: {
        fontSize: 16,
        color: "#333",
    },
    valueSmall: {
        fontSize: 12,
        color: "#666",
        fontFamily: "monospace",
    },
});

