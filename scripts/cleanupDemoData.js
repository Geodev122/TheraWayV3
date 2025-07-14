import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

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

async function cleanupDemoData() {
    console.log('\x1b[33mCleaning up demo data...\x1b[0m');
    
    const collections = ['users', 'therapistsData', 'clinicsData', 'clinicSpaces', 'userInquiries', 'activityLog'];
    let totalDeleted = 0;
    
    try {
        for (const collectionName of collections) {
            console.log(`\nProcessing collection: ${collectionName}`);
            
            const q = query(collection(db, collectionName), where('isDemoAccount', '==', true));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.log(`  No demo data found in ${collectionName}`);
                continue;
            }
            
            const batch = writeBatch(db);
            let batchCount = 0;
            
            querySnapshot.forEach((docSnapshot) => {
                batch.delete(doc(db, collectionName, docSnapshot.id));
                batchCount++;
                
                // Firestore batch limit is 500 operations
                if (batchCount === 500) {
                    batch.commit();
                    batchCount = 0;
                }
            });
            
            if (batchCount > 0) {
                await batch.commit();
            }
            
            console.log(`  ✓ Deleted ${querySnapshot.size} documents from ${collectionName}`);
            totalDeleted += querySnapshot.size;
        }
        
        console.log(`\n\x1b[32mCleanup completed! Deleted ${totalDeleted} demo documents total.\x1b[0m`);
        
    } catch (error) {
        console.error('\x1b[31mError during cleanup:\x1b[0m', error);
    }
}

cleanupDemoData();