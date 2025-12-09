import 'react-native-get-random-values';
import { Wallet } from "ethers";

/**
 * Represents a student in the system with their personal information and academic results.
 */
export class StudentModel {
    // Immutable properties
    public readonly id: string;
    public readonly wallet: Wallet;
    public readonly accountAddress: string;

    // Mutable properties
    public name: string = '';
    public surname: string = '';
    public birthDate: string = '';
    public birthPlace: string = '';
    public country: string = '';
    private results: Result[] = [];

    /**
     * Creates a new StudentModel instance.
     * @param id - The student's ID
     * @param wallet - The student's Ethereum wallet
     * @param accountAddress - The student's smart contract address
     */
    constructor(id: string, wallet: Wallet, accountAddress: string) {
        this.id = id;
        this.wallet = wallet;
        this.accountAddress = accountAddress;
    }

    /**
     * Creates an empty StudentModel instance with default values.
     * @returns {StudentModel} An empty student instance with default values
     */
    static createEmpty(): StudentModel {
        const hdWallet = Wallet.createRandom();
        return new this("", new Wallet(hdWallet.privateKey), '');
    }

    /**
     * Gets all academic results.
     * @returns {Result[]} A copy of all the student's academic results
     */
    getResults(): Result[] {
        return [...this.results]; // Return a copy to prevent direct modification
    }

    /**
     * Gets results grouped by degree course for a specific university.
     * @param universityAddress - The address of the university
     * @returns {{ [key: string]: Result[] }} An object mapping degree courses to their results
     */
    getResultsByUniversityGroupedByCourseDegree(universityAddress: string): { [key: string]: Result[] } {
        return this.getResultsByUniversity(universityAddress).reduce((acc, result) => {
            if (!acc[result.degreeCourse]) {
                acc[result.degreeCourse] = [];
            }
            acc[result.degreeCourse].push(result);
            return acc;
        }, {} as { [key: string]: Result[] });
    }

    /**
     * Gets results for a specific university.
     * @param universityAddress - The address of the university
     * @returns {Result[]} Array of results for the specified university
     */
    getResultsByUniversity(universityAddress: string): Result[] {
        return this.results.filter(result => result.university === universityAddress);
    }

    /**
     * Retrieves a unique set of university addresses from student's results.
     * @returns {Set<string>} A Set containing unique university addresses
     */
    getResultsUniversities(): Set<string> {
        return new Set(this.results.map(r => r.university));
    }

    /**
     * Updates the student's academic results.
     * @param results - The new results from the smart contract
     * @returns {void}
     */
    updateResults(results: any[]): void {
        this.results = results.map(r => {
            const rawEcts = Number(r.ects);
            // ECTS should be stored multiplied by 100 in the blockchain
            // If value is less than 100, it was likely stored incorrectly
            // In that case, use the value as-is; otherwise divide by 100
            const ects = rawEcts < 100 ? rawEcts : rawEcts / 100;
            
            return {
                name: r.name,
                code: r.code,
                university: r.university,
                degreeCourse: r.degreeCourse,
                grade: r.grade === "" ? "N/D" : r.grade,
                date: this.formatDate(r.date),
                ects: ects,
                certificateCid: r.certificateHash,
            };
        });
    }

    /**
     * Formats a Unix timestamp to YYYY-MM-DD format.
     * Handles invalid dates by returning "N/A".
     */
    private formatDate(timestamp: bigint | number): string {
        try {
            const timestampNumber = Number(timestamp);
            // Validate timestamp is reasonable (between year 1970 and 2100)
            if (isNaN(timestampNumber) || timestampNumber < 0 || timestampNumber > 4102444800) {
                return "N/A";
            }
            const date = new Date(timestampNumber * 1000);
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return "N/A";
            }
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.error("Failed to format date:", error, "timestamp:", timestamp);
            return "N/A";
        }
    }

    /**
     * Converts the student to a plain object for serialization.
     * @returns {Object} A plain object containing the student's basic information
     * Note: walletAddress contains the smart account address, not the EOA wallet address
     */
    toObject(): Object {
        return {
            id: this.id,
            walletAddress: this.accountAddress,
            name: this.name,
            surname: this.surname,
            birthDate: this.birthDate,
            birthPlace: this.birthPlace,
            country: this.country,
        };
    }
}

/**
 * Represents an academic result.
 */
export interface Result {
    /** Name of the academic course or exam */
    readonly name: string;
    /** Unique code identifier for the course */
    readonly code: string;
    /** Ethereum address of the university issuing the result */
    readonly university: string;
    /** Name of the degree program this result belongs to */
    readonly degreeCourse: string;
    /** Academic grade received (or "N/D" if not available) */
    readonly grade: string;
    /** Timestamp of when the result was recorded */
    readonly date: string;
    /** Number of European Credit Transfer System credits */
    readonly ects: number;
    /** Content identifier for the certificate in IPFS */
    readonly certificateCid: string;
}

/**
 * Represents student authentication credentials.
 */
export interface Credentials {
    /** Student's unique identifier */
    id: string;
    /** Student's authentication password */
    password: string;
}

