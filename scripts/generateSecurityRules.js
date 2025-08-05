import fs from 'fs';
import path from 'path';

function generateSecurityRules() {
    console.log('\x1b[36mGenerating Firestore Security Rules...\x1b[0m');
    
    const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['ADMIN']);
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny([role]);
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      
      // User favorites subcollection
      match /favorites/{therapistId} {
        allow read, write, delete: if isOwner(userId);
      }
    }
    
    // Therapists data
    match /therapistsData/{therapistId} {
      allow read: if resource.data.accountStatus == 'live' || isOwner(therapistId) || isAdmin();
      allow write: if isOwner(therapistId) || isAdmin();
      allow create: if isAuthenticated() && request.auth.uid == therapistId;
    }
    
    // Clinics data
    match /clinicsData/{clinicId} {
      allow read: if resource.data.accountStatus == 'live' || 
                     isOwner(resource.data.ownerId) || isAdmin();
      allow write: if isOwner(resource.data.ownerId) || isAdmin();
      allow create: if isAuthenticated();
    }
    
    // Clinic spaces
    match /clinicSpaces/{spaceId} {
      allow read: if exists(/databases/$(database)/documents/clinicsData/$(resource.data.clinicId)) &&
                     get(/databases/$(database)/documents/clinicsData/$(resource.data.clinicId)).data.accountStatus == 'live';
      allow write: if isAuthenticated() && 
                      exists(/databases/$(database)/documents/clinicsData/$(resource.data.clinicId)) &&
                      isOwner(get(/databases/$(database)/documents/clinicsData/$(resource.data.clinicId)).data.ownerId) ||
                      isAdmin();
      allow create: if isAuthenticated();
    }
    
    // User inquiries
    match /userInquiries/{inquiryId} {
      allow create: if isAuthenticated();
      allow read, update: if isAdmin() || 
                             (isAuthenticated() && resource.data.userId == request.auth.uid);
      allow delete: if isAdmin();
    }
    
    // Activity logs (admin only)
    match /activityLog/{logId} {
      allow read, write: if isAdmin();
    }
    
    // Default deny all other documents
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

    const storageRules = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isValidImageSize() {
      return request.resource.size < 5 * 1024 * 1024; // 5MB
    }
    
    function isValidVideoSize() {
      return request.resource.size < 10 * 1024 * 1024; // 10MB
    }
    
    function isValidDocumentSize() {
      return request.resource.size < 5 * 1024 * 1024; // 5MB
    }
    
    // Profile pictures
    match /profile_pictures/{userId}/{fileName} {
      allow read: if true; // Public read
      allow write: if isOwner(userId) && isValidImageSize();
    }
    
    // Therapist profiles
    match /therapist_profiles/{userId}/{subPath=**} {
      allow read: if true; // Public read for live therapists
      allow write: if isOwner(userId) && 
                      (subPath.matches('.*\\.(jpg|jpeg|png|webp)$') && isValidImageSize() ||
                       subPath.matches('.*\\.(mp4|webm|mov)$') && isValidVideoSize() ||
                       subPath.matches('.*\\.(pdf|jpg|jpeg|png)$') && isValidDocumentSize());
    }
    
    // Clinic profiles
    match /clinic_profiles/{clinicId}/{subPath=**} {
      allow read: if true; // Public read for live clinics
      allow write: if isAuthenticated() && isValidImageSize();
    }
    
    // Clinic spaces
    match /clinic_spaces/{clinicId}/{spaceId}/{fileName} {
      allow read: if true; // Public read
      allow write: if isAuthenticated() && isValidImageSize();
    }
    
    // Payment receipts (private)
    match /{receiptPath}/{userIdOrClinicId}/{fileName} {
      allow read: if isOwner(userIdOrClinicId);
      allow write: if isOwner(userIdOrClinicId) && isValidDocumentSize();
    }
    
    // Default deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}`;

    // Create rules directory if it doesn't exist
    const rulesDir = path.join(process.cwd(), 'firebase-rules');
    if (!fs.existsSync(rulesDir)) {
        fs.mkdirSync(rulesDir);
    }
    
    // Write rules files
    fs.writeFileSync(path.join(rulesDir, 'firestore.rules'), firestoreRules);
    fs.writeFileSync(path.join(rulesDir, 'storage.rules'), storageRules);
    
    console.log('\x1b[32m✓ Security rules generated successfully!\x1b[0m');
    console.log('Files created:');
    console.log('  - firebase-rules/firestore.rules');
    console.log('  - firebase-rules/storage.rules');
    console.log('\nTo deploy these rules:');
    console.log('1. Copy the content of firestore.rules to Firebase Console > Firestore > Rules');
    console.log('2. Copy the content of storage.rules to Firebase Console > Storage > Rules');
}

generateSecurityRules();