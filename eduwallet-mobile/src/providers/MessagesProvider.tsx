import { createContext, useContext, useState, ReactNode } from "react";

/**
 * Types of messages that can be displayed.
 */
export enum MessageType {
    Success = "success",
    Error = "error",
    Warning = "warning",
    Info = "info",
}

/**
 * Interface for the Messages context.
 */
interface MessagesContextProps {
    /** Function to show a message to the user */
    showMessage(message: string, type?: MessageType): void;
    /** Current message to display */
    message: string | null;
    /** Type of the current message */
    messageType: MessageType | null;
    /** Function to clear the current message */
    clearMessage(): void;
}

const MessagesContext = createContext<MessagesContextProps>({
    showMessage: () => {},
    message: null,
    messageType: null,
    clearMessage: () => {},
});

/**
 * Hook to access the messages context.
 * @returns {MessagesContextProps} The messages context
 */
export function useMessages(): MessagesContextProps {
    return useContext(MessagesContext);
}

/**
 * MessagesProvider component that provides message display functionality.
 * @param {Object} props - The props object.
 * @param {ReactNode} props.children - The child components
 * @returns {JSX.Element} The MessagesContext provider
 */
export default function MessagesProvider({ children }: { children: ReactNode }) {
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<MessageType | null>(null);

    const showMessage = (msg: string, type: MessageType = MessageType.Info): void => {
        setMessage(msg);
        setMessageType(type);
        // Auto-clear after 3 seconds
        setTimeout(() => {
            clearMessage();
        }, 3000);
    };

    const clearMessage = (): void => {
        setMessage(null);
        setMessageType(null);
    };

    return (
        <MessagesContext.Provider value={{ showMessage, message, messageType, clearMessage }}>
            {children}
        </MessagesContext.Provider>
    );
}

