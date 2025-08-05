import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

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
const db = getFirestore(app);

// Migration functions
const migrations = {
    // Example: Add isDemoAccount field to existing documents
    async addDemoAccountField() {
        console.log('Adding isDemoAccount field to existing documents...');
        
        const collections = ['users', 'therapistsData', 'clinicsData', 'clinicSpaces'];
        
        for (const collectionName of collections) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const batch = writeBatch(db);
            let batchCount = 0;
            
            querySnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                if (data.isDemoAccount === undefined) {
                    batch.update(doc(db, collectionName, docSnapshot.id), {
                        isDemoAccount: false
                    });
                    batchCount++;
                }
            });
            
            if (batchCount > 0) {
                await batch.commit();
                console.log(`  ✓ Updated ${batchCount} documents in ${collectionName}`);
            } else {
                console.log(`  - No updates needed for ${collectionName}`);
            }
        }
    },
    
    // Example: Normalize user roles to array format
    async normalizeUserRoles() {
        console.log('Normalizing user roles to array format...');
        
        const querySnapshot = await getDocs(collection(db, 'users'));
        const batch = writeBatch(db);
        let batchCount = 0;
        
        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            if (data.role && !data.roles) {
                // Convert single role to roles array
                batch.update(doc(db, 'users', docSnapshot.id), {
                    roles: [data.role],
                    role: null // Remove old field
                });
                batchCount++;
            }
        });
        
        if (batchCount > 0) {
            await batch.commit();
            console.log(`  ✓ Updated ${batchCount} user documents`);
        } else {
            console.log(`  - No role normalization needed`);
        }
    },
    
    // Example: Update therapist account status
    async updateTherapistAccountStatus() {
        console.log('Updating therapist account status...');
        
        const querySnapshot = await getDocs(collection(db, 'therapistsData'));
        const batch = writeBatch(db);
        let batchCount = 0;
        
        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            if (!data.accountStatus) {
                // Set default status for existing therapists
                batch.update(doc(db, 'therapistsData', docSnapshot.id), {
                    accountStatus: 'draft'
                });
                batchCount++;
            }
        });
        
        if (batchCount > 0) {
            await batch.commit();
            console.log(`  ✓ Updated ${batchCount} therapist documents`);
        } else {
            console.log(`  - No status updates needed`);
        }
    }
};

async function runMigrations() {
    console.log('\x1b[36mRunning database migrations...\x1b[0m');
    
    try {
        // Run all migrations
        for (const [migrationName, migrationFunction] of Object.entries(migrations)) {
            console.log(`\nRunning migration: ${migrationName}`);
            await migrationFunction();
        }
        
        console.log('\n\x1b[32m✓ All migrations completed successfully!\x1b[0m');
        
    } catch (error) {
        console.error('\x1b[31mError during migration:\x1b[0m', error);
    }
}

// Get specific migration from command line arguments
const specificMigration = process.argv[2];

if (specificMigration && migrations[specificMigration]) {
    console.log(`\x1b[36mRunning specific migration: ${specificMigration}\x1b[0m`);
    migrations[specificMigration]();
} else if (specificMigration) {
    console.error(`\x1b[31mMigration '${specificMigration}' not found.\x1b[0m`);
    console.log('Available migrations:', Object.keys(migrations).join(', '));
} else {
    runMigrations();
}