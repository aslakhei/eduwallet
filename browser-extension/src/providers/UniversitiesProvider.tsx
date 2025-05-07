import { createContext, useContext, useEffect, useState } from "react";
import type { JSX } from "react";
import { useAuth } from "./AuthenticationProvider";
import UniversityModel from "../models/university";
import { getUniversities } from "../API";
import { MessageType, useMessages } from "./MessagesProvider";

/**
 * Interface defining the shape of the UniversitiesContext.
 * Provides universities data and methods to update it.
 */
interface UniversitiesProviderProps {
    /** Array of university models available in the system */
    universities: UniversityModel[];
    /** Function to update the universities list with new addresses */
    updateUniversities(universitiesAddresses: string[]): Promise<void>;
}

/**
 * Context that provides universities data throughout the application.
 * Default values are used before the provider is initialized.
 */
const UniversitiesContext = createContext<UniversitiesProviderProps>({
    universities: [],
    updateUniversities: async () => Promise.resolve()
});

/**
 * Provider component for universities data.
 * Manages the state of universities and provides methods to update it.
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child components to be wrapped
 * @returns {JSX.Element} Provider component with universities context
 */
export default function UniversitiesProvider({ children }: { children: React.ReactNode }): JSX.Element {
    // Get authenticated student from context
    const student = useAuth().student;

    // State for storing universities data
    const [universities, setUniversities] = useState<UniversityModel[]>([]);

    // Get the messages functionality at the component level
    const showMessage = useMessages().showMessage;

    /**
     * Fetches universities data and updates state.
     * Uses the authenticated student to retrieve relevant universities.
     * @returns {Promise<void>} A promise that resolves when universities are fetched
     */
    const fetchUniversities = async (): Promise<void> => {
        try {
            const universitiesAddresses = Array.from(student.getResultsUniversities());
            const universitiesTmp = await getUniversities(student, universitiesAddresses);
            setUniversities(universitiesTmp);
        } catch (error: any) {
            setUniversities([]);
            showMessage(error.message, MessageType.Error);
        }
    };

    /**
     * Updates the universities list by adding new universities from provided addresses.
     * Filters out addresses that are already in the universities list.
     * @param {string[]} universitiesAddresses - Array of university addresses to add
     * @returns {Promise<void>} A promise that resolves when new universities are added
     */
    const updateUniversities = async (universitiesAddresses: string[]): Promise<void> => {
        try {
            const universitiesSet = new Set(universities.map(u => u.accountAddress));
            const filteredAddresses = universitiesAddresses.filter(a => !universitiesSet.has(a));
            const universitiesTmp = await getUniversities(student, filteredAddresses);
            setUniversities(old => [...old, ...universitiesTmp]);
        } catch (error: any) {
            showMessage(error.message, MessageType.Error);
        }
    };

    /**
     * Effect hook to load universities when the student context changes.
     * Fetches university data on component mount and when student changes.
     */
    useEffect(() => {
        fetchUniversities()
    }, [student]);

    // Provide universities data and fetch method to children
    return (
        <UniversitiesContext.Provider value={{ universities, updateUniversities }}>
            {children}
        </UniversitiesContext.Provider>
    );
}

/**
 * Custom hook to access the universities context.
 * Provides a convenient way to consume universities data and methods.
 * @returns {UniversitiesProviderProps} The universities context value
 */
export const useUniversities = () => {
    return useContext(UniversitiesContext);
};
