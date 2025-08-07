import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { UserRole } from "./types";
import { GoogleAuth } from "google-auth-library";

admin.initializeApp();

const DATA_CONNECT_ENDPOINT = process.env.DATA_CONNECT_ENDPOINT ||
  functions.config().dataconnect?.endpoint;
const googleAuth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

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
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query, variables }),
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

function serializeFirestoreData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof (data as { toDate?: unknown }).toDate === "function") {
    return (data as { toDate: () => Date }).toDate().toISOString();
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

export const assignDefaultRoleAndCreateUserDocument = functions.auth
  .user()
  .onCreate(async (user: functions.auth.UserRecord) => {
    try {
      const customClaims = {
        roles: [UserRole.CLIENT],
      };

      await admin.auth().setCustomUserClaims(user.uid, customClaims);
      console.log(`Custom claims set for user ${user.uid}: ` +
        `${JSON.stringify(customClaims)}`);

      if (user.email && !user.emailVerified) {
        try {
          const link = await admin.auth().generateEmailVerificationLink(user.email);
          console.log(`Email verification link for ${user.email}: ${link}`);
        } catch (error) {
          console.error("Error generating email verification link:", error);
        }
      }

      const userRef = admin.firestore().collection("users").doc(user.uid);
      await userRef.set(
        {
          id: user.uid,
          email: user.email,
          roles: [UserRole.CLIENT],
          name: user.displayName || "New User",
          profilePictureUrl: user.photoURL || "",
          isDemoAccount: false,
          lastLogin: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isActive: true,
          accountStatus: "active",
        },
        { merge: true },
      );

      console.log(`User document created/updated for user ${user.uid} in Firestore.`);
      return true;
    } catch (error) {
      console.error("Error assigning default role and creating user document:", error);
      return false;
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
    const data = change.after.exists
      ? (serializeFirestoreData(change.after.data()) as Record<string, unknown>)
      : null;

    try {
      if (!change.after.exists) {
        const mutation =
          "mutation deleteUser($id: String!) { deleteFromusersCollection(filter: {id: {eq: $id}}) { records { id } } }";
        const result = (await callDataConnect(mutation, { id: userId })) as {
          deleteFromusersCollection: { records: unknown[] };
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
          await callDataConnect(mutation, { user: data });
          console.log(`Created user ${userId} in Data Connect.`);
        } catch (err) {
          console.warn(`Create user failed for ${userId}, attempting update:`, err);
          const updateMutation =
            "mutation updateUser($id: String!, $updates: User_UpdateInput!) { updateusersCollection(filter: {id: {eq: $id}}, atMost: 1, set: $updates) { records { id } } }";
          await callDataConnect(updateMutation, { id: userId, updates: data });
          console.log(`Updated user ${userId} in Data Connect after create conflict.`);
        }
        return;
      }

      const updateMutation =
        "mutation updateUser($id: String!, $updates: User_UpdateInput!) { updateusersCollection(filter: {id: {eq: $id}}, atMost: 1, set: $updates) { records { id } } }";
      const updateResult = (await callDataConnect(updateMutation, { id: userId, updates: data })) as {
        updateusersCollection: { records: unknown[] };
      };
      if (updateResult.updateusersCollection.records.length === 0) {
        const createMutation =
          "mutation createUser($user: User_InsertInput!) { insertIntousersCollection(objects: [$user]) { records { id } } }";
        await callDataConnect(createMutation, { user: data });
        console.log(`Created user ${userId} in Data Connect after missing update.`);
      } else {
        console.log(`Updated user ${userId} in Data Connect.`);
      }
    } catch (err) {
      console.error(`Failed to sync user ${userId}:`, err);
    }
  });
