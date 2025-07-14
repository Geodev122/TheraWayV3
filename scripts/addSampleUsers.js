import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Your Firebase configuration (make sure your .env is set up)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sample users data
const sampleUsers = [
  {
    email: 'fedgee911@gmail.com',
    password: 'clientDemo123',
    name: 'client demo',
    roles: ['CLIENT'],
    profilePictureUrl: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    email: 'rosaryco.cg@gmail.com',
    password: 'therapistDemo123',
    name: 'therapist demo',
    roles: ['THERAPIST'],
    profilePictureUrl: 'https://images.pexels.com/photos/5327580/pexels-photo-5327580.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    email: 'georges.najjar@hotmail.com',
    password: 'clinicDemo123',
    name: 'Clinic demo',
    roles: ['CLINIC_OWNER'],
    profilePictureUrl: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    email: 'geo.elnajjar@gmail.com',
    password: 'adminDemo123',
    name: 'Georges El Najjar',
    roles: ['ADMIN'],
    profilePictureUrl: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400'
  }
];

async function createUser(userData) {
  try {
    console.log(`Creating user: ${userData.email}`);
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const firebaseUser = userCredential.user;
    
    // Create Firestore user document
    const userDoc = {
      id: firebaseUser.uid,
      email: userData.email,
      name: userData.name,
      roles: userData.roles,
      profilePictureUrl: userData.profilePictureUrl,
      isDemoAccount: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);
    
    console.log(`✅ Successfully created user: ${userData.name} (${userData.email})`);
    console.log(`   - UID: ${firebaseUser.uid}`);
    console.log(`   - Roles: ${userData.roles.join(', ')}`);
    
    return { success: true, uid: firebaseUser.uid, email: userData.email };
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log(`⚠️  User ${userData.email} already exists, skipping...`);
      return { success: false, error: 'already-exists', email: userData.email };
    } else {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
      return { success: false, error: error.message, email: userData.email };
    }
  }
}

async function addSampleUsers() {
  console.log('🚀 Starting to add sample users to Firestore...\n');
  
  const results = [];
  
  for (const userData of sampleUsers) {
    const result = await createUser(userData);
    results.push(result);
    console.log(''); // Add spacing between users
  }
  
  // Summary
  console.log('📊 SUMMARY:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success && r.error !== 'already-exists');
  const existing = results.filter(r => r.error === 'already-exists');
  
  console.log(`✅ Successfully created: ${successful.length} users`);
  console.log(`⚠️  Already existed: ${existing.length} users`);
  console.log(`❌ Failed: ${failed.length} users`);
  
  if (successful.length > 0) {
    console.log('\n🎉 New users created:');
    successful.forEach(user => console.log(`   - ${user.email}`));
  }
  
  if (existing.length > 0) {
    console.log('\n⚠️  Users that already existed:');
    existing.forEach(user => console.log(`   - ${user.email}`));
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed to create:');
    failed.forEach(user => console.log(`   - ${user.email}: ${user.error}`));
  }
  
  console.log('\n✨ Sample users setup complete!');
  console.log('\n📝 You can now log in with any of these accounts:');
  sampleUsers.forEach(user => {
    console.log(`   - ${user.roles[0]}: ${user.email} / ${user.password}`);
  });
}

// Run the script
addSampleUsers().catch(console.error);