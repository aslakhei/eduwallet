// Import polyfill for secure random numbers (required for crypto-js in React Native)
import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';
import { logError } from '../services/config';

/**
 * Derives a 256-bit private key from a password using PBKDF2.
 * React Native version using crypto-js (pure JavaScript, works in Expo Go).
 * @param {string} password - The student's password (random string).
 * @param {string} studentId - The student's unique ID string.
 * @returns {Promise<string>} A private key formatted as a hex string with '0x' prefix.
 * @throws {Error} If key derivation fails or input parameters are invalid
 */
export async function derivePrivateKey(password: string, studentId: string): Promise<string> {
    try {
        if (!password || typeof password !== 'string') {
            throw new Error('Invalid password: must be a non-empty string');
        }
        
        if (!studentId || typeof studentId !== 'string') {
            throw new Error('Invalid student ID: must be a non-empty string');
        }
        
        const iterations = 100000;
        const keyLength = 32; // 256 bits = 32 bytes
        
        // Use PBKDF2 to derive the key (same as browser extension)
        // crypto-js PBKDF2 returns a WordArray, convert to hex string
        const derivedKey = CryptoJS.PBKDF2(password, studentId, {
            keySize: keyLength / 4, // keySize is in 32-bit words (4 bytes each)
            iterations: iterations,
            hasher: CryptoJS.algo.SHA256
        });
        
        const keyHex = derivedKey.toString(CryptoJS.enc.Hex);
        
        return '0x' + keyHex;
    } catch (error) {
        logError('Key derivation failed:', error);
        throw new Error('Failed to generate private key from credentials');
    }
}

/**
 * Formats a Unix timestamp into a human-readable date string.
 * Converts the blockchain timestamp (in seconds) to milliseconds before formatting.
 * @param {bigint} timestamp - The Unix timestamp in seconds (as a bigint).
 * @returns {string} A date string in YYYY-MM-DD format.
 */
export function formatDate(timestamp: bigint): string {
    try {
        if (timestamp === undefined || timestamp === null) {
            return 'Invalid date';
        }
        
        const timestampNumber = Number(timestamp);
        
        if (isNaN(timestampNumber) || timestampNumber < 0) {
            return 'Invalid date';
        }
        
        const date = new Date(timestampNumber * 1000);
        
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        return date.toISOString().split('T')[0];
    } catch (error) {
        logError('Date formatting failed:', error);
        return 'Invalid date';
    }
}

