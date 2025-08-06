/* eslint-disable max-len */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {GoogleAuth} from "google-auth-library";
import {UserRole} from "../../types"; // Adjust path as needed

admin.initializeApp();

const DATA_CONNECT_ENDPOINT = process.env.DATA_CONNECT_ENDPOINT ||
  functions.config().dataconnect?.endpoint;
const googleAuth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

/**
 * Executes a GraphQL operation against the Data Connect endpoint with retry.
 * @param {string} query The GraphQL query or mutation string.
 * @param {Record<string, unknown>} variables Variables for the GraphQL operation.
 * @param {number} attempt Current retry attempt.
 * @return {Promise<unknown>} Resolves with the Data Connect response data.
 */
async function callDataConnect(
  query: string,
  variables: Record<string, unknown>,
  attempt = 0,
): Promise<unknown> {
  const maxAttempts = 3;
  try {
    const accessToken = await googleAuth.getAccessToken();
    const response = await fetch(DATA_CONNECT_ENDPOINT as string, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({query, variables}),
    });
    const json = await response.json();
    if (json.errors) {
      throw new Error(JSON.stringify(json.errors));
    }
    return json.data;
  } catch (err) {
    if (attempt < maxAttempts) {
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(
        `Data Connect request failed (attempt ${attempt + 1}):`,
        err,
      );
      await new Promise((res) => setTimeout(res, delay));
      return callDataConnect(query, variables, attempt + 1);
    }
    console.error("Data Connect request failed after retries:", err);
    throw err;
  }
}

/**
 * Converts Firestore data (including Timestamps) into plain JSON.
 * @param {unknown} data Arbitrary Firestore data.
 * @return {unknown} Serialized data ready for transmission.
 */
function serializeFirestoreData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  // Firestore Timestamp has toDate method
  if (typeof (data as {toDate?: unknown}).toDate === "function") {
    return (data as {toDate: () => Date}).toDate().toISOString();
  }
  if (Array.isArray(data)) {
    return data.map((item) => serializeFirestoreData(item));
  }
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeFirestoreData(value);
    }
    return result;
  }
  return data;
}

/**
 * Assigns a default 'client' role to new users upon creation and sets custom claims.
 * Also creates a corresponding user document in Firestore.
 */
export const assignDefaultRoleAndCreateUserDocument = functions.auth.user()
  .onCreate(async (user: functions.auth.UserRecord) => {
    try {
      const customClaims = {
        roles: [UserRole.CLIENT],
      };

      // Set custom user claims on the Firebase Auth user
      await admin.auth().setCustomUserClaims(user.uid, customClaims);
      console.log(`Custom claims set for user ${user.uid}: ` +
                  `${JSON.stringify(customClaims)}`);

      // Send email verification if the user has an email
      if (user.email && !user.emailVerified) {
        // Note: This requires Firebase project settings to allow email action links
        // to be sent from a trusted domain (e.g., your Firebase Hosting domain).
        // The actual email sending is handled by Firebase Auth backend.
        await admin.auth().generateEmailVerificationLink(user.email)
          .then((link) => {
            console.log(`Email verification link for ${user.email}: ${link}`);
            // In a real app, you'd typically send this link via a custom email
            // service or use Firebase's built-in email templates.
            // For now, we just log it.
          })
          .catch((error) => {
            console.error("Error generating email verification link:", error);
          });
      }

      // Create a corresponding user document in Firestore
      const userRef = admin.firestore().collection("users").doc(user.uid);
      await userRef.set({
        id: user.uid,
        email: user.email,
        roles: [UserRole.CLIENT], // Store roles in Firestore for easier querying/display
        name: user.displayName || "New User",
        profilePictureUrl: user.photoURL || "",
        isDemoAccount: false,
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        accountStatus: "active",
        // Add other default fields as needed
      }, {merge: true}); // Use merge: true to avoid overwriting if document
      // already exists (e.g., from a previous manual creation)

      console.log(`User document created/updated for user ${user.uid} in ` +
                  "Firestore.");

      // You might want to update the user's token to reflect the new claims immediately
      // This requires the client to re-authenticate or refresh their token.
      // For web clients, a page refresh usually suffices.
      // For mobile, you might need to explicitly call getIdToken(true).
      return true;
    } catch (error) {
      console.error("Error assigning default role and creating user document:",
        error);
      return false;
    }
  });

/**
 * Example function to update a user's role (e.g., by an admin).
 * This function would typically be called via an HTTP request or another trigger
 * from an admin interface.
 *
 * To call this function, an authenticated admin user would make an HTTP POST request
 * to its endpoint with the target userId and newRoles in the request body.
 *
 * Example Request Body:
 * {
 *   "userId": "someUserId",
 *   "newRoles": ["therapist", "client"]
 * }
 */
export const updateUserRole = functions.https.onCall(async (data: { userId: string; newRoles: UserRole[] }, context: functions.https.CallableContext) => {
  // 1. Authenticate and Authorize: Only allow authenticated admins to call this function
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  const callerUid = context.auth.uid;
  const callerClaims = (await admin.auth().getUser(callerUid)).customClaims;

  if (!callerClaims || !callerClaims.roles || !callerClaims.roles.includes(UserRole.ADMIN)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can update user roles.",
    );
  }

  // 2. Validate Input
  const {userId, newRoles} = data;

  if (!userId || !Array.isArray(newRoles) || newRoles.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid input: userId and newRoles (array) are required.",
    );
  }

  // Ensure newRoles only contain valid roles
  const validRoles = Object.values(UserRole);
  if (!newRoles.every((role: string) => validRoles.includes(role as UserRole))) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid input: newRoles contains invalid role(s).",
    );
  }

  try {
    // 3. Update Custom Claims
    const targetUser = await admin.auth().getUser(userId);
    const currentCustomClaims = targetUser.customClaims || {};
    const updatedCustomClaims = {...currentCustomClaims, roles: newRoles};

    await admin.auth().setCustomUserClaims(userId, updatedCustomClaims);
    console.log(`Custom claims updated for user ${userId}: ` +
                `${JSON.stringify(updatedCustomClaims)}`);

    // 4. Update Firestore User Document
    const userRef = admin.firestore().collection("users").doc(userId);
    await userRef.update({roles: newRoles});
    console.log(`User document roles updated for user ${userId} in Firestore.`);

    return {success: true, message: `Roles for user ${userId} updated to ` +
      `${newRoles.join(", ")}`};
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "auth/user-not-found") {
      throw new functions.https.HttpsError(
        "not-found",
        `User with ID ${userId} not found.`,
      );
    }
    console.error("Error updating user role:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to update user role.",
      (error as Error).message,
    );
  }
});

export const syncUserToDataConnect = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    if (!DATA_CONNECT_ENDPOINT) {
      console.warn("DATA_CONNECT_ENDPOINT not configured.");
      return;
    }

    const userId = context.params.userId as string;
    const data = change.after.exists ?
      (serializeFirestoreData(change.after.data()) as
          Record<string, unknown>) :
      null;

    try {
      if (!change.after.exists) {
        const mutation =
          "mutation deleteUser($id: String!) { deleteFromusersCollection(filter: {id: {eq: $id}}) { records { id } } }";
        const result = await callDataConnect(mutation, {id: userId}) as {
          deleteFromusersCollection: {records: unknown[]};
        };
        if (result.deleteFromusersCollection.records.length === 0) {
          console.log(`No Data Connect record to delete for user ${userId}.`);
        } else {
          console.log(`Deleted user ${userId} from Data Connect.`);
        }
        return;
      }

      if (!change.before.exists) {
        const mutation =
          "mutation createUser($user: User_InsertInput!) { insertIntousersCollection(objects: [$user]) { records { id } } }";
        try {
          await callDataConnect(mutation, {user: data});
          console.log(`Created user ${userId} in Data Connect.`);
        } catch (err) {
          console.warn(`Create user failed for ${userId}, attempting update:`, err);
          const updateMutation =
            "mutation updateUser($id: String!, $updates: User_UpdateInput!) { updateusersCollection(filter: {id: {eq: $id}}, atMost: 1, set: $updates) { records { id } } }";
          await callDataConnect(updateMutation, {id: userId, updates: data});
          console.log(`Updated user ${userId} in Data Connect after create conflict.`);
        }
        return;
      }

      const updateMutation =
        "mutation updateUser($id: String!, $updates: User_UpdateInput!) { updateusersCollection(filter: {id: {eq: $id}}, atMost: 1, set: $updates) { records { id } } }";
      const updateResult = await callDataConnect(updateMutation, {id: userId, updates: data}) as {
        updateusersCollection: {records: unknown[]};
      };
      if (updateResult.updateusersCollection.records.length === 0) {
        const createMutation =
          "mutation createUser($user: User_InsertInput!) { insertIntousersCollection(objects: [$user]) { records { id } } }";
        await callDataConnect(createMutation, {user: data});
        console.log(`Created user ${userId} in Data Connect after missing update.`);
      } else {
        console.log(`Updated user ${userId} in Data Connect.`);
      }
    } catch (err) {
      console.error(`Failed to sync user ${userId}:`, err);
    }
  });
