
import firebase from "firebase/compat/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// User-provided Firebase project configuration loaded from environment variables.
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
};

// Check if variables are loaded. This helps developers diagnose .env issues.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || 
    firebaseConfig.apiKey === 'your-api-key-here' || 
    firebaseConfig.projectId === 'your-project-id') {
  throw new Error(`
Firebase configuration is not properly set up. Please follow these steps:

1. Check that you have a .env file in your project root
2. Replace the placeholder values in .env with your actual Firebase configuration
3. Get your Firebase config from: https://console.firebase.google.com/
   - Go to Project Settings > General > Your apps
   - Copy the configuration values to your .env file
4. Make sure all VITE_FIREBASE_* variables are set correctly
5. Restart your development server after updating .env

Current values detected:
- API Key: ${firebaseConfig.apiKey ? (firebaseConfig.apiKey.length > 10 ? firebaseConfig.apiKey.substring(0, 10) + '...' : firebaseConfig.apiKey) : 'NOT SET'}
- Project ID: ${firebaseConfig.projectId || 'NOT SET'}

See README.md for detailed setup instructions.
  `);
}

console.log(
  `%cFirebase config loaded with Project ID: ${firebaseConfig.projectId}. Ensure Firestore is ENABLED in the Firebase Console for this project.`,
  'color: green; font-weight: bold; font-size: 12px;'
);


// Initialize Firebase
const app = !firebase.apps.length
  ? firebase.initializeApp(firebaseConfig)
  : firebase.app();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, firebaseConfig };
