import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function validateFirestore() {
    console.log('\x1b[36mValidating Firestore database structure...\x1b[0m');
    
    const collections = ['users', 'therapistsData', 'clinicsData', 'clinicSpaces'];
    const validationResults = {};
    
    try {
        for (const collectionName of collections) {
            console.log(`\nValidating collection: ${collectionName}`);
            
            const querySnapshot = await getDocs(collection(db, collectionName));
            const documents = [];
            const issues = [];
            
            querySnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                documents.push({ id: docSnapshot.id, data });
                
                // Validate based on collection type
                switch (collectionName) {
                    case 'users':
                        if (!data.email) issues.push(`${docSnapshot.id}: Missing email`);
                        if (!data.roles || !Array.isArray(data.roles)) issues.push(`${docSnapshot.id}: Invalid roles`);
                        break;
                        
                    case 'therapistsData':
                        if (!data.name) issues.push(`${docSnapshot.id}: Missing name`);
                        if (!data.accountStatus) issues.push(`${docSnapshot.id}: Missing accountStatus`);
                        if (!data.specializations || !Array.isArray(data.specializations)) {
                            issues.push(`${docSnapshot.id}: Invalid specializations`);
                        }
                        break;
                        
                    case 'clinicsData':
                        if (!data.name) issues.push(`${docSnapshot.id}: Missing name`);
                        if (!data.ownerId) issues.push(`${docSnapshot.id}: Missing ownerId`);
                        if (!data.accountStatus) issues.push(`${docSnapshot.id}: Missing accountStatus`);
                        break;
                        
                    case 'clinicSpaces':
                        if (!data.name) issues.push(`${docSnapshot.id}: Missing name`);
                        if (!data.clinicId) issues.push(`${docSnapshot.id}: Missing clinicId`);
                        if (typeof data.rentalPrice !== 'number') {
                            issues.push(`${docSnapshot.id}: Invalid rentalPrice`);
                        }
                        break;
                }
            });
            
            validationResults[collectionName] = {
                documentCount: documents.length,
                issues: issues
            };
            
            console.log(`  Documents: ${documents.length}`);
            if (issues.length > 0) {
                console.log(`  \x1b[33mIssues found: ${issues.length}\x1b[0m`);
                issues.forEach(issue => console.log(`    - ${issue}`));
            } else {
                console.log(`  \x1b[32m✓ No issues found\x1b[0m`);
            }
        }
        
        // Summary
        console.log('\n\x1b[36mValidation Summary:\x1b[0m');
        let totalIssues = 0;
        Object.entries(validationResults).forEach(([collection, result]) => {
            totalIssues += result.issues.length;
            console.log(`  ${collection}: ${result.documentCount} docs, ${result.issues.length} issues`);
        });
        
        if (totalIssues === 0) {
            console.log('\n\x1b[32m✓ Database validation passed! No issues found.\x1b[0m');
        } else {
            console.log(`\n\x1b[33m⚠ Database validation completed with ${totalIssues} issues.\x1b[0m`);
        }
        
    } catch (error) {
        console.error('\x1b[31mError during validation:\x1b[0m', error);
    }
}

validateFirestore();