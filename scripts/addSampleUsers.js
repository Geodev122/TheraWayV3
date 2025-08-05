import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Load environment variables from .env file into process.env
dotenv.config();

// --- Firebase Configuration ---
// This now correctly reads from process.env after dotenv.config() is called.
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

// --- Validation ---
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('\x1b[31m%s\x1b[0m', 'ERROR: Firebase configuration is missing or incomplete.');
    console.error('Please ensure your .env file in the project root contains all VITE_FIREBASE_... variables.');
    process.exit(1);
}

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Sample Data ---
const sampleUsers = [
    {
        email: 'fedgee911@gmail.com',
        password: 'clientDemo123',
        name: 'client demo',
        roles: ['CLIENT'],
    },
    {
        email: 'rosaryco.cg@gmail.com',
        password: 'therapistDemo123',
        name: 'therapist demo',
        roles: ['THERAPIST'],
    },
    {
        email: 'georges.najjar@hotmail.com',
        password: 'clinicDemo123',
        name: 'Clinic demo',
        roles: ['CLINIC_OWNER'],
    },
    {
        email: 'geo.elnajjar@gmail.com',
        password: 'adminDemo123',
        name: 'Georges El Najjar',
        roles: ['ADMIN'],
    },
];

// --- Main Script Logic ---
async function addSampleUsers() {
    console.log(`\x1b[36mInitializing script for Firebase project: ${firebaseConfig.projectId}\x1b[0m`);
    console.log('Starting to add sample users...');

    for (const userData of sampleUsers) {
        try {
            console.log(`\nProcessing user: ${userData.email}`);
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
            const user = userCredential.user;
            console.log(`  \x1b[32m✓\x1b[0m Successfully created auth user with UID: ${user.uid}`);

            const userDocPayload = {
                id: user.uid,
                email: userData.email,
                name: userData.name,
                roles: userData.roles,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                profilePictureUrl: null,
<<<<<<< HEAD
=======
                isDemoAccount: true,
>>>>>>> 3f11d228cf1c692f7634b65f62ed4eeb4495a253
            };

            await setDoc(doc(db, 'users', user.uid), userDocPayload);
            console.log(`  \x1b[32m✓\x1b[0m Successfully created Firestore document for user: ${user.uid}`);

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                console.warn(`  \x1b[33m!\x1b[0m WARNING: User ${userData.email} already exists. Skipping.`);
            } else {
                console.error(`  \x1b[31m✗\x1b[0m ERROR: Failed to create user ${userData.email}.`, error.message);
            }
        }
    }
    console.log('\n\x1b[36mFinished adding sample users.\x1b[0m');
}

addSampleUsers();