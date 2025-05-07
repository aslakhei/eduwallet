import { createContext, useContext, useState } from "react";
import type { JSX } from "react";
import { useAuth } from "./AuthenticationProvider";
import { Permission, PermissionType } from "../models/permissions";
import { getPermissions, performAction } from "../API";
import { useUniversities } from "./UniversitiesProvider";
import { MessageType, useMessages } from "./MessagesProvider";

/**
 * Interface defining the shape of the PermissionsContext.
 * Provides access to permission data and methods to update them.
 */
interface PermissionsProviderProps {
    /** Array of permission requests waiting for student approval */
    requests: Permission[];
    /** Array of approved read permissions */
    read: Permission[];
    /** Array of approved write permissions */
    write: Permission[];
    /** Function to load all permissions from the blockchain */
    loadPermissions(): Promise<void>;
    /** Function to update a permission's status */
    updatePermissions(permission: Permission): Promise<void>;
}

/**
 * Context that provides permissions data throughout the application.
 * Default values are used before the provider is initialized.
 */
const PermissionsContext = createContext<PermissionsProviderProps>({
    requests: [],
    read: [],
    write: [],
    loadPermissions: () => Promise.resolve(),
    updatePermissions: () => Promise.resolve(),
});

/**
 * Provider component for permissions data.
 * Manages the state of permissions and provides methods to update them.
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child components to be wrapped
 * @returns {JSX.Element} Provider component with permissions context
 */
export default function PermissionsProvider({ children }: { children: React.ReactNode }): JSX.Element {
    // State for storing different types of permissions
    const [requests, setRequests] = useState<Permission[]>([]);
    const [read, setRead] = useState<Permission[]>([]);
    const [write, setWrite] = useState<Permission[]>([]);
    const [load, setLoad] = useState<boolean>(true);

    // Get universities update function from UniversitiesProvider
    const updateUniversities = useUniversities().updateUniversities;

    // Get authenticated student data from context
    const student = useAuth().student;

    // Get the messages functionality at the component level
    const showMessage = useMessages().showMessage;

    /**
     * Loads permissions data from the blockchain and updates state.
     * Also updates the universities list with universities from permissions.
     * @returns {Promise<void>} A promise that resolves when permissions are fetched
     */
    const loadPermissions = async (): Promise<void> => {
        // Only fetch permissions from the blockchain when load flag is true
        // This prevents redundant calls and allows controlled refreshes
        if (!load) {
            return;
        }

        try {
            if (!student) {
                throw new Error("No authenticated student found");
            }
            const permissionsTmp = await getPermissions(student);
            const upd = updateUniversities(permissionsTmp.map(p => p.university));
            const requestsTmp = permissionsTmp.filter(p => p.request) || [];
            const readTmp = permissionsTmp.filter(p => !p.request && p.type === PermissionType.Read) || [];
            const writeTmp = permissionsTmp.filter(p => !p.request && p.type === PermissionType.Write) || [];
            setRequests(requestsTmp);
            setRead(readTmp);
            setWrite(writeTmp);
            setLoad(false);
            await upd;
        } catch (error: any) {
            showMessage(error.message, MessageType.Error);
        }
    };

    /**
     * Updates a permission by performing a blockchain transaction and optimistically updating the UI.
     * For requests, removes from requests array and adds to appropriate permission array
     * For revocations, removes from the appropriate permission array.
     * @param {Permission} permission - The permission to update
     * @returns {Promise<void>} Promise that resolves when the transaction is confirmed or rejects on failure
     */
    const updatePermissions = async (permission: Permission): Promise<void> => {
        try {
            const transaction = performAction(student, permission);

            if (permission.request) {
                // Remove from requests when approving
                setRequests(rs => rs.filter(r => r.university !== permission.university));
                const newPermission: Permission = {
                    request: false,
                    type: permission.type,
                    university: permission.university,
                }
                switch (permission.type) {
                    case PermissionType.Read:
                        setRead(prev => [...prev, newPermission]);
                        break;
                    case PermissionType.Write:
                        setWrite(prev => [...prev, newPermission]);
                        break;
                    default:
                        throw Error("Unknown perission type.");
                }
            } else {
                // Remove permission when revoking
                switch (permission.type) {
                    case PermissionType.Read:
                        setRead(rs => rs.filter(r => r.university !== permission.university));
                        break;
                    case PermissionType.Write:
                        setWrite(ws => ws.filter(w => w.university !== permission.university));
                        break;
                    default:
                        throw Error("Unknown perission type.");
                }
            }
            await transaction;
        } catch (error) {
            revertUpdate(permission);
            const errorMessage = error instanceof Error ? error.message : "Failed to load permissions";
            showMessage(errorMessage, MessageType.Error);
        }
    };

    /**
     * Reverts a permission update by adding it back to its original array.
     * Used for error handling when blockchain operations fail.
     * @param {Permission} permission - The permission to revert
     */
    const revertUpdate = (permission: Permission) => {
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
                    default:
                        throw Error("Unknown perission type.");
                }
            }
        } catch (error: any) {
            showMessage(error.message, MessageType.Error);
        }
    };

    // Provide permissions data and methods to children
    return (
        <PermissionsContext.Provider value={{ requests, read, write, loadPermissions, updatePermissions }}>
            {children}
        </PermissionsContext.Provider>
    );
}

/**
 * Custom hook to access the permissions context.
 * Provides a convenient way to consume permissions data and methods.
 * @returns {PermissionsProviderProps} The permissions context value
 */
export const usePermissions = (): PermissionsProviderProps => {
    return useContext(PermissionsContext);
}