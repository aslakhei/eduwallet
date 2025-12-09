import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { EmployerModel } from "../models/employer";
import { useAuth } from "./AuthenticationProvider";
import { getEmployers as fetchEmployers } from "../services/API";

/**
 * Interface for the Employers context.
 */
interface EmployersContextProps {
    /** Array of employers associated with the student */
    employers: EmployerModel[];
    /** Function to update the employers list */
    updateEmployers(addresses: string[]): Promise<void>;
    /** Loading state */
    isLoading: boolean;
}

const EmployersContext = createContext<EmployersContextProps>({
    employers: [],
    updateEmployers: () => Promise.resolve(),
    isLoading: false,
});

/**
 * Hook to access the employers context.
 * @returns {EmployersContextProps} The employers context
 */
export function useEmployers(): EmployersContextProps {
    return useContext(EmployersContext);
}

/**
 * EmployersProvider component that manages employer data.
 * @param {Object} props - The props object.
 * @param {ReactNode} props.children - The child components
 * @returns {JSX.Element} The EmployersContext provider
 */
export default function EmployersProvider({ children }: { children: ReactNode }) {
    const [employers, setEmployers] = useState<EmployerModel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { student } = useAuth();

    /**
     * Updates the employers list by fetching data for the given addresses.
     * @param addresses - Array of employer Ethereum addresses
     */
    const updateEmployers = async (addresses: string[]): Promise<void> => {
        if (!addresses || addresses.length === 0) {
            setEmployers([]);
            return;
        }

        if (!student || !student.id) {
            return;
        }

        setIsLoading(true);
        try {
            const employerModels = await fetchEmployers(student, addresses);
            setEmployers(employerModels);
        } catch (error) {
            console.error("Failed to fetch employers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <EmployersContext.Provider value={{ employers, updateEmployers, isLoading }}>
            {children}
        </EmployersContext.Provider>
    );
}

