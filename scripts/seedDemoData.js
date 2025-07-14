import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, collection, writeBatch } from 'firebase/firestore';

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Demo therapists data
const demoTherapists = [
    {
        id: 'demo-therapist-1',
        email: 'dr.sarah.johnson@demo.com',
        password: 'demoTherapist123',
        name: 'Dr. Sarah Johnson',
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
    {
        id: 'demo-therapist-2',
        email: 'dr.michael.brown@demo.com',
        password: 'demoTherapist123',
        name: 'Dr. Michael Brown',
        profilePictureUrl: 'https://images.pexels.com/photos/5327921/pexels-photo-5327921.jpeg?auto=compress&cs=tinysrgb&w=400',
        specializations: ['Family Therapy', 'Relationship Counseling'],
        languages: ['English', 'French'],
        qualifications: ['MA in Marriage and Family Therapy', 'Licensed Marriage and Family Therapist'],
        bio: 'Dedicated to helping families and couples build stronger, healthier relationships.',
        locations: [{ address: '456 Harmony Ave, Relationship City', isPrimary: true }],
        whatsappNumber: '+1234567891',
        accountStatus: 'live',
        isDemoAccount: true,
    },
];

// Demo clinics data
const demoClinics = [
    {
        id: 'demo-clinic-1',
        ownerId: 'demo-clinic-owner-1',
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

// Demo clinic spaces
const demoClinicSpaces = [
    {
        id: 'demo-space-1',
        name: 'Therapy Room A',
        photos: ['https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=400'],
        description: 'Comfortable, soundproof therapy room with natural lighting and calming decor.',
        rentalPrice: 50,
        rentalDuration: 'per hour',
        rentalTerms: 'Minimum 2-hour booking. 24-hour cancellation policy.',
        features: ['Soundproof', 'Natural Light', 'Comfortable Seating', 'Wi-Fi'],
        clinicId: 'demo-clinic-1',
        clinicName: 'Serenity Mental Health Center',
        clinicAddress: '789 Peace Blvd, Wellness District',
        isDemoAccount: true,
    },
];

async function seedDemoData() {
    console.log('\x1b[36mSeeding demo data...\x1b[0m');
    
    try {
        // Create demo therapist users and profiles
        for (const therapist of demoTherapists) {
            try {
                // Create auth user
                const userCredential = await createUserWithEmailAndPassword(auth, therapist.email, therapist.password);
                const user = userCredential.user;
                
                // Create user document
                await setDoc(doc(db, 'users', user.uid), {
                    id: user.uid,
                    email: therapist.email,
                    name: therapist.name,
                    roles: ['THERAPIST'],
                    profilePictureUrl: therapist.profilePictureUrl,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    isDemoAccount: true,
                });
                
                // Create therapist profile
                await setDoc(doc(db, 'therapistsData', user.uid), {
                    ...therapist,
                    id: user.uid,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                
                console.log(`✓ Created therapist: ${therapist.name}`);
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    console.log(`! Therapist ${therapist.email} already exists`);
                } else {
                    console.error(`✗ Error creating therapist ${therapist.name}:`, error.message);
                }
            }
        }
        
        // Create demo clinic owner and clinic
        try {
            const clinicOwnerCredential = await createUserWithEmailAndPassword(auth, 'demo.clinic.owner@demo.com', 'demoClinicOwner123');
            const clinicOwnerUser = clinicOwnerCredential.user;
            
            await setDoc(doc(db, 'users', clinicOwnerUser.uid), {
                id: clinicOwnerUser.uid,
                email: 'demo.clinic.owner@demo.com',
                name: 'Demo Clinic Owner',
                roles: ['CLINIC_OWNER'],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isDemoAccount: true,
            });
            
            // Create clinic with the actual owner ID
            const clinic = { ...demoClinics[0], ownerId: clinicOwnerUser.uid };
            await setDoc(doc(db, 'clinicsData', clinic.id), {
                ...clinic,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            
            console.log(`✓ Created clinic owner and clinic: ${clinic.name}`);
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                console.log(`! Clinic owner already exists`);
            } else {
                console.error(`✗ Error creating clinic:`, error.message);
            }
        }
        
        // Create demo clinic spaces
        const batch = writeBatch(db);
        demoClinicSpaces.forEach(space => {
            const spaceRef = doc(collection(db, 'clinicSpaces'), space.id);
            batch.set(spaceRef, {
                ...space,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        });
        await batch.commit();
        console.log(`✓ Created ${demoClinicSpaces.length} clinic spaces`);
        
        console.log('\n\x1b[32mDemo data seeding completed successfully!\x1b[0m');
        
    } catch (error) {
        console.error('\x1b[31mError seeding demo data:\x1b[0m', error);
    }
}

seedDemoData();