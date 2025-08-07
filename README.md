# TheraWay - Mental Health Web Application

TheraWay is a comprehensive mental health web application designed to connect clients with therapists and assist therapists in finding suitable clinic spaces. It features distinct dashboards and functionalities for Clients, Therapists, Clinic Owners, and Administrators.

## Key Features

*   **Home Page:** A welcoming landing page at `/` introducing the platform and its features.
*   **Clients:**
    *   Browse therapists via swipe, grid, and interactive map views at the `/find` route.
    *   Filter therapists by name, location, specializations, languages, availability, and rating.
    *   View detailed therapist profiles.
    *   Like/save favorite therapists (data stored in Firestore).
    *   Connect with therapists via WhatsApp (if number provided).
    *   Manage their basic user profile (name, email, profile picture stored in Firestore/Firebase Storage).
*   **Therapists:**
    *   Create and manage a detailed professional profile (stored in Firestore).
    *   Upload profile picture and an introductory video (stored in Firebase Storage).
    *   Manage professional licenses and certifications, including file uploads (data in Firestore, files in Firebase Storage).
    *   Browse and view details of rentable clinic spaces listed by clinic owners (data from Firestore).
    *   Manage TheraWay membership: apply, submit payment proof, view status and history (data in Firestore, files in Firebase Storage).
    *   Manage account settings (name, email - stored in Firestore).
*   **Clinic Owners:**
    *   Create and manage a detailed clinic profile (stored in Firestore).
    *   Upload clinic profile picture and additional photos (stored in Firebase Storage).
    *   List and manage rentable clinic spaces (data in Firestore, files in Firebase Storage).
    *   View placeholder analytics for clinic engagement.
    *   Manage TheraWay membership for the clinic (data in Firestore, files in Firebase Storage).
    *   Manage personal account settings (name, email - stored in Firestore).
*   **Administrators:**
    *   Validate and manage therapist accounts (updates Firestore documents).
    *   Approve and manage clinic accounts (updates Firestore documents).
    *   View and manage user inquiries (data in Firestore).
    *   Monitor system activity through an activity log (data in Firestore).
    *   Data export conceptualized; for secure export, Firebase Cloud Functions would be needed.
*   **Platform-wide:**
    *   Secure authentication using Firebase Authentication (Email/Password, Google, Facebook).
    *   Role-based access control (enforced via Firestore Security Rules and client-side logic).
    *   Multilingual support (English & Arabic) with RTL for Arabic.
    *   File uploads using Firebase Storage.
    *   Interactive map view using Leaflet.js.

## Tech Stack

*   **Frontend:** React, TypeScript, Tailwind CSS, Leaflet.js
*   **Backend:** Firebase (Authentication, Firestore, Cloud Storage). Firebase Cloud Functions can be added for server-side logic if needed.

## Environment Variables

Create a `.env` file in the project root by copying `.env.example`:

```bash
cp .env.example .env
```

Then fill in the following variables with your project-specific values:

| Variable | Description |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase measurement ID (analytics) |
| `DATA_CONNECT_ENDPOINT` | Firebase Data Connect GraphQL endpoint |
| `DATA_CONNECT_SERVICE_ID` | Firebase Data Connect service ID |
| `DATA_CONNECT_LOCATION` | Firebase Data Connect location |

Each developer should maintain their own `.env` file locally and never commit it to version control.

## Firebase Setup - CRITICAL STEPS

**FAILURE TO FOLLOW THESE STEPS WILL RESULT IN THE APPLICATION NOT CONNECTING TO FIREBASE (e.g., "Could not reach Cloud Firestore backend" errors).**

### Service Account Key

Some scripts and deployment steps require Firebase Admin credentials. Generate a service account in the Firebase Console and download its JSON key. Store this file **outside** the repository and reference it via an environment variable, for example:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

The `serviceAccountKey.json` file is already listed in `.gitignore` and should never be committed to version control.

1.  **Create Firebase Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Add Web App:** Add a web application to your Firebase project.
3.  **Firebase Configuration (MOST IMPORTANT):**
    *   During web app setup, Firebase will provide an SDK configuration object.
    *   **You MUST copy this configuration object.**
    *   Open the `firebase.ts` file in this project.
    *   **Replace the placeholder values in `firebaseConfig` with YOUR actual Firebase project's configuration values.**
        ```typescript
        // Example in firebase.ts of what needs to be filled:
        const firebaseConfig = {
          apiKey: "YOUR_ACTUAL_API_KEY_HERE", // From Firebase Console
          authDomain: "YOUR_PROJECT_ID.firebaseapp.com", // From Firebase Console
          projectId: "YOUR_PROJECT_ID", // From Firebase Console
          storageBucket: "YOUR_PROJECT_ID.appspot.com", // From Firebase Console (domain may end with appspot.com or firebasestorage.app)
          storageBucket: "YOUR_PROJECT_ID.appspot.com", // From Firebase Console (verify if it's appspot.com or firebasestorage.app)
          messagingSenderId: "YOUR_SENDER_ID", // From Firebase Console
          appId: "YOUR_APP_ID" // From Firebase Console
        };
        ```
    *   **Double-check every field.** Pay special attention to `projectId`. The `storageBucket` is often `YOUR_PROJECT_ID.appspot.com`, but some newer projects use `YOUR_PROJECT_ID.firebasestorage.app`. Use the value shown in your Firebase project settings.
    *   **Storage bucket domains:** Projects created before 2023 typically use the `appspot.com` domain, while newer projects may use `firebasestorage.app`.
    *   **Double-check every field.** Pay special attention to `projectId`. The `storageBucket` value depends on your project: older Firebase projects use `YOUR_PROJECT_ID.appspot.com`, while newer ones use `YOUR_PROJECT_ID.firebasestorage.app`. Copy the exact value shown in your Firebase project settings.
    *   **If you see warnings in your browser console about placeholder values OR if the `projectId` in the console log from `firebase.ts` (e.g., "Firebase config loaded with Project ID: YOUR_PROJECT_ID") is not YOUR project ID, it means you have not updated this file correctly.**

4.  **Enable Services - ESPECIALLY FIRESTORE:** In the Firebase Console for your project:
    *   **Authentication:**
        *   Go to "Authentication" -> "Sign-in method".
        *   Enable "Email/Password".
        *   Enable "Google". You may need to provide a project support email.
        *   Enable "Facebook". This requires creating a Facebook App in the Facebook for Developers portal, obtaining an App ID and App Secret, and configuring them in Firebase. You'll also need to add the OAuth redirect URI (provided by Firebase) to your Facebook App's settings.
    *   **Firestore Database (CRITICAL FOR APP FUNCTIONALITY):**
        *   Go to "Firestore Database" in the left sidebar (under "Build").
        *   **If you see a "Create database" button, YOU MUST CLICK IT.** This means Firestore is not yet enabled for your project. This is a very common reason for "Could not reach Cloud Firestore backend" errors.
        *   Follow the prompts:
            *   Choose your server location (pick one close to your users).
            *   Start in **production mode** (recommended). You will then need to set up Security Rules.
            *   Click "Enable".
        *   If you have already created it, ensure it's active and there are no billing issues or suspensions on your project.

    *   **Storage:**
        *   Go to "Storage".
        *   Click "Get started".
        *   Follow the prompts to set up your storage bucket (usually default settings are fine).
5.  **Security Rules - ABSOLUTELY ESSENTIAL:**
    *   **Firestore Security Rules (`firestore.rules`):** You MUST write comprehensive security rules to protect your data. Without them, your database is publicly readable and writable. Define rules for each collection.
        *   **Initial (Restrictive) Firestore Rules for Production:**
            ```
            rules_version = '2';
            service cloud.firestore {
              match /databases/{database}/documents {
                // Default deny all reads and writes
                match /{document=**} {
                  allow read, write: if false;
                }

                // Allow users to read/write their own user document
                match /users/{userId} {
                  allow read, write: if request.auth != null && request.auth.uid == userId;
                }

                // Allow public read for 'live' therapist profiles
                match /therapistsData/{therapistId} {
                  allow read: if resource.data.accountStatus == 'live';
                  allow write: if request.auth != null && request.auth.uid == therapistId; // Therapist can write their own
                  // Admin access needs specific rules, e.g., checking a custom claim or 'users' collection for role
                }
                
                // Allow public read for 'live' clinic profiles
                match /clinicsData/{clinicId} {
                    allow read: if resource.data.accountStatus == 'live';
                    allow write: if request.auth != null && request.auth.uid == resource.data.ownerId; // Clinic owner can write
                }

                // Allow public read for clinic spaces if clinic is live
                match /clinicSpaces/{spaceId} {
                    allow read: if get(/databases/$(database)/documents/clinicsData/$(resource.data.clinicId)).data.accountStatus == 'live';
                    allow write: if request.auth != null && request.auth.uid == get(/databases/$(database)/documents/clinicsData/$(resource.data.clinicId)).data.ownerId;
                }
                
                // Allow authenticated users to write to their favorites
                match /users/{userId}/favorites/{therapistId} {
                    allow read, write, delete: if request.auth != null && request.auth.uid == userId;
                }

                // Allow anyone to submit an inquiry, but only admin to read/update
                match /userInquiries/{inquiryId} {
                    allow create: if true; // Or 'if request.auth != null;' to require login
                    allow read, update, delete: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
                }

                // Only admin can write/read activity logs
                 match /activityLog/{logId} {
                    allow read, write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
                 }
                 
                 // Membership History (example, adjust target_id field based on your actual structure)
                 match /{collectionName}/{docId}/membershipHistory/{historyId} {
                    allow read: if request.auth != null && (request.auth.uid == docId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN');
                    allow create: if request.auth != null && request.auth.uid == docId; // Only the user/owner themselves
                 }

                // Note: The above admin rules assume you have a 'role' field in your 'users/{userId}' documents.
                // You will need to expand these rules significantly for a production app.
              }
            }
            ```
    *   **Cloud Storage Security Rules (`storage.rules`):** Define rules for file uploads/downloads.
        *   **Initial (More Secure) Storage Rules:**
            ```
            rules_version = '2';
            service firebase.storage {
              match /b/{bucket}/o {
                // Default deny all reads and writes
                // match /{allPaths=**} {
                //  allow read, write: if false;
                // }

                // Allow users to write to their own profile picture path, make it publicly readable
                match /profile_pictures/{userId}/{fileName} {
                  allow read;
                  allow write: if request.auth != null && request.auth.uid == userId && request.resource.size < 2 * 1024 * 1024; // Max 2MB
                }

                // Therapist specific files (certifications, intro_videos)
                match /therapist_profiles/{userId}/{subPath}/{fileName} {
                   allow read; // Consider making these readable only by owner/admin or if therapist is 'live'
                   allow write: if request.auth != null && request.auth.uid == userId;
                   // Add size checks, e.g.,
                   // if subPath == 'certifications' && request.resource.size < 5 * 1024 * 1024;
                }

                // Clinic specific files (profile_picture, additional_photos)
                 match /clinic_profiles/{clinicId}/{subPath}/{fileName} {
                   allow read;
                   // For write access, ensure the authenticated user is the owner of the clinic.
                   // This typically requires checking a field in the clinicsData document.
                   allow write: if request.auth != null && request.auth.uid == get(/databases/$(database)/documents/clinicsData/$(clinicId)).data.ownerId;
                }
                
                // Clinic space photos
                 match /clinic_spaces/{clinicId}/{spaceId}/{fileName} {
                   allow read;
                   // Similarly, check ownership for write access.
                   allow write: if request.auth != null && request.auth.uid == get(/databases/$(database)/documents/clinicsData/$(clinicId)).data.ownerId;
                }

                // Payment Receipts
                match /{receiptPath}/{userIdOrClinicId}/{fileName}
                  where receiptPath == 'therapist_payment_receipts' || receiptPath == 'clinic_payment_receipts' {
                    // Only owner and Admin should read. Admin logic might need secure backend (Cloud Function) or custom claims.
                    allow read: if request.auth != null && (request.auth.uid == userIdOrClinicId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN');
                    allow write: if request.auth != null && request.auth.uid == userIdOrClinicId && request.resource.size < 2 * 1024 * 1024; // Max 2MB
                }
              }
            }
            ```
    *   Deploy these rules from the Firebase Console ("Storage" -> "Rules" and "Firestore Database" -> "Rules"). **Do not skip this step.**
6.  **Data Migration (Optional):** If you have existing data from a PHP/MySQL backend, plan and execute a migration to Firestore. This might involve writing scripts to transform and import your data.

## Project Structure (Post-Firebase Migration)

```
/ (e.g., public_html on Hostinger, or your project root)
├── index.html
├── index.tsx
├── firebase.ts           # Firebase initialization (NEEDS YOUR CONFIG)
├── App.tsx
├── components/
├── contexts/
├── pages/
├── locales/ (en.json, ar.json)
├── types.ts
├── constants.ts
├── README.md
├── metadata.json
├── vite.config.ts
├── tsconfig.json
├── package.json
└── public/
    ├── manifest.json
    ├── service-worker.js
    ├── offline.html
    ├── icons/
    └── flower-texture.png
```
The `/backend` directory (PHP files, composer.json) and `readmedb.txt` are no longer part of the project with Firebase as the backend.

## Key Firebase SDKs Used
*   `firebase/app`
*   `firebase/auth`
*   `firebase/firestore`
*   `firebase/storage`

## Development and Deployment
*   **Development:** Run `npm run dev` (or `yarn dev`).
*   **Build:** Run `npm run build` (or `yarn build`) to create a production build in the `dist` directory.

## Backend Scripts

The project includes comprehensive backend scripts for managing your Firebase project:

### User Management
- `npm run add-sample-users` - Add the 4 main sample users (client, therapist, clinic owner, admin)
- `npm run seed-demo-data` - Create comprehensive demo data including therapists, clinics, and spaces
- `npm run cleanup-demo-data` - Remove all demo data from the database

### Data Management
- `npm run backup-data` - Create a complete backup of all Firestore collections
- `npm run restore-data <backup-file>` - Restore data from a backup file
- `npm run validate-firestore` - Validate database structure and find issues
- `npm run migrate-data` - Run database migrations for schema updates

### Development Tools
- `npm run generate-security-rules` - Generate Firestore and Storage security rules
- `npm run monitor-firestore` - Real-time monitoring of database changes

### Usage Examples
```bash
# Set up initial demo environment
npm run add-sample-users
npm run seed-demo-data

# Create a backup before making changes
npm run backup-data

# Restore from a specific backup
npm run restore-data backup-2024-01-01T12-00-00-000Z.json

# Clean up demo data
npm run cleanup-demo-data

# Monitor database in real-time
npm run monitor-firestore
```

*   **Deployment (e.g., Hostinger, Vercel, Netlify, Firebase Hosting):**
    1.  Build the application (`npm run build`).
    2.  Upload the contents of the `dist` directory to your hosting server (e.g., into `public_html` or a subdirectory like `public_html/app`). If using Firebase Hosting, use `firebase deploy`.
    3.  **Server Configuration for `BrowserRouter`:** Since this project uses `BrowserRouter`, your server must be configured to handle client-side routing. All routes (e.g., `/find`, `/login`, `/dashboard/therapist`) should be redirected to serve `index.html`.
        *   **For Firebase Hosting**, add the following to your `firebase.json` file:
            ```json
            {
              "hosting": {
                "public": "dist",
                "ignore": [
                  "firebase.json",
                  "**/.*",
                  "**/node_modules/**"
                ],
                "rewrites": [
                  {
                    "source": "**",
                    "destination": "/index.html"
                  }
                ]
              }
            }
            ```
        *   **For other servers (like Apache or Nginx)**, you will need to configure similar rewrite rules.
    4.  Ensure your Firebase project's authorized domains in the Firebase Console Authentication settings include your live domain(s).
    5.  If deploying to a subdirectory (e.g., `/app/`), ensure the `base` path in `vite.config.ts` is set correctly (`base: '/app/'`) before building.

**Remember to configure Firebase correctly in `firebase.ts` AND ENABLE FIRESTORE DATABASE in the Firebase console, and set up Firestore and Storage security rules before deploying to production.**
## Data Connect Deployment

To keep Firestore and Postgres in sync, Cloud Functions forward document changes to Firebase Data Connect.

1. Deploy the Data Connect schema and connector:
   ```bash
   firebase dataconnect:deploy
   ```
2. Configure the Cloud Functions environment with your Data Connect endpoint. For local development copy `.env.example` to `.env` and fill in the values:
   ```
   DATA_CONNECT_ENDPOINT=https://us-central1-your-project.fdc.googleapis.com/graphql
   DATA_CONNECT_SERVICE_ID=theraway-v3
   DATA_CONNECT_LOCATION=us-central1
   ```
   For deployed functions set the variables:
   ```bash
   firebase functions:config:set dataconnect.endpoint="https://us-central1-your-project.fdc.googleapis.com/graphql" \
     dataconnect.service_id="theraway-v3" dataconnect.location="us-central1"
   ```
3. Build and deploy the functions:
   ```bash
   npm --prefix functions run build
   firebase deploy --only functions
   ```

Failed sync operations are retried automatically and logged for troubleshooting.
