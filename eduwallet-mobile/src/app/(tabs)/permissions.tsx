import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ScrollView, Platform } from "react-native";
import { useState } from "react";
import { usePermissions } from "../../providers/PermissionsProvider";
import { useUniversities } from "../../providers/UniversitiesProvider";
import { useEmployers } from "../../providers/EmployersProvider";
import { Permission } from "../../models/permissions";

/**
 * PermissionsPage component displays and manages university permissions.
 */
export default function PermissionsPage() {
    const { requests, read, write, updatePermission, isLoading, loadPermissions } = usePermissions();
    const { universities } = useUniversities();
    const { employers } = useEmployers();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await loadPermissions();
        } catch (error) {
            console.error("Failed to refresh permissions:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const handlePermissionAction = async (permission: Permission) => {
        const action = permission.request ? "approve" : "revoke";
        const entityName = permission.isEmployer 
            ? (employers.find(e => e.accountAddress === permission.address)?.companyName || "employer")
            : (universities.find(u => u.accountAddress === permission.address)?.name || "university");
        const permissionTypeText = permission.type === 0 ? "read" : permission.type === 1 ? "write" : "employer read";
        
        const executeAction = async () => {
            try {
                console.log(`Attempting to ${action} permission:`, permission);
                await updatePermission(permission);
                console.log(`Successfully ${action}d permission`);
            } catch (error: any) {
                console.error(`Failed to ${action} permission:`, error);
                const errorMessage = error?.message || "Failed to update permission";
                if (Platform.OS === 'web') {
                    // On web, use browser alert() instead of Alert.alert
                    if (typeof window !== 'undefined') {
                        window.alert(`Error: ${errorMessage}`);
                    } else {
                        console.error('Error:', errorMessage);
                    }
                } else {
                    Alert.alert("Error", errorMessage);
                }
            }
        };

        // On web, skip confirmation dialog and execute directly
        if (Platform.OS === 'web') {
            await executeAction();
        } else {
            Alert.alert(
                `${action === "approve" ? "Approve" : "Revoke"} Permission`,
                `Are you sure you want to ${action} ${permissionTypeText} permission for ${entityName}?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: action === "approve" ? "Approve" : "Revoke",
                        style: action === "approve" ? "default" : "destructive",
                        onPress: executeAction,
                    },
                ]
            );
        }
    };

    const renderPermissionItem = (permission: Permission) => {
        const university = universities.find(u => u.accountAddress === permission.address);
        const employer = employers.find(e => e.accountAddress === permission.address);
        const permissionTypeText = permission.type === 0 ? "Read" : permission.type === 1 ? "Write" : "Employer Read";
        const entityName = university ? university.name : employer ? employer.companyName : permission.isEmployer ? "Unknown employer" : "Unknown university";
        return (
            <View style={styles.permissionCard}>
                <Text style={styles.universityName}>
                    {entityName}
                </Text>
                <Text style={styles.universityAddress}>{permission.address}</Text>
                <Text style={styles.permissionType}>
                    {permissionTypeText} Permission
                    {permission.request ? " (Pending)" : ""}
                </Text>
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        permission.request ? styles.approveButton : styles.revokeButton,
                    ]}
                    onPress={() => handlePermissionAction(permission)}
                >
                    <Text style={styles.actionButtonText}>
                        {permission.request ? "Approve" : "Revoke"}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Text>Loading permissions...</Text>
            </View>
        );
    }

    const allPermissions = [...requests, ...read, ...write];

    if (allPermissions.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Permissions</Text>
                <ScrollView
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={styles.emptyContainer}
                >
                    <Text style={styles.emptyText}>No permissions found</Text>
                    <Text style={styles.emptySubtext}>
                        Permission requests from universities will appear here.
                    </Text>
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Permissions</Text>
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {requests.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Pending Requests</Text>
                        <FlatList
                            data={requests}
                            keyExtractor={(item, index) => `${item.address}-${index}`}
                            renderItem={({ item }) => renderPermissionItem(item)}
                            scrollEnabled={false}
                        />
                    </View>
                )}
                {(read.length > 0 || write.length > 0) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Granted Permissions</Text>
                        <FlatList
                            data={[...read, ...write]}
                            keyExtractor={(item, index) => `${item.address}-${index}`}
                            renderItem={({ item }) => renderPermissionItem(item)}
                            scrollEnabled={false}
                        />
                    </View>
                )}
            </ScrollView>
        </View>
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
        marginBottom: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
        color: "#666",
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: "center",
        paddingTop: 50,
    },
    emptyText: {
        fontSize: 18,
        textAlign: "center",
        color: "#666",
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: "center",
        marginTop: 10,
        color: "#999",
    },
    permissionCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    universityName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    universityAddress: {
        fontSize: 12,
        fontFamily: "monospace",
        color: "#666",
        marginBottom: 8,
    },
    permissionType: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
    },
    actionButton: {
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
    },
    approveButton: {
        backgroundColor: "#6c5ce7",
    },
    revokeButton: {
        backgroundColor: "#e74c3c",
    },
    actionButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
});

