import figlet from 'figlet';
import inquirer from 'inquirer';
import { changeUniversity, deployStudentsRegister, enrollStudent, evaluateStudent, getStudentInfo, getStudentInfoResults, registerStudent, requestPermission, subscribeUniversity, uni, verifyPermission } from './interact';
import ora from 'ora';
import eduwallet, { PermissionType } from 'eduwallet-sdk';
import { Wallet } from 'ethers';

/**
 * Validates an Ethereum private key format.
 * Ensures the input string is a properly formatted hexadecimal private key.
 * @author Diego Da Giau
 * @param {string} input - The private key string to validate
 * @returns {string|boolean} Error message if validation fails, true if validation succeeds
 */
const validatePrivateKey = (input: string): string | boolean => {
    // Check that input matches the expected format for Ethereum private keys
    const keyRegex = /^0x[0-9a-fA-F]{64}$/;
    if (!keyRegex.test(input)) {
        return 'Please enter a valid Ethereum private key (0x followed by 64 hex characters)';
    }

    // Input is valid
    return true;
};

/**
 * Validates date format and ensures it represents a valid past date.
 * Performs multiple validation checks on date strings for user input.
 * @author Diego Da Giau
 * @param {string} input - The date string to validate in YYYY-MM-DD format
 * @returns {string|boolean} Error message if validation fails, true if validation succeeds
 */
const validateDate = (input: string): string | boolean => {
    // Check if input matches the YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input)) {
        return 'Please enter a valid date in YYYY-MM-DD format';
    }

    // Check if the date is valid (not an invalid date like February 31)
    const date = new Date(input);
    if (isNaN(date.getTime())) {
        return 'Please enter a valid date';
    }

    // Check if the date is in the past
    if (date > new Date()) {
        return 'Date cannot be in the future';
    }

    // Input is valid
    return true;
};

/**
 * Validates string input for appropriate length constraints.
 * Ensures strings meet minimum and maximum length requirements.
 * @author Diego Da Giau
 * @param {string} input - The string to validate
 * @returns {string|boolean} Error message if validation fails, true if validation succeeds
 */
const validateString = (input: string): string | boolean => {
    // Enforce minimum string length
    if (input.length < 3) {
        return 'Please enter a string of at least 3 characters';
    }

    // Enforce maximum string length
    else if (input.length > 30) {
        return 'Please enter a string of maximum 30 characters';
    }

    // Input is valid
    return true;
};

/**
 * Validates a university name for appropriate length constraints.
 * Ensures university names meet minimum and maximum length requirements.
 * @author Diego Da Giau
 * @param {string} input - The university name string to validate
 * @returns {string|boolean} Error message if validation fails, true if validation succeeds
 */
const validateLongString = (input: string): string | boolean => {
    // Enforce minimum string length
    if (input.length < 3) {
        return 'Please enter a string of at least 3 characters';
    }

    // Enforce maximum string length
    else if (input.length > 60) {
        return 'Please enter a string of maximum 30 characters';
    }

    // Input is valid
    return true;
};

/**
 * Validates a university short name for appropriate length constraints.
 * Ensures short names meet minimum and maximum length requirements.
 * @author Diego Da Giau
 * @param {string} input - The short name string to validate
 * @returns {string|boolean} Error message if validation fails, true if validation succeeds
 */
const validateShortName = (input: string): string | boolean => {
    // Enforce minimum short name length
    if (input.length < 3) {
        return 'Please enter a short name of at least 3 characters';
    }
    // Enforce maximum short name length
    else if (input.length > 8) {
        return 'Please enter a short name of maximum 8 characters';
    }

    // Input is valid
    return true;
};

/**
 * Validates an Ethereum wallet address format.
 * Ensures the input string is a properly formatted hexadecimal address.
 * @author Diego Da Giau
 * @param {string} input - The Ethereum address to validate
 * @returns {string|boolean} Error message if validation fails, true if validation succeeds
 */
const validateAddress = (input: string): string | boolean => {
    // Check that input matches the expected format for Ethereum addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(input)) {
        return 'Please enter a valid Ethereum address (0x followed by 40 hex characters)';
    }

    // Input is valid
    return true;
};

/**
 * Validates an ECTS credit value format.
 * Ensures the input string is a properly formatted decimal number.
 * @author Diego Da Giau
 * @param {string} input - The ECTS credit value to validate
 * @returns {string|boolean} Error message if validation fails, true if validation succeeds
 */
const validateEcts = (input: string): string | boolean => {
    // Check that input matches the expected format for ECTS values
    const ectsRegex = /^[1-9][0-9]*(.[0-9]+)?$/;
    if (!ectsRegex.test(input)) {
        return 'Please enter a valid ECTS value (positive number)';
    }

    // Enforce maximum ECTS value constraint
    const ects = parseFloat(input);
    if (ects > 100) {
        return 'Please enter a valid ECTS value (maximum 100 credits allowed)';
    }

    // Input is valid
    return true;
};

/**
 * Validates a course evaluation result for appropriate length constraints.
 * Ensures grades meet minimum and maximum length requirements.
 * @author Diego Da Giau
 * @param {string} input - The result string to validate
 * @returns {string|boolean} Error message if validation fails, true if validation succeeds
 */
const validateGrade = (input: string): string | boolean => {
    // Enforce minimum short name length
    if (input.length === 0) {
        return 'Please enter a value';
    }
    // Enforce maximum short name length
    else if (input.length > 15) {
        return 'Please enter a result of maximum 15 characters';
    }

    // Input is valid
    return true;
};

/**
 * Deploys the core Students Register contract to the blockchain.
 * This contract serves as the entry point for the academic credential system.
 * Manages the deployment process with visual feedback using a spinner.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when the contract is successfully deployed
 * @throws {Error} If deployment fails for any reason
 */
async function deployRegisterContract(): Promise<void> {
    try {
        const spinner = ora('Deploying register contract...').start();

        await deployStudentsRegister();

        spinner.succeed('Register contract deployed successfully!');
    } catch (error) {
        console.error("Failed to deploy register contract:", error);
        process.exit(1);
    }
}

/**
 * Prompts for university details and registers a new university in the system.
 * Collects and validates university name, country, and short name.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when the university is successfully subscribed
 */
async function subscribeUniversityCommand(): Promise<void> {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Enter university name:',
            validate: validateLongString,
        },
        {
            type: 'input',
            name: 'country',
            message: 'Enter university country:',
            validate: validateString,
        },
        {
            type: 'input',
            name: 'shortName',
            message: 'Enter university short name:',
            validate: validateShortName,
        },
    ]);
    const spinner = ora('Subscribing the university...').start();
    await subscribeUniversity(answers.name, answers.country, answers.shortName);
    spinner.succeed('University subscribed successfully!');
}

/**
 * Prompts for student details and registers a new student in the system.
 * Collects and validates personal information required for academic records.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when the student is successfully registered
 */
async function registerStudentCommand(): Promise<void> {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Enter student first name:',
            validate: validateString,
        },
        {
            type: 'input',
            name: 'surname',
            message: 'Enter student second name:',
            validate: validateString,
        },
        {
            type: 'input',
            name: 'birthDate',
            message: 'Enter student date of birth (YYYY-MM-DD):',
            validate: validateDate,
        },
        {
            type: 'input',
            name: 'birthPlace',
            message: 'Enter student place of birth:',
            validate: validateString,
        },
        {
            type: 'input',
            name: 'country',
            message: 'Enter student country of birth:',
            validate: validateString,
        },
    ]);

    const spinner = ora('Registering the student...').start();
    await registerStudent(answers.name, answers.surname, answers.birthDate, answers.birthPlace, answers.country);
    spinner.succeed('Student registered successfully!');
}

/**
 * Retrieves basic student information from the blockchain.
 * Prompts for a student wallet address and fetches their basic profile.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when student information is successfully retrieved
 */
async function getStudentInfoCommand(): Promise<void> {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'wallet',
            message: 'Enter student academic wallet address (0x...):',
            validate: validateAddress,
        },
    ]);
    const spinner = ora('Retrieving the student info...').start();
    await getStudentInfo(answers.wallet);
    spinner.succeed('Student information retrieved successfully');
}

/**
 * Retrieves comprehensive student information including academic results.
 * Prompts for a student wallet address and fetches complete academic profile.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when student information and results are successfully retrieved
 */
async function getStudentResultsCommand(): Promise<void> {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'wallet',
            message: 'Enter student academic wallet address (0x...):',
            validate: validateAddress,
        },
    ]);
    const spinner = ora('Retrieving the student info and results...').start();
    await getStudentInfoResults(answers.wallet);
    spinner.succeed('Student information and results retrieved successfully');
}

/**
 * Enrolls a student in one or more academic courses.
 * Prompts for student wallet address and course details, then submits enrollment transactions.
 * Supports adding multiple courses in a single enrollment session.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when the student is successfully enrolled in all courses
 */
async function enrollStudentCommand(): Promise<void> {
    // Get student wallet address
    const student = await inquirer.prompt([
        {
            type: 'input',
            name: 'wallet',
            message: 'Enter student academic wallet address (0x...):',
            validate: validateAddress,
        },
    ]);

    // Collection of courses to enroll the student in
    const courses: eduwallet.CourseInfo[] = [];

    // Continue collecting course information until user chooses to enroll
    while (true) {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'code',
                message: 'Enter course code:',
                validate: validateString,
            },
            {
                type: 'input',
                name: 'name',
                message: 'Enter course name:',
                validate: validateLongString,
            },
            {
                type: 'input',
                name: 'degreeCourse',
                message: 'Enter degree course name:',
                validate: validateLongString,
            },
            {
                type: 'input',
                name: 'ects',
                message: 'Enter ECTS number:',
                validate: validateEcts,
            },
        ]);
        
        // Add the course to the collection
        courses.push({
            code: answers.code,
            name: answers.name,
            degreeCourse: answers.degreeCourse,
            ects: parseInt(answers.ects),
        });
        
        // Check if user wants to add more courses or proceed with enrollment
        const action = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    'Add another course',
                    'Enroll',
                ]
            }
        ]);
        
        // Break the loop if user chooses to enroll
        if (action.action === 'Enroll') {
            break;
        }
    }
    
    // Process enrollment with visual feedback
    const spinner = ora('Enrolling the student...').start();
    await enrollStudent(student.wallet, courses);
    spinner.succeed('Student enrolled successfully');
}

/**
 * Records academic evaluations for enrolled students.
 * Prompts for student wallet address and evaluation details, then submits evaluation transactions.
 * Supports adding multiple evaluations in a single session.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when the student is successfully evaluated for all submitted courses
 */
async function evaluateStudentCommand(): Promise<void> {
    // Get student wallet address
    const evaluations: eduwallet.Evaluation[] = [];
    const student = await inquirer.prompt([
        {
            type: 'input',
            name: 'wallet',
            message: 'Enter student academic wallet address (0x...):',
            validate: validateAddress,
        },
    ]);

    // Continue collecting evaluation information until user chooses to submit
    while (true) {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'code',
                message: 'Enter course code:',
                validate: validateString,
            },
            {
                type: 'input',
                name: 'evaluationDate',
                message: 'Enter evaluation date (YYYY-MM-DD):',
                validate: validateDate,
            },
            {
                type: 'input',
                name: 'grade',
                message: 'Enter evaluation result:',
                validate: validateGrade,
            },
            {
                type: 'input',
                name: 'certificate',
                message: 'Enter certificate path (optional):',
            },
        ]);

        // Add the evaluation to the collection
        evaluations.push({
            code: answers.code,
            evaluationDate: answers.evaluationDate,
            grade: answers.grade,
            certificate: answers.certificate === '' ? null : answers.certificate,
        });

        // Check if user wants to add more evaluations or proceed with submission
        const action = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    'Add another evaluation',
                    'Evaluate',
                ]
            }
        ]);

        // Break the loop if user chooses to evaluate
        if (action.action === 'Evaluate') {
            break;
        }
    }
    
    // Process evaluations with visual feedback
    const spinner = ora('Evaluating the student...').start();
    await evaluateStudent(student.wallet, evaluations);
    spinner.succeed('Student evaluated successfully');
}

/**
 * Requests permission to access a student's academic wallet.
 * Universities must request access before they can read or modify student records.
 * Prompts for student wallet address and desired permission type.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when the permission request is submitted and confirmed
 */
async function requestPermissionCommand(): Promise<void> {
    // Get student wallet address and permission type
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'wallet',
            message: 'Enter student academic wallet address (0x...):',
            validate: validateAddress,
        },
        {
            type: 'list',
            name: 'action',
            message: 'What type of permission do you want to ask?',
            choices: [
                'Read',
                'Write'
            ]
        }
    ]);

    // Determine permission type based on user selection
    let permission: PermissionType;
    switch (answers.action) {
        case 'Read':
            permission = PermissionType.Read;
            break;
        case 'Write':
            permission = PermissionType.Write;
            break;
        default:
            permission = PermissionType.Read;
    }

    // Process permission request with visual feedback
    const spinner = ora(`Requesting the ${answers.action} permission...`).start();
    await requestPermission(answers.wallet, permission);
    spinner.succeed('Permission requested successfully');
}

/**
 * Verifies a university's permission level for a student's academic wallet.
 * Checks the current permission level available to the active university wallet.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when the permission verification is complete
 */
async function verifyPermissionCommand(): Promise<void> {
    // Get student wallet address
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'wallet',
            message: 'Enter student academic wallet address (0x...):',
            validate: validateAddress,
        },
    ]);
    
    // Process verification with visual feedback
    const spinner = ora(`Verifying available permission...`).start();
    await verifyPermission(answers.wallet);
    spinner.succeed('Permission verified successfully');
}

/**
 * Changes the active university wallet used for all operations.
 * Allows switching between different university credentials.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when the university wallet is successfully changed
 */
async function changeUniversityCommand(): Promise<void> {
    // Get university private key
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'privateKey',
            message: 'Enter university private key (0x...):',
            validate: validatePrivateKey,
        },
    ]);
    
    // Process university change with visual feedback
    const spinner = ora(`Changing university...`).start();
    changeUniversity(new Wallet(answers.privateKey));
    spinner.succeed('University changed successfully');
}

/**
 * Displays and manages the main interactive menu of the EduWallet CLI.
 * Provides different options based on whether a university wallet is configured.
 * Handles user selection and routes to appropriate command handlers.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when the user exits the CLI
 */
async function mainMenu(): Promise<void> {
    // Continue displaying menu until user explicitly exits
    while (true) {
        let choices: string[] = [];
        // Show different menu options based on university wallet availability
        if (uni) {
            // Full menu when university wallet is configured
            choices = [
                'Subscribe a university',
                'Register a student',
                "Get student basic information",
                "Get student basic information and results",
                'Enroll a student',
                'Evaluate a student',
                'Request permission from a student',
                'Verify permission for a student',
                'Change university',
                'Exit'
            ];
        } else {
            // Limited menu when no university wallet is configured
            choices = [
                'Subscribe a university',
                'Exit'
            ];
        }

        const action = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices,
            }
        ]);

        // Process user selection and execute corresponding command
        switch (action.action) {
            case 'Subscribe a university':
                await subscribeUniversityCommand();
                break;
            case 'Register a student':
                await registerStudentCommand();
                break;
            case "Get student basic information":
                await getStudentInfoCommand();
                break;
            case "Get student basic information and results":
                await getStudentResultsCommand();
                break;
            case 'Enroll a student':
                await enrollStudentCommand();
                break;
            case 'Evaluate a student':
                await evaluateStudentCommand();
                break;
            case 'Request permission from a student':
                await requestPermissionCommand();
                break;
            case 'Verify permission for a student':
                await verifyPermissionCommand();
                break;
            case 'Change university':
                await changeUniversityCommand();
                break;
            case 'Exit':
                console.log('Goodbye!');
                process.exit(0);
            default:
                // Handle any unexpected selections
                console.log('Invalid option selected');
                break;
        }
    }
}

// Main execution starts here
async function main() {
    console.log(figlet.textSync("EduWallet"));
    await deployRegisterContract();
    await mainMenu();
}

main().catch(console.error);
