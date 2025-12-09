import { ReactNode } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../providers/AuthenticationProvider";

/**
 * ProtectedRoute component restricts access to routes based on student authentication.
 * If the student is not authenticated, it redirects to the login page.
 * Otherwise, it renders the child components.
 * @param {Object} props - The props object.
 * @param {ReactNode} props.children - The child components to render if authenticated
 * @returns {JSX.Element} The rendered protected route component.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { student } = useAuth();

    // Check if the student is authenticated
    if (!student || student.id === "") {
        // If not authenticated, redirect to the login page
        return <Redirect href="/(auth)/login" />;
    }

    // If authenticated, render the child components
    return <>{children}</>;
}

