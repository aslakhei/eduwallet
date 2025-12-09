import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import UniversityModel from "../models/university";
import { useAuth } from "./AuthenticationProvider";
import { getUniversities as fetchUniversities } from "../services/API";

/**
 * Interface for the Universities context.
 */
interface UniversitiesContextProps {
    /** Array of universities associated with the student */
    universities: UniversityModel[];
    /** Function to update the universities list */
    updateUniversities(addresses: string[]): Promise<void>;
    /** Loading state */
    isLoading: boolean;
}

const UniversitiesContext = createContext<UniversitiesContextProps>({
    universities: [],
    updateUniversities: () => Promise.resolve(),
    isLoading: false,
});

/**
 * Hook to access the universities context.
 * @returns {UniversitiesContextProps} The universities context
 */
export function useUniversities(): UniversitiesContextProps {
    return useContext(UniversitiesContext);
}

/**
 * UniversitiesProvider component that manages university data.
 * @param {Object} props - The props object.
 * @param {ReactNode} props.children - The child components
 * @returns {JSX.Element} The UniversitiesContext provider
 */
export default function UniversitiesProvider({ children }: { children: ReactNode }) {
    const [universities, setUniversities] = useState<UniversityModel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { student } = useAuth();

    /**
     * Updates the universities list by fetching data for the given addresses.
     * @param addresses - Array of university Ethereum addresses
     */
    const updateUniversities = async (addresses: string[]): Promise<void> => {
        if (!addresses || addresses.length === 0) {
            setUniversities([]);
            return;
        }

        if (!student || !student.id) {
            return;
        }

        setIsLoading(true);
        try {
            const universityModels = await fetchUniversities(student, addresses);
            setUniversities(universityModels);
        } catch (error) {
            console.error("Failed to fetch universities:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-update universities when student results change
    useEffect(() => {
        if (student && student.id) {
            const universityAddresses = Array.from(student.getResultsUniversities());
            updateUniversities(universityAddresses);
        }
    }, [student]);

    return (
        <UniversitiesContext.Provider value={{ universities, updateUniversities, isLoading }}>
            {children}
        </UniversitiesContext.Provider>
    );
}

