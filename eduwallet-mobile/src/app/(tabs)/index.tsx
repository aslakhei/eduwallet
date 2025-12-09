import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useUniversities } from "../../providers/UniversitiesProvider";
import { useAuth } from "../../providers/AuthenticationProvider";
import { Result } from "../../models/student";

/**
 * Homepage component that displays the list of universities and courses.
 */
export default function HomePage() {
    const { universities, isLoading, updateUniversities } = useUniversities();
    const { student, refreshStudent } = useAuth();
    const router = useRouter();
    const [activeUniversity, setActiveUniversity] = useState<string>("");
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            // Refresh student data (which includes results)
            await refreshStudent();
            // Use student directly since getStudent mutates the student object
            // The refreshStudent function updates the student object in place
            const universityAddresses = Array.from(student.getResultsUniversities());
            if (universityAddresses.length > 0) {
                await updateUniversities(universityAddresses);
            }
        } catch (error) {
            console.error("Failed to refresh home data:", error);
        } finally {
            setRefreshing(false);
        }
    };

    // Set first university as active when data is loaded
    useEffect(() => {
        if (universities.length > 0 && !activeUniversity) {
            setActiveUniversity(universities[0].accountAddress);
        }
    }, [universities.length]);

    // Calculate total credits from completed courses (with grades)
    const creditNumber = student.getResults()
        .filter(r => r.grade !== "")
        .reduce((acc, val) => acc + val.ects, 0);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    const activeUniversityResults = activeUniversity 
        ? student.getResultsByUniversityGroupedByCourseDegree(activeUniversity)
        : {};

    const degreeCourses = Object.keys(activeUniversityResults);

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <View style={styles.header}>
                <Text style={styles.greeting}>
                    Hello <Text style={styles.bold}>{student.name}</Text>
                </Text>
                <View style={styles.creditsCard}>
                    <Text style={styles.creditsLabel}>Total credits balance</Text>
                    <Text style={styles.creditsValue}>{creditNumber} ECTS</Text>
                </View>
            </View>

            {universities.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No universities found</Text>
                    <Text style={styles.emptySubtext}>
                        Your academic records will appear here once you have course results.
                    </Text>
                </View>
            ) : (
                <>
                    {/* University tabs */}
                    <View style={styles.universityTabs}>
                        {universities
                            .filter(u => student.getResultsByUniversity(u.accountAddress).length > 0)
                            .map(u => (
                                <TouchableOpacity
                                    key={u.accountAddress}
                                    style={[
                                        styles.universityTab,
                                        activeUniversity === u.accountAddress && styles.universityTabActive
                                    ]}
                                    onPress={() => setActiveUniversity(u.accountAddress)}
                                >
                                    <Text
                                        style={[
                                            styles.universityTabText,
                                            activeUniversity === u.accountAddress && styles.universityTabTextActive
                                        ]}
                                    >
                                        {u.shortName || u.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                    </View>

                    {/* Courses list */}
                    {student.getResults().length === 0 ? (
                        <Text style={styles.emptyText}>Still no academic records to show</Text>
                    ) : (
                        <View style={styles.coursesContainer}>
                            {degreeCourses.map(degreeCourse => (
                                <View key={degreeCourse} style={styles.degreeCourseSection}>
                                    <Text style={styles.degreeCourseTitle}>{degreeCourse}</Text>
                                    {activeUniversityResults[degreeCourse].map((result: Result) => (
                                        <TouchableOpacity
                                            key={result.code}
                                            style={styles.courseCard}
                                            onPress={() => router.push(`/course/${result.code}` as any)}
                                        >
                                            <View style={styles.courseInfo}>
                                                <Text style={styles.courseName}>{result.name}</Text>
                                                <Text style={styles.courseCode}>{result.code}</Text>
                                            </View>
                                            <View style={styles.courseGrades}>
                                                <Text style={styles.courseGrade}>
                                                    {result.grade ? result.grade : ""}
                                                </Text>
                                                <Text style={styles.courseEcts}>
                                                    {result.ects ? result.ects : ""}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))}
                        </View>
                    )}
                </>
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
    },
    greeting: {
        fontSize: 20,
        marginBottom: 20,
    },
    bold: {
        fontWeight: "bold",
    },
    creditsCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        marginBottom: 20,
    },
    creditsLabel: {
        fontSize: 16,
        color: "#666",
        marginBottom: 8,
    },
    creditsValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#6c5ce7",
    },
    emptyContainer: {
        padding: 20,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 18,
        textAlign: "center",
        marginTop: 50,
        color: "#666",
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: "center",
        marginTop: 10,
        color: "#999",
    },
    universityTabs: {
        flexDirection: "row",
        paddingHorizontal: 20,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#e9ecef",
    },
    universityTab: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginRight: 16,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    universityTabActive: {
        borderBottomColor: "#6c5ce7",
    },
    universityTabText: {
        fontSize: 16,
        color: "#666",
    },
    universityTabTextActive: {
        color: "#6c5ce7",
        fontWeight: "600",
    },
    coursesContainer: {
        padding: 20,
    },
    degreeCourseSection: {
        marginBottom: 24,
    },
    degreeCourseTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
        color: "#333",
    },
    courseCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    courseInfo: {
        flex: 1,
    },
    courseName: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 4,
    },
    courseCode: {
        fontSize: 12,
        color: "#666",
    },
    courseGrades: {
        alignItems: "flex-end",
        justifyContent: "center",
    },
    courseGrade: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 4,
    },
    courseEcts: {
        fontSize: 12,
        color: "#666",
    },
});

