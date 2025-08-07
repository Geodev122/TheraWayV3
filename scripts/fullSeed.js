import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, collection, writeBatch, getDoc } from 'firebase/firestore';

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('\x1b[31m%s\x1b[0m', 'ERROR: Firebase configuration is missing or incomplete.');
    console.error('Please ensure your .env file in the project root contains all VITE_FIREBASE_... variables.');
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const sampleUsers = [
    {
        email: 'client@theraway.net',
        password: '123456',
        name: 'Client User',
        roles: ['CLIENT'],
    },
    {
        email: 'rosaryco.cg@gmail.com',
        password: '123456',
        name: 'Therapist User',
        roles: ['THERAPIST'],
    },
    {
        email: 'georges.najjar@hotmail.com',
        password: '123456',
        name: 'Clinic Owner User',
        roles: ['CLINIC_OWNER'],
    },
    {
        email: 'geo.elnajjar@gmail.com',
        password: '123456',
        name: 'Admin User',
        roles: ['ADMIN'],
    },
];

const demoTherapists = [
    {
        id: 'therapist-profile-1',
        email: 'rosaryco.cg@gmail.com',
        name: 'Therapist User',
        profilePictureUrl: 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=400',
        specializations: ['Cognitive Behavioral Therapy (CBT)', 'Anxiety Counseling'],
        languages: ['English', 'Spanish'],
        qualifications: ['PhD in Clinical Psychology', 'Licensed Clinical Psychologist'],
        bio: 'Experienced therapist specializing in anxiety and depression treatment using evidence-based approaches.',
        locations: [{ address: '123 Wellness St, Mental Health City', isPrimary: true }],
        whatsappNumber: '+1234567890',
        accountStatus: 'live',
        isDemoAccount: true,
    },
];

const demoClinics = [
    {
        id: 'clinic-profile-1',
        ownerId: 'clinicowner-uid', // This will be replaced with actual UID
        name: 'Serenity Mental Health Center',
        profilePictureUrl: 'https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=400',
        amenities: ['Waiting Area', 'Wi-Fi', 'Restroom Access', 'Natural Light'],
        operatingHours: {
            'Monday-Friday': '9:00 AM - 6:00 PM',
            'Saturday': '10:00 AM - 4:00 PM',
            'Sunday': 'Closed'
        },
        address: '789 Peace Blvd, Wellness District',
        whatsappNumber: '+1234567892',
        description: 'A modern, peaceful environment designed for therapeutic healing and professional growth.',
        accountStatus: 'live',
        isDemoAccount: true,
    },
];

const demoClinicSpaces = [
    {
        id: 'clinic-space-1',
        name: 'Therapy Room A',
        photos: ['https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=400'],
        description: 'Comfortable, soundproof therapy room with natural lighting and calming decor.',
        rentalPrice: 50,
        rentalDuration: 'per hour',
        rentalTerms: 'Minimum 2-hour booking. 24-hour cancellation policy.',
        features: ['Soundproof', 'Natural Light', 'Comfortable Seating', 'Wi-Fi'],
        clinicId: 'clinic-profile-1',
        clinicName: 'Serenity Mental Health Center',
        clinicAddress: '789 Peace Blvd, Wellness District',
        isDemoAccount: true,
    },
];

// Demo user inquiries
const demoUserInquiries = [
    {
        id: 'demo-inquiry-1',
        userEmail: 'client@theraway.net',
        userName: 'Client User',
        subject: 'Unable to book session',
        message: 'I get an error when trying to book a session.',
        date: new Date().toISOString(),
        status: 'open',
        priority: 'high',
        category: 'technical_support',
        isDemoAccount: true,
    },
    {
        id: 'demo-inquiry-2',
        userEmail: 'client@theraway.net',
        userName: 'Client User',
        subject: 'General question about services',
        message: 'What services are offered for anxiety?',
        date: new Date().toISOString(),
        status: 'pending_admin_response',
        priority: 'medium',
        category: 'general',
        isDemoAccount: true,
    },
];

// Demo activity log entries
const demoActivityLogEntries = [
    {
        id: 'demo-log-1',
        timestamp: new Date().toISOString(),
        action: 'Initial demo activity',
        targetType: 'system',
        details: 'Seeding initial demo data',
        isDemoAccount: true,
    },
    {
        id: 'demo-log-2',
        timestamp: new Date().toISOString(),
        action: 'Client created inquiry',
        targetType: 'user',
        details: 'Client User submitted an inquiry',
        isDemoAccount: true,
    },
];

// Demo membership history for therapist
const demoMembershipHistory = [
    {
        id: 'membership-1',
        date: new Date().toISOString(),
        action: 'Joined platform',
        details: 'Initial membership activation',
        isDemoAccount: true,
    },
    {
        id: 'membership-2',
        date: new Date().toISOString(),
        action: 'Membership renewed',
        details: 'Annual renewal processed',
        isDemoAccount: true,
    },
];

async function fullSeed() {
    console.log(`\x1b[36mInitializing full seeding script for Firebase project: ${firebaseConfig.projectId}\x1b[0m`);
    console.log('Starting to seed all demo data...');

    const createdUids = {};

    for (const userData of sampleUsers) {
        let userUid = null;
        try {
            console.log(`\nProcessing user: ${userData.email}`);
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
            userUid = userCredential.user.uid;
            console.log(`  \x1b[32m✓\x1b[0m Successfully created auth user with UID: ${userUid}`);

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                console.warn(`  \x1b[33m!\x1b[0m WARNING: User ${userData.email} already exists in Authentication. Attempting to get UID and update Firestore.`);
                const signInMethods = await fetchSignInMethodsForEmail(auth, userData.email);
                if (signInMethods && signInMethods.length > 0) {
                    // Sign in the user to get their UID
                    const userCredential = await signInWithEmailAndPassword(auth, userData.email, userData.password);
                    userUid = userCredential.user.uid;
                    console.log(`  \x1b[33m!\x1b[0m Found existing auth user with UID: ${userUid}`);
                } else {
                    console.error(`  \x1b[31m✗\x1b[0m ERROR: Could not retrieve UID for existing user ${userData.email}. Skipping.`);
                    continue; // Skip to next user if UID cannot be determined
                }
            } else {
                console.error(`  \x1b[31m✗\x1b[0m ERROR: Failed to create user ${userData.email}.`, error.message);
                continue; // Skip to next user on other errors
            }
        }

        if (userUid) {
            createdUids[userData.roles[0]] = userUid; // Store UID for linking
            const userDocPayload = {
                id: userUid,
                email: userData.email,
                name: userData.name,
                roles: userData.roles,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                profilePictureUrl: null,
                isDemoAccount: true,
            };
            await setDoc(doc(db, 'users', userUid), userDocPayload, { merge: true }); // Use merge to update existing docs
            console.log(`  \x1b[32m✓\x1b[0m Successfully created/updated Firestore document for user: ${userUid}`);
        }
    }

    // Seed Therapist Profiles
    for (const therapist of demoTherapists) {
        try {
            const therapistUid = createdUids['THERAPIST'];
            if (!therapistUid) {
                console.warn(`  \x1b[33m!\x1b[0m WARNING: Therapist user not found in created UIDs, skipping therapist profile seeding.`);
                continue;
            }
            await setDoc(doc(db, 'therapistsData', therapistUid), {
                ...therapist,
                id: therapistUid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }, { merge: true });
            console.log(`  \x1b[32m✓\x1b[0m Successfully seeded therapist profile for ${therapist.name}`);
        } catch (error) {
            console.error(`  \x1b[31m✗\x1b[0m ERROR: Failed to seed therapist profile for ${therapist.name}.`, error.message);
        }
    }

    // Seed Clinic Profiles and Spaces
    for (const clinic of demoClinics) {
        try {
            const clinicOwnerUid = createdUids['CLINIC_OWNER'];
            if (!clinicOwnerUid) {
                console.warn(`  \x1b[33m!\x1b[0m WARNING: Clinic owner user not found in created UIDs, skipping clinic profile seeding.`);
                continue;
            }
            const clinicToSeed = { ...clinic, ownerId: clinicOwnerUid };
            await setDoc(doc(db, 'clinicsData', clinic.id), {
                ...clinicToSeed,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }, { merge: true });
            console.log(`  \x1b[32m✓\x1b[0m Successfully seeded clinic profile for ${clinic.name}`);

            // Seed clinic spaces for this clinic
            const batch = writeBatch(db);
            demoClinicSpaces.forEach(space => {
                if (space.clinicId === clinic.id) { // Only seed spaces for this specific clinic
                    const spaceRef = doc(collection(db, 'clinicSpaces'), space.id);
                    batch.set(spaceRef, {
                        ...space,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    }, { merge: true });
                }
            });
            await batch.commit();
            console.log(`  \x1b[32m✓\x1b[0m Successfully seeded clinic spaces for ${clinic.name}`);

        } catch (error) {
            console.error(`  \x1b[31m✗\x1b[0m ERROR: Failed to seed clinic profile for ${clinic.name}.`, error.message);
        }
    }

    // Seed User Inquiries
    try {
        const clientUid = createdUids['CLIENT'];
        const inquiriesBatch = writeBatch(db);
        demoUserInquiries.forEach(inquiry => {
            const inquiryRef = doc(collection(db, 'userInquiries'), inquiry.id);
            inquiriesBatch.set(inquiryRef, {
                ...inquiry,
                userId: clientUid || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }, { merge: true });
        });
        await inquiriesBatch.commit();
        console.log(`  \x1b[32m✓\x1b[0m Successfully seeded user inquiries`);
    } catch (error) {
        console.error(`  \x1b[31m✗\x1b[0m ERROR: Failed to seed user inquiries.`, error.message);
    }

    // Seed Activity Log Entries
    try {
        const adminUid = createdUids['ADMIN'];
        const logsBatch = writeBatch(db);
        demoActivityLogEntries.forEach(log => {
            const logRef = doc(collection(db, 'activityLog'), log.id);
            logsBatch.set(logRef, {
                ...log,
                userId: adminUid || null,
                userName: 'Admin User',
                userRole: 'ADMIN',
                createdAt: serverTimestamp(),
            }, { merge: true });
        });
        await logsBatch.commit();
        console.log(`  \x1b[32m✓\x1b[0m Successfully seeded activity log entries`);
    } catch (error) {
        console.error(`  \x1b[31m✗\x1b[0m ERROR: Failed to seed activity log entries.`, error.message);
    }

    // Seed Therapist Membership History
    try {
        const therapistUid = createdUids['THERAPIST'];
        if (!therapistUid) {
            console.warn(`  \x1b[33m!\x1b[0m WARNING: Therapist user not found in created UIDs, skipping membership history seeding.`);
        } else {
            const historyBatch = writeBatch(db);
            demoMembershipHistory.forEach(item => {
                const historyRef = doc(collection(db, `therapistsData/${therapistUid}/membershipHistory`), item.id);
                historyBatch.set(historyRef, {
                    ...item,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            });
            await historyBatch.commit();
            console.log(`  \x1b[32m✓\x1b[0m Successfully seeded therapist membership history`);
        }
    } catch (error) {
        console.error(`  \x1b[31m✗\x1b[0m ERROR: Failed to seed therapist membership history.`, error.message);
    }

    console.log('\n\x1b[36mFinished seeding all demo data.\x1b[0m');
}

fullSeed();