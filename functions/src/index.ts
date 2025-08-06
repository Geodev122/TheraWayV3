import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Assigns a default 'client' role to new users upon creation and sets custom claims.
 * Also creates a corresponding user document in Firestore.
 */
export const assignDefaultRoleAndCreateUserDocument = functions.auth.user()
  .onCreate(async (user: functions.auth.UserRecord) => {
    try {
      const customClaims = {
        roles: ["client"],
      };

      // Set custom user claims on the Firebase Auth user
      await admin.auth().setCustomUserClaims(user.uid, customClaims);
      console.log(`Custom claims set for user ${user.uid}: ` +
                  `${JSON.stringify(customClaims)}`);

      // Create a corresponding user document in Firestore
      const userRef = admin.firestore().collection("users").doc(user.uid);
      await userRef.set({
        id: user.uid,
        email: user.email,
        roles: ["client"], // Store roles in Firestore for easier querying/display
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
export const updateUserRole = https.onCall(async (data: { userId: string; newRoles: string[] }, context: https.CallableContext) => {
  // 1. Authenticate and Authorize: Only allow authenticated admins to call this function
  if (!context.auth) {
    throw new https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  const callerUid = context.auth.uid;
  const callerClaims = (await admin.auth().getUser(callerUid)).customClaims;

  if (!callerClaims || !callerClaims.roles || !callerClaims.roles.includes("admin")) {
    throw new https.HttpsError(
      "permission-denied",
      "Only admins can update user roles.",
    );
  }

  // 2. Validate Input
  const {userId, newRoles} = data;

  if (!userId || !Array.isArray(newRoles) || newRoles.length === 0) {
    throw new https.HttpsError(
      "invalid-argument",
      "Invalid input: userId and newRoles (array) are required.",
    );
  }

  // Ensure newRoles only contain valid roles (optional, but good practice)
  const validRoles = ["admin", "therapist", "client", "clinic_owner"];
  if (!newRoles.every((role: string) => validRoles.includes(role))) {
    throw new https.HttpsError(
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
      throw new https.HttpsError(
        "not-found",
        `User with ID ${userId} not found.`,
      );
    }
    console.error("Error updating user role:", error);
    throw new https.HttpsError(
      "internal",
      "Failed to update user role.",
      (error as Error).message,
    );
  }
});
