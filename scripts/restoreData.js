import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch, collection } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

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

async function restoreData(backupFileName) {
    if (!backupFileName) {
        console.error('\x1b[31mPlease provide a backup file name.\x1b[0m');
        console.log('Usage: npm run restore-data backup-2024-01-01T12-00-00-000Z.json');
        return;
    }
    
    console.log(`\x1b[36mRestoring data from: ${backupFileName}\x1b[0m`);
    
    const backupFile = path.join(process.cwd(), 'backups', backupFileName);
    
    if (!fs.existsSync(backupFile)) {
        console.error(`\x1b[31mBackup file not found: ${backupFile}\x1b[0m`);
        return;
    }
    
    try {
        const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        
        for (const [collectionName, documents] of Object.entries(backupData)) {
            console.log(`\nRestoring collection: ${collectionName}`);
            
            if (!Array.isArray(documents) || documents.length === 0) {
                console.log(`  No documents to restore in ${collectionName}`);
                continue;
            }
            
            const batch = writeBatch(db);
            let batchCount = 0;
            
            for (const docData of documents) {
                const docRef = doc(db, collectionName, docData.id);
                batch.set(docRef, docData.data);
                batchCount++;
                
                // Firestore batch limit is 500 operations
                if (batchCount === 500) {
                    await batch.commit();
                    batchCount = 0;
                }
            }
            
            if (batchCount > 0) {
                await batch.commit();
            }
            
            console.log(`  ✓ Restored ${documents.length} documents to ${collectionName}`);
        }
        
        console.log(`\n\x1b[32mData restoration completed successfully!\x1b[0m`);
        
    } catch (error) {
        console.error('\x1b[31mError during restoration:\x1b[0m', error);
    }
}

// Get backup file name from command line arguments
const backupFileName = process.argv[2];
restoreData(backupFileName);