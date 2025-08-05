import admin from "firebase-admin";
import { readFileSync } from "fs";

// Load the service account key JSON file
const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf8")
);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://theraway-draft-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.firestore();

// Load the data to import
const filesToImport = process.argv.slice(2);

if (filesToImport.length === 0) {
  console.log("Usage: node importFirestore.js <file1.json> [file2.json ...]");
  process.exit(1);
}

const importData = async () => {
  for (const filePath of filesToImport) {
    try {
      const data = JSON.parse(readFileSync(filePath, "utf8"));
      console.log(`\nImporting data from: ${filePath}`);
      for (const [collectionName, documents] of Object.entries(data)) {
        const collectionRef = db.collection(collectionName);
        for (const [docId, docData] of Object.entries(documents)) {
          await collectionRef.doc(docId).set(docData);
          console.log(`  Imported document: ${docId} into collection: ${collectionName}`);
        }
      }
    } catch (error) {
      console.error(`Error importing data from ${filePath}:`, error.message);
    }
  }
  console.log("\nAll specified data imports complete!");
};

importData().catch((error) => {
  console.error("An unexpected error occurred:", error);
});
