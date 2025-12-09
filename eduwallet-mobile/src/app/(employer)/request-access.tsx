import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
import { useState } from "react";
import { useAuth } from "../../providers/AuthenticationProvider";
import { useMessages, MessageType } from "../../providers/MessagesProvider";
import { requestEmployerAccess } from "../../services/API";

/**
 * Request Access page for employers to request read-only access to student records.
 */
export default function RequestAccessPage() {
    const { employer } = useAuth();
    const { showMessage } = useMessages();
    const [studentAddress, setStudentAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleRequestAccess = async () => {
        if (!studentAddress || !studentAddress.startsWith('0x')) {
            showMessage("Please enter a valid student wallet address (starting with 0x)", MessageType.Error);
            return;
        }

        if (!employer || !employer.accountAddress || !employer.wallet) {
            showMessage("Employer not properly authenticated. Please log in again.", MessageType.Error);
            return;
        }

        // On web, Alert.alert may not work properly, so skip confirmation
        // On native platforms, show confirmation dialog
        if (Platform.OS === 'web') {
            await executeRequest();
        } else {
            Alert.alert(
                "Request Access",
                `Are you sure you want to request read-only access to student records at address:\n\n${studentAddress}?`,
                [
                    {
                        text: "Cancel",
                        style: "cancel",
                    },
                    {
                        text: "Request",
                        onPress: async () => {
                            await executeRequest();
                        },
                    },
                ]
            );
        }
    };

    const executeRequest = async () => {
        setIsLoading(true);
        try {
            console.log('Requesting access for employer:', employer.accountAddress, 'to student:', studentAddress);
            await requestEmployerAccess(employer, studentAddress);
            showMessage("Access request submitted successfully", MessageType.Success);
            setStudentAddress(""); // Clear input on success
        } catch (error: any) {
            console.error('Request access error:', error);
            showMessage(error.message || "Failed to request access", MessageType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Request Student Access</Text>
                <Text style={styles.description}>
                    Enter a student's wallet address to request read-only access to their academic records.
                    The student will need to approve your request before you can view their records.
                </Text>

                <View style={styles.form}>
                    <Text style={styles.label}>Student Wallet Address</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={studentAddress}
                        onChangeText={setStudentAddress}
                        placeholder="0x..."
                        keyboardType="default"
                        autoCapitalize="none"
                        autoCorrect={false}
                        multiline
                        numberOfLines={3}
                        editable={!isLoading}
                    />
                    <Text style={styles.hint}>
                        Enter the student's smart account address (starts with 0x)
                    </Text>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleRequestAccess}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>
                            {isLoading ? "Requesting..." : "Request Access"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>About Access Requests</Text>
                    <Text style={styles.infoText}>
                        • You can only view academic results (courses, grades, certificates)
                    </Text>
                    <Text style={styles.infoText}>
                        • Personal information (name, birth date, etc.) is not accessible
                    </Text>
                    <Text style={styles.infoText}>
                        • The student must approve your request before you can view their records
                    </Text>
                    <Text style={styles.infoText}>
                        • You can view approved students in the "Students" tab
                    </Text>
                </View>
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
        marginBottom: 12,
        color: "#333",
    },
    description: {
        fontSize: 14,
        color: "#666",
        marginBottom: 24,
        lineHeight: 20,
    },
    form: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
        color: "#333",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        backgroundColor: "#fff",
        fontFamily: "monospace",
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    hint: {
        fontSize: 12,
        color: "#999",
        marginTop: 8,
        marginBottom: 20,
    },
    button: {
        backgroundColor: "#6c5ce7",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    infoCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
        color: "#333",
    },
    infoText: {
        fontSize: 14,
        color: "#666",
        marginBottom: 8,
        lineHeight: 20,
    },
});

