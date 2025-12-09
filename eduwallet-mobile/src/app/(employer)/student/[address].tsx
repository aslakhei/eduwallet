import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useAuth } from "../../../providers/AuthenticationProvider";
import { useUniversities } from "../../../providers/UniversitiesProvider";
import { getStudentResultsForEmployer } from "../../../services/API";
import { useMessages, MessageType } from "../../../providers/MessagesProvider";
import { ipfsConfig } from "../../../services/config";

/**
 * Student records page for employers to view a specific student's academic records.
 */
export default function StudentRecordsPage() {
    const { address } = useLocalSearchParams<{ address: string }>();
    const { employer } = useAuth();
    const { universities } = useUniversities();
    const { showMessage } = useMessages();
    const router = useRouter();
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        const loadData = async () => {
            if (!address || !employer || !employer.wallet || !employer.accountAddress) {
                if (isMounted) {
                    setIsLoading(false);
                }
                return;
            }

            if (isMounted) {
                setIsLoading(true);
            }
            
            try {
                const studentResults = await getStudentResultsForEmployer(employer, address);
                if (isMounted) {
                    setResults(studentResults);
                }
            } catch (error: any) {
                // Only show error if component is still mounted and employer is still valid
                if (isMounted && employer && employer.wallet) {
                    console.error('Failed to load student results:', error);
                    showMessage(error.message || "Failed to load student records", MessageType.Error);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        // Cleanup function to cancel operations if component unmounts or employer logs out
        return () => {
            isMounted = false;
        };
    }, [address, employer]);

    const openCertificate = async (cid: string) => {
        const url = `${ipfsConfig.gatewayUrl}${cid}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            console.error("Cannot open URL:", url);
        }
    };

    const totalCredits = results.reduce((sum, r) => sum + (r.ects || 0), 0);
    const completedCourses = results.filter(r => r.grade && r.grade !== "").length;

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading student records...</Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.studentInfo}>
                <Text style={styles.studentAddress} numberOfLines={1} ellipsizeMode="middle">
                    {address}
                </Text>
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{results.length}</Text>
                        <Text style={styles.statLabel}>Total Courses</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{completedCourses}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{totalCredits.toFixed(1)}</Text>
                        <Text style={styles.statLabel}>ECTS Credits</Text>
                    </View>
                </View>
            </View>

            {results.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No academic records found</Text>
                </View>
            ) : (
                <View style={styles.resultsContainer}>
                    {results.map((result, index) => {
                        // Try to find university by address, fallback to address if not found
                        const university = universities.find(u => u.accountAddress === result.university);
                        const universityName = university?.name || result.university || "Unknown University";
                        return (
                            <View key={index} style={styles.courseCard}>
                                <Text style={styles.courseName}>{result.name}</Text>
                                <Text style={styles.courseCode}>{result.code}</Text>
                                
                                <View style={styles.courseDetails}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>University:</Text>
                                        <Text style={styles.detailValue}>
                                            {universityName}
                                        </Text>
                                    </View>
                                    
                                    {result.degreeCourse && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Degree:</Text>
                                            <Text style={styles.detailValue}>{result.degreeCourse}</Text>
                                        </View>
                                    )}
                                    
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>ECTS:</Text>
                                        <Text style={styles.detailValue}>{result.ects}</Text>
                                    </View>
                                    
                                    {result.grade && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Grade:</Text>
                                            <Text style={styles.detailValue}>{result.grade}</Text>
                                        </View>
                                    )}
                                    
                                    {result.date && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Date:</Text>
                                            <Text style={styles.detailValue}>{result.date}</Text>
                                        </View>
                                    )}
                                </View>

                                {result.certificateHash && result.certificateHash !== "" && (
                                    <TouchableOpacity
                                        style={styles.certificateButton}
                                        onPress={() => openCertificate(result.certificateHash)}
                                    >
                                        <Text style={styles.certificateButtonText}>View Certificate</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        padding: 20,
        paddingBottom: 10,
    },
    backButton: {
        fontSize: 16,
        color: "#6c5ce7",
        fontWeight: "600",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: "#666",
    },
    studentInfo: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#e9ecef",
    },
    studentAddress: {
        fontSize: 14,
        fontFamily: "monospace",
        color: "#666",
        marginBottom: 16,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    statBox: {
        alignItems: "center",
    },
    statValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#6c5ce7",
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: "#666",
    },
    emptyContainer: {
        padding: 40,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        color: "#666",
    },
    resultsContainer: {
        padding: 20,
    },
    courseCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    courseName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    courseCode: {
        fontSize: 14,
        color: "#666",
        fontFamily: "monospace",
        marginBottom: 12,
    },
    courseDetails: {
        marginTop: 8,
    },
    detailRow: {
        flexDirection: "row",
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        width: 100,
    },
    detailValue: {
        fontSize: 14,
        color: "#333",
        flex: 1,
    },
    certificateButton: {
        backgroundColor: "#6c5ce7",
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
        marginTop: 12,
    },
    certificateButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
});

