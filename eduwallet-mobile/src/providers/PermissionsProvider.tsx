import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Permission, PermissionType } from "../models/permissions";
import { useAuth } from "./AuthenticationProvider";
import { getPermissions, performAction } from "../services/API";
import { useMessages, MessageType } from "./MessagesProvider";
import { useUniversities } from "./UniversitiesProvider";
import { useEmployers } from "./EmployersProvider";

/**
 * Interface for the Permissions context.
 */
interface PermissionsContextProps {
    /** Array of pending permission requests */
    requests: Permission[];
    /** Array of granted read permissions */
    read: Permission[];
    /** Array of granted write permissions */
    write: Permission[];
    /** Function to load permissions from blockchain */
    loadPermissions(): Promise<void>;
    /** Function to update a permission (grant or revoke) */
    updatePermission(permission: Permission): Promise<void>;
    /** Loading state */
    isLoading: boolean;
}

const PermissionsContext = createContext<PermissionsContextProps>({
    requests: [],
    read: [],
    write: [],
    loadPermissions: () => Promise.resolve(),
    updatePermission: () => Promise.resolve(),
    isLoading: false,
});

/**
 * Hook to access the permissions context.
 * @returns {PermissionsContextProps} The permissions context
 */
export function usePermissions(): PermissionsContextProps {
    return useContext(PermissionsContext);
}

/**
 * PermissionsProvider component that manages permission data.
 * @param {Object} props - The props object.
 * @param {ReactNode} props.children - The child components
 * @returns {JSX.Element} The PermissionsContext provider
 */
export default function PermissionsProvider({ children }: { children: ReactNode }) {
    const [requests, setRequests] = useState<Permission[]>([]);
    const [read, setRead] = useState<Permission[]>([]);
    const [write, setWrite] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { student } = useAuth();
    const { showMessage } = useMessages();
    const { updateUniversities } = useUniversities();
    const { updateEmployers } = useEmployers();

    /**
     * Loads permissions from the blockchain.
     * Also updates the universities list with universities from permissions.
     */
    const loadPermissions = async (): Promise<void> => {
        if (!student || !student.id) {
            return;
        }

        setIsLoading(true);
        try {
            const permissions = await getPermissions(student);
            // Update universities list with universities from permissions
            const universityAddresses = permissions
                .filter(p => !p.isEmployer)
                .map(p => p.address)
                .filter(addr => addr !== "");
            await updateUniversities(universityAddresses);
            
            // Update employers list with employers from permissions
            const employerAddresses = permissions
                .filter(p => p.isEmployer)
                .map(p => p.address)
                .filter(addr => addr !== "");
            await updateEmployers(employerAddresses);
            
            const requestsTmp = permissions.filter(p => p.request) || [];
            // Include both Read and EmployerRead permissions in the read array
            const readTmp = permissions.filter(p => !p.request && (p.type === PermissionType.Read || p.type === PermissionType.EmployerRead)) || [];
            const writeTmp = permissions.filter(p => !p.request && p.type === PermissionType.Write) || [];
            setRequests(requestsTmp);
            setRead(readTmp);
            setWrite(writeTmp);
        } catch (error) {
            console.error("Failed to load permissions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Reverts a permission update by adding it back to its original array.
     * Used for error handling when blockchain operations fail.
     * @param permission - The permission to revert
     */
    const revertUpdate = (permission: Permission): void => {
        try {
            if (permission.request) {
                setRequests(rs => [...rs, permission]);
            } else {
                switch (permission.type) {
                    case PermissionType.Read:
                        setRead(rs => [...rs, permission]);
                        break;
                    case PermissionType.Write:
                        setWrite(ws => [...ws, permission]);
                        break;
                }
            }
        } catch (error: any) {
            console.error("Failed to revert permission update:", error);
        }
    };

    /**
     * Updates a permission (grants or revokes).
     * Uses optimistic UI updates for better user experience.
     * @param permission - The permission to update
     */
    const updatePermission = async (permission: Permission): Promise<void> => {
        if (!student || !student.id) {
            throw new Error("Student not authenticated");
        }

        try {
            console.log('updatePermission called with:', permission);
            // Start the transaction
            const transaction = performAction(student, permission);

            // Optimistically update the UI
            if (permission.request) {
                // Remove from requests when approving
                setRequests(rs => rs.filter(r => r.address !== permission.address));
                const newPermission: Permission = {
                    request: false,
                    type: permission.type,
                    address: permission.address,
                    isEmployer: permission.isEmployer,
                };
                switch (permission.type) {
                    case PermissionType.Read:
                    case PermissionType.EmployerRead:
                        // Both read and employer read permissions are stored in read array
                        setRead(prev => [...prev, newPermission]);
                        break;
                    case PermissionType.Write:
                        setWrite(prev => [...prev, newPermission]);
                        break;
                }
                showMessage("Permission approved successfully", MessageType.Success);
            } else {
                // Remove permission when revoking
                switch (permission.type) {
                    case PermissionType.Read:
                        setRead(rs => rs.filter(r => r.address !== permission.address));
                        break;
                    case PermissionType.Write:
                        setWrite(ws => ws.filter(w => w.address !== permission.address));
                        break;
                    case PermissionType.EmployerRead:
                        setRead(rs => rs.filter(r => r.address !== permission.address));
                        break;
                }
                showMessage("Permission revoked successfully", MessageType.Success);
            }

            // Wait for transaction to complete
            await transaction;
            console.log('Transaction completed successfully');
        } catch (error: any) {
            console.error('Transaction failed:', error);
            // Revert the optimistic update on error
            revertUpdate(permission);
            const errorMessage = error instanceof Error ? error.message : "Failed to update permission";
            console.error('Error message:', errorMessage);
            showMessage(errorMessage, MessageType.Error);
            throw error;
        }
    };

    // Auto-load permissions when student is authenticated
    useEffect(() => {
        if (student && student.id) {
            loadPermissions();
        }
    }, [student]);

    return (
        <PermissionsContext.Provider
            value={{ requests, read, write, loadPermissions, updatePermission, isLoading }}
        >
            {children}
        </PermissionsContext.Provider>
    );
}

