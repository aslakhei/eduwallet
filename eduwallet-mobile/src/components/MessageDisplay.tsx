import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useMessages, MessageType } from "../providers/MessagesProvider";
import { useEffect } from "react";

/**
 * MessageDisplay component shows toast-style messages to the user.
 */
export default function MessageDisplay() {
    const { message, messageType, clearMessage } = useMessages();

    if (!message) {
        return null;
    }

    const getBackgroundColor = () => {
        switch (messageType) {
            case MessageType.Success:
                return "#28a745";
            case MessageType.Error:
                return "#dc3545";
            case MessageType.Warning:
                return "#ffc107";
            case MessageType.Info:
            default:
                return "#6c5ce7";
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
            <Text style={styles.message}>{message}</Text>
            <TouchableOpacity onPress={clearMessage} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 50,
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 1000,
        boxShadow: "0px 2px 3.84px rgba(0, 0, 0, 0.25)",
        elevation: 5,
    },
    message: {
        color: "#fff",
        fontSize: 14,
        flex: 1,
    },
    closeButton: {
        marginLeft: 12,
        padding: 4,
    },
    closeButtonText: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
    },
});

