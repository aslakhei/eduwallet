import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, TextInput, Platform } from "react-native";
import { useState, useEffect } from "react";
import { useAuth } from "../../providers/AuthenticationProvider";
import { useMessages, MessageType } from "../../providers/MessagesProvider";
import { getStudentResultsForEmployer, getStudentsWithAccess } from "../../services/API";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Interface for a student with access.
 */
interface StudentWithAccess {
    address: string;
    hasAccess: boolean;
    results?: any[];
}

/**
 * Students page for employers to view students they have access to.
 */
export default function StudentsPage() {
    const { employer } = useAuth();
    const { showMessage } = useMessages();
    const router = useRouter();
    const [students, setStudents] = useState<StudentWithAccess[]>([]);
    const [studentAddress, setStudentAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);

    // Load students with access on mount
    useEffect(() => {
        let isMounted = true;
        
        const loadData = async () => {
            if (!employer || !employer.accountAddress || !employer.wallet) {
                if (isMounted) {
                    setIsLoadingInitial(false);
                }
                return;
            }

            if (isMounted) {
                setIsLoadingInitial(true);
            }
            
            try {
                // Try to get students from API (this will check stored addresses)
                const studentsWithAccess = await getStudentsWithAccess(employer);
                if (isMounted && employer && employer.wallet) {
                    setStudents(studentsWithAccess);
                }
            } catch (error) {
                // Only log error if component is still mounted and employer is still valid
                if (isMounted && employer && employer.wallet) {
                    console.error('Failed to load students with access:', error);
                }
            } finally {
                if (isMounted) {
                    setIsLoadingInitial(false);
                }
            }
        };

        loadData();

        // Cleanup function to cancel operations if component unmounts or employer logs out
        return () => {
            isMounted = false;
        };
    }, [employer]);

    const handleCheckAccess = async () => {
        if (!studentAddress || !studentAddress.startsWith('0x')) {
            showMessage("Please enter a valid student wallet address (starting with 0x)", MessageType.Error);
            return;
        }

        if (!employer || !employer.wallet || !employer.accountAddress) {
            showMessage("Employer not properly authenticated", MessageType.Error);
            return;
        }

        setIsLoading(true);
        try {
            const results = await getStudentResultsForEmployer(employer, studentAddress);
            
            // Check if student already exists in list
            const existingIndex = students.findIndex(s => s.address.toLowerCase() === studentAddress.toLowerCase());
            
            if (existingIndex >= 0) {
                // Update existing student
                const updatedStudents = [...students];
                updatedStudents[existingIndex] = {
                    address: studentAddress,
                    hasAccess: true,
                    results: results,
                };
                setStudents(updatedStudents);
            } else {
                // Add new student
                const newStudent = {
                    address: studentAddress,
                    hasAccess: true,
                    results: results,
                };
                setStudents([...students, newStudent]);
                
                // Store this student address for future loads
                await storeStudentAddress(studentAddress);
            }
            
            showMessage("Student records loaded successfully", MessageType.Success);
            setStudentAddress(""); // Clear input
        } catch (error: any) {
            if (error.message?.includes('AccessControlUnauthorizedAccount') || error.message?.includes('permission')) {
                showMessage("You don't have access to this student's records. Request access first.", MessageType.Error);
            } else {
                showMessage(error.message || "Failed to load student records", MessageType.Error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const onRefresh = async () => {
        if (!employer || !employer.wallet || !employer.accountAddress) {
            setRefreshing(false);
            return;
        }

        setRefreshing(true);
        try {
            // Reload all students with access
            const studentsWithAccess = await getStudentsWithAccess(employer);
            if (employer && employer.wallet) {
                setStudents(studentsWithAccess);
            }
        } catch (error) {
            if (employer && employer.wallet) {
                console.error('Failed to refresh students:', error);
            }
        } finally {
            setRefreshing(false);
        }
    };

    // Store student address for future loads
    const storeStudentAddress = async (address: string) => {
        try {
            const key = `employer_students_${employer.accountAddress}`;
            let addresses: string[] = [];
            
            if (Platform.OS === 'web') {
                const stored = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
                addresses = stored ? JSON.parse(stored) : [];
            } else {
                const stored = await AsyncStorage.getItem(key);
                addresses = stored ? JSON.parse(stored) : [];
            }
            
            if (!addresses.includes(address.toLowerCase())) {
                addresses.push(address.toLowerCase());
                
                if (Platform.OS === 'web') {
                    if (typeof window !== 'undefined') {
                        window.localStorage.setItem(key, JSON.stringify(addresses));
                    }
                } else {
                    await AsyncStorage.setItem(key, JSON.stringify(addresses));
                }
            }
        } catch (error) {
            console.error('Failed to store student address:', error);
        }
    };

    const renderStudentCard = (student: StudentWithAccess) => {
        const totalCredits = student.results?.reduce((sum, r) => sum + (r.ects || 0), 0) || 0;
        const resultCount = student.results?.length || 0;

        return (
            <View key={student.address} style={styles.studentCard}>
                <View style={styles.studentHeader}>
                    <Text style={styles.studentAddress} numberOfLines={1} ellipsizeMode="middle">
                        {student.address}
                    </Text>
                    {student.hasAccess ? (
                        <View style={styles.accessBadge}>
                            <Text style={styles.accessBadgeText}>Access Granted</Text>
                        </View>
                    ) : (
                        <View style={styles.noAccessBadge}>
                            <Text style={styles.noAccessBadgeText}>No Access</Text>
                        </View>
                    )}
                </View>
                
                {student.hasAccess && student.results && (
                    <View style={styles.studentStats}>
                        <Text style={styles.statText}>
                            {resultCount} {resultCount === 1 ? 'course' : 'courses'}
                        </Text>
                        <Text style={styles.statText}>
                            {totalCredits.toFixed(1)} ECTS
                        </Text>
                    </View>
                )}

                {student.hasAccess && student.results && student.results.length > 0 && (
                    <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => {
                            router.push(`/(employer)/student/${student.address}` as any);
                        }}
                    >
                        <Text style={styles.viewButtonText}>View Records</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <View style={styles.content}>
                <Text style={styles.title}>Students with Access</Text>
                <Text style={styles.description}>
                    View academic records of students who have granted you access.
                </Text>

                <View style={styles.searchSection}>
                    <Text style={styles.label}>Check Student Access</Text>
                    <TextInput
                        style={styles.input}
                        value={studentAddress}
                        onChangeText={setStudentAddress}
                        placeholder="0x..."
                        keyboardType="default"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                    />
                    <TouchableOpacity
                        style={[styles.checkButton, isLoading && styles.buttonDisabled]}
                        onPress={handleCheckAccess}
                        disabled={isLoading}
                    >
                        <Text style={styles.checkButtonText}>
                            {isLoading ? "Checking..." : "Check Access"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {isLoadingInitial ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>Loading students...</Text>
                    </View>
                ) : students.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            No students with access yet.
                        </Text>
                        <Text style={styles.emptyStateSubtext}>
                            Request access to student records or check if you already have access to a student.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.studentsList}>
                        {students.map(renderStudentCard)}
                    </View>
                )}
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
    searchSection: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
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
        marginBottom: 12,
    },
    checkButton: {
        backgroundColor: "#6c5ce7",
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
    },
    checkButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    studentsList: {
        marginTop: 8,
    },
    studentCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    studentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    studentAddress: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        flex: 1,
        fontFamily: "monospace",
    },
    accessBadge: {
        backgroundColor: "#27ae60",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    accessBadgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    noAccessBadge: {
        backgroundColor: "#e74c3c",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    noAccessBadgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    studentStats: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 12,
    },
    statText: {
        fontSize: 14,
        color: "#666",
    },
    viewButton: {
        backgroundColor: "#6c5ce7",
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
        marginTop: 8,
    },
    viewButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    emptyState: {
        padding: 40,
        alignItems: "center",
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
    },
});

