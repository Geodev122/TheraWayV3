import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function backupData() {
    console.log('\x1b[36mStarting data backup...\x1b[0m');
    
    const collections = ['users', 'therapistsData', 'clinicsData', 'clinicSpaces', 'userInquiries', 'activityLog'];
    const backupData = {};
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
        for (const collectionName of collections) {
            console.log(`Backing up collection: ${collectionName}`);
            
            const querySnapshot = await getDocs(collection(db, collectionName));
            const documents = [];
            
            querySnapshot.forEach((doc) => {
                documents.push({
                    id: doc.id,
                    data: doc.data()
                });
            });
            
            backupData[collectionName] = documents;
            console.log(`  ✓ Backed up ${documents.length} documents`);
        }
        
        // Create backups directory if it doesn't exist
        const backupsDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir);
        }
        
        // Write backup file
        const backupFile = path.join(backupsDir, `backup-${timestamp}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        
        console.log(`\n\x1b[32mBackup completed successfully!\x1b[0m`);
        console.log(`Backup saved to: ${backupFile}`);
        
        // Show summary
        let totalDocs = 0;
        Object.entries(backupData).forEach(([collection, docs]) => {
            totalDocs += docs.length;
            console.log(`  ${collection}: ${docs.length} documents`);
        });
        console.log(`Total documents backed up: ${totalDocs}`);
        
    } catch (error) {
        console.error('\x1b[31mError during backup:\x1b[0m', error);
    }
}

backupData();