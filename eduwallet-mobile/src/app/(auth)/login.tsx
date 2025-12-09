import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../providers/AuthenticationProvider";
import { useMessages, MessageType } from "../../providers/MessagesProvider";
import { Credentials } from "../../models/student";
import { EmployerCredentials } from "../../models/employer";

/**
 * LoginPage component renders a login form for users to authenticate.
 * Supports both student (ID/password) and employer (private key) login.
 */
export default function LoginPage() {
    const [isStudent, setIsStudent] = useState(true);
    const [id, setId] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [privateKey, setPrivateKey] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const { login, loginEmployer } = useAuth();
    const { showMessage } = useMessages();
    const router = useRouter();

    const handleStudentSubmit = async () => {
        if (!id || !password) {
            showMessage("Please enter both ID and password", MessageType.Error);
            return;
        }

        setIsLoading(true);
        try {
            const credentials: Credentials = { id, password };
            await login(credentials);
            // Navigation is handled in AuthenticationProvider
        } catch (error: any) {
            // Error is already shown in AuthenticationProvider
            // Just handle loading state here
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmployerSubmit = async () => {
        if (!privateKey) {
            showMessage("Please enter your private key", MessageType.Error);
            return;
        }

        setIsLoading(true);
        try {
            const credentials: EmployerCredentials = { privateKey: privateKey.trim() };
            await loginEmployer(credentials);
            // Navigation is handled in AuthenticationProvider
        } catch (error: any) {
            // Error is already shown in AuthenticationProvider
            // Just handle loading state here
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.logo}>
                    Edu<Text style={styles.logoPurple}>Wallet</Text>
                </Text>
                
                {/* Toggle between Student and Employer login */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, isStudent && styles.toggleButtonActive]}
                        onPress={() => setIsStudent(true)}
                        disabled={isLoading}
                    >
                        <Text style={[styles.toggleText, isStudent && styles.toggleTextActive]}>
                            Student
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, !isStudent && styles.toggleButtonActive]}
                        onPress={() => setIsStudent(false)}
                        disabled={isLoading}
                    >
                        <Text style={[styles.toggleText, !isStudent && styles.toggleTextActive]}>
                            Employer
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.subtitle}>
                    {isStudent ? "Log in with your ID and password" : "Log in with your private key"}
                </Text>

                <View style={styles.form}>
                    {isStudent ? (
                        <>
                            <Text style={styles.label}>ID</Text>
                            <TextInput
                                style={styles.input}
                                value={id}
                                onChangeText={setId}
                                placeholder="Enter your ID"
                                keyboardType="default"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isLoading}
                            />

                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                secureTextEntry
                                autoCapitalize="none"
                                editable={!isLoading}
                            />

                            <TouchableOpacity
                                style={[styles.button, isLoading && styles.buttonDisabled]}
                                onPress={handleStudentSubmit}
                                disabled={isLoading}
                            >
                                <Text style={styles.buttonText}>
                                    {isLoading ? "Logging in..." : "Log In"}
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>Private Key</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={privateKey}
                                onChangeText={setPrivateKey}
                                placeholder="Enter your private key (0x...)"
                                keyboardType="default"
                                autoCapitalize="none"
                                autoCorrect={false}
                                multiline
                                numberOfLines={4}
                                editable={!isLoading}
                            />
                            <Text style={styles.hint}>
                                Enter the private key you received when registering as an employer
                            </Text>

                            <TouchableOpacity
                                style={[styles.button, isLoading && styles.buttonDisabled]}
                                onPress={handleEmployerSubmit}
                                disabled={isLoading}
                            >
                                <Text style={styles.buttonText}>
                                    {isLoading ? "Logging in..." : "Log In as Employer"}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        justifyContent: "center",
        padding: 20,
    },
    content: {
        width: "100%",
    },
    logo: {
        fontSize: 32,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 10,
    },
    logoPurple: {
        color: "#6c5ce7",
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 30,
    },
    form: {
        width: "100%",
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
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: "#fff",
    },
    button: {
        backgroundColor: "#6c5ce7",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
        marginTop: 10,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    toggleContainer: {
        flexDirection: "row",
        marginBottom: 20,
        backgroundColor: "#f0f0f0",
        borderRadius: 8,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
        alignItems: "center",
    },
    toggleButtonActive: {
        backgroundColor: "#6c5ce7",
    },
    toggleText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
    },
    toggleTextActive: {
        color: "#fff",
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    hint: {
        fontSize: 12,
        color: "#999",
        marginTop: -15,
        marginBottom: 15,
    },
});

