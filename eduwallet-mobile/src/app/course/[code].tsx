import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../providers/AuthenticationProvider";
import { useUniversities } from "../../providers/UniversitiesProvider";
import { Result } from "../../models/student";
import { ipfsConfig } from "../../services/config";

/**
 * CoursePage component displays detailed information about a specific course.
 */
export default function CoursePage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const { student } = useAuth();
    const { universities } = useUniversities();
    const router = useRouter();

    // Find the course from student's results
    const course: Result | undefined = student.getResults().find(r => r.code === code);

    if (!course) {
        return (
            <View style={styles.container}>
                <Text>Course not found</Text>
            </View>
        );
    }

    // Find university name
    const university = universities.find(u => u.accountAddress === course.university);

    const openCertificate = async (cid: string) => {
        const url = `${ipfsConfig.gatewayUrl}${cid}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            console.error("Cannot open URL:", url);
        }
    };

    const resultObj = {
        code: course.code,
        ects: course.ects,
        university: university?.name || "Unknown University",
        degreeCourse: course.degreeCourse,
        grade: course.grade,
        date: course.date,
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.title}>{course.name}</Text>

            <View style={styles.section}>
                <Text style={styles.label}>Course Code</Text>
                <Text style={styles.value}>{resultObj.code}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>University</Text>
                <Text style={styles.value}>{resultObj.university}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Degree Course</Text>
                <Text style={styles.value}>{resultObj.degreeCourse}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Grade</Text>
                <Text style={styles.value}>{resultObj.grade || "N/D"}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>ECTS Credits</Text>
                <Text style={styles.value}>{resultObj.ects}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Evaluation Date</Text>
                <Text style={styles.value}>{resultObj.date || "N/A"}</Text>
            </View>

            {course.certificateCid && course.certificateCid !== "" && (
                <View style={styles.section}>
                    <Text style={styles.label}>Certificate</Text>
                    <TouchableOpacity
                        style={styles.certificateButton}
                        onPress={() => openCertificate(course.certificateCid)}
                    >
                        <Text style={styles.certificateButtonText}>View Certificate</Text>
                    </TouchableOpacity>
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
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 20,
        paddingHorizontal: 20,
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
    certificateButton: {
        backgroundColor: "#6c5ce7",
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
        marginTop: 8,
    },
    certificateButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});

