import 'react-native-get-random-values';
import { Wallet } from "ethers";

/**
 * Employer credentials for authentication.
 */
export interface EmployerCredentials {
    /** Employer's private key (from CLI registration) */
    privateKey: string;
}

/**
 * Employer model representing an employer in the system.
 */
export class EmployerModel {
    /** Company name */
    companyName: string;
    /** Country where the company is located */
    country: string;
    /** Optional contact information */
    contactInfo?: string;
    /** Employer's smart account address */
    accountAddress: string;
    /** Employer's Ethereum wallet */
    wallet: Wallet;

    /**
     * Creates a new EmployerModel instance.
     * @param companyName - Company name
     * @param country - Country where the company is located
     * @param accountAddress - Employer's smart account address
     * @param wallet - Employer's Ethereum wallet
     * @param contactInfo - Optional contact information
     */
    constructor(
        companyName: string,
        country: string,
        accountAddress: string,
        wallet: Wallet,
        contactInfo?: string
    ) {
        this.companyName = companyName;
        this.country = country;
        this.accountAddress = accountAddress;
        this.wallet = wallet;
        this.contactInfo = contactInfo;
    }

    /**
     * Creates an empty EmployerModel instance.
     * @returns Empty employer model
     */
    static createEmpty(): EmployerModel {
        const hdWallet = Wallet.createRandom();
        return new EmployerModel("", "", "", new Wallet(hdWallet.privateKey));
    }
}
