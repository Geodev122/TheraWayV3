import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

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

function startMonitoring() {
    console.log('\x1b[36mStarting Firestore monitoring...\x1b[0m');
    console.log('Press Ctrl+C to stop monitoring\n');
    
    const collections = ['users', 'therapistsData', 'clinicsData', 'userInquiries'];
    const unsubscribers = [];
    
    collections.forEach(collectionName => {
        const q = query(
            collection(db, collectionName),
            orderBy('updatedAt', 'desc'),
            limit(5)
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                const timestamp = new Date().toLocaleTimeString();
                
                switch (change.type) {
                    case 'added':
                        console.log(`\x1b[32m[${timestamp}] ADDED\x1b[0m ${collectionName}/${change.doc.id}`);
                        if (data.name) console.log(`  Name: ${data.name}`);
                        if (data.email) console.log(`  Email: ${data.email}`);
                        break;
                        
                    case 'modified':
                        console.log(`\x1b[33m[${timestamp}] MODIFIED\x1b[0m ${collectionName}/${change.doc.id}`);
                        if (data.name) console.log(`  Name: ${data.name}`);
                        break;
                        
                    case 'removed':
                        console.log(`\x1b[31m[${timestamp}] REMOVED\x1b[0m ${collectionName}/${change.doc.id}`);
                        break;
                }
                console.log(''); // Empty line for readability
            });
        }, (error) => {
            console.error(`\x1b[31mError monitoring ${collectionName}:\x1b[0m`, error);
        });
        
        unsubscribers.push(unsubscribe);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\x1b[36mStopping monitoring...\x1b[0m');
        unsubscribers.forEach(unsubscribe => unsubscribe());
        process.exit(0);
    });
}

startMonitoring();