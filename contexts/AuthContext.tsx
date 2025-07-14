
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../firebase'; // Ensure firebase.ts is correctly set up
import { User, UserRole } from '../types';
import { DEFAULT_USER_ROLE, APP_NAME } from '../constants';

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

interface AuthContextType {
  user: User | null; 
  firebaseUser: FirebaseUser | null; 
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (name: string, email: string, password?: string, roles?: UserRole[]) => Promise<void>; // Updated to accept roles array
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  logout: () => void;
  updateUserAuthContext: (updatedUserData: Partial<User>) => Promise<void>;
  authLoading: boolean;
  authError: string | null;
  promptLogin: (actionAttempted?: string) => void;
  isLoginPromptVisible: boolean;
  closeLoginPrompt: () => void;
  actionAttempted: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null); 
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null); 
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoginPromptVisible, setIsLoginPromptVisible] = useState(false);
  const [actionAttempted, setActionAttempted] = useState<string | null>(null);

  const mapAuthCodeToMessage = useCallback((authCode: string, provider?: string): string => {
    switch (authCode) {
      case 'auth/invalid-email':
        return 'The email address is not valid.';
      case 'auth/user-disabled':
        return 'This user account has been disabled.';
      case 'auth/user-not-found':
        return 'No user found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'This email address is already in use by another account.';
      case 'auth/weak-password':
        return 'The password is too weak. Please choose a stronger password.';
      case 'auth/requires-recent-login':
        return 'This operation is sensitive and requires recent authentication. Please log in again before retrying this request.';
      case 'auth/too-many-requests':
        return `Access to this account has been temporarily disabled due to many failed login attempts. You can try again later or reset your password. (${APP_NAME})`;
      case 'auth/popup-closed-by-user':
        return `Sign-in popup closed by user. Please try again if you wish to sign in with ${provider || 'the selected provider'}.`;
      case 'auth/account-exists-with-different-credential':
        return `An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.`;
      case 'unavailable': 
        return 'The service is currently unavailable. Please check your internet connection and Firebase setup (see console for details).';
      default:
        return `An unexpected authentication error occurred (${authCode}). Please try again.`;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setAuthLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, 'users', fbUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const existingUserData = userDocSnap.data() as User;
            const updates: Partial<User> = {};
            if (fbUser.displayName && fbUser.displayName !== existingUserData.name) {
              updates.name = fbUser.displayName;
            }
            if (fbUser.photoURL && fbUser.photoURL !== existingUserData.profilePictureUrl) {
              updates.profilePictureUrl = fbUser.photoURL;
            }
            // Ensure email is synced if it was null or a placeholder before
             if (fbUser.email && (!existingUserData.email || existingUserData.email.startsWith('social_'))) {
                updates.email = fbUser.email;
            }

            if (Object.keys(updates).length > 0) {
              await updateDoc(userDocRef, { ...updates, updatedAt: serverTimestamp() });
              setUser({ ...existingUserData, ...updates });
            } else {
              setUser(existingUserData);
            }
          } else {
            // User document DNE. Create it. This is for first-time social login.
            const newTheraWayUser: User = {
              id: fbUser.uid,
              email: fbUser.email || `social_${fbUser.uid}@${fbUser.providerData?.[0]?.providerId || 'theraway.app'}`, // Fallback email
              name: fbUser.displayName || 'New User',
              roles: [DEFAULT_USER_ROLE], // Default to an array with the client role
              profilePictureUrl: fbUser.photoURL,
            };
            await setDoc(doc(db, 'users', fbUser.uid), {
              ...newTheraWayUser,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setUser(newTheraWayUser);
            console.log(`AuthContext: Created new Firestore user document for social login: ${fbUser.uid}`);
          }
        } catch (error: any) {
          console.error("AuthContext: Error fetching/creating user document from Firestore:", error);
          if (error.code === 'unavailable') {
            console.error(
              `%cCRITICAL AUTH ERROR: Firestore is UNAVAILABLE (Error Code: ${error.code}). This is preventing user profiles from loading.
              TROUBLESHOOTING STEPS:
              1. INTERNET: Ensure your device has a stable internet connection.
              2. FIREBASE CONFIG: Open 'firebase.ts'. Verify that 'firebaseConfig' is 100% correct for YOUR project (current projectId: "${firebaseConfig.projectId}").
              3. ENABLE FIRESTORE (MOST LIKELY CAUSE):
                 - Go to the Firebase Console for your project ("${firebaseConfig.projectId}").
                 - In the left sidebar, navigate to "Build" > "Firestore Database".
                 - If you see a "Create database" button, YOU MUST CLICK IT and complete the setup.
                 - Ensure Firestore is explicitly enabled and active.
              4. SECURITY RULES: Ensure your Firestore security rules allow authenticated users to read/write their own document in the 'users' collection (e.g., 'allow read, write: if request.auth.uid == userId;'). Review the 'firestore.rules' examples in README.md.
              5. API KEY RESTRICTIONS (less common): If you have set up API key restrictions in Google Cloud Console, ensure the "Cloud Firestore API" is enabled for the key and your domain is allowed.
              The application cannot function correctly until Firestore is reachable. The app will attempt to sign you out.`,
              'color: red; font-weight: bold; font-size: 14px;'
            );
             setAuthError(`Failed to load user profile: Firestore is unavailable. Check console for troubleshooting. (${error.code})`);
          } else {
             setAuthError(`Failed to load user profile. (${error.code || 'Unknown error'})`);
          }
          await signOut(auth); // Attempt to sign out to prevent broken state
          setUser(null);
          setFirebaseUser(null);
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [mapAuthCodeToMessage]);

  const isAuthenticated = !!firebaseUser && !!user;

  const updateUserAuthContext = useCallback(async (updatedUserData: Partial<User>) => {
    setUser(prevUser => {
        if (!prevUser) return null;
        return { ...prevUser, ...updatedUserData };
    });
    if (firebaseUser && updatedUserData) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        await updateDoc(userDocRef, {
            ...updatedUserData,
            updatedAt: serverTimestamp()
        });
    }
  }, [firebaseUser]);

  const login = useCallback(async (email: string, password?: string) => {
    setAuthLoading(true);
    setAuthError(null);
    if (!password) {
        setAuthError("Password is required for login.");
        setAuthLoading(false);
        return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsLoginPromptVisible(false);
      setActionAttempted(null);
    } catch (error: any) {
      setAuthError(error.code ? mapAuthCodeToMessage(error.code) : "Login failed. Please check your credentials.");
      setUser(null); 
      setFirebaseUser(null); 
    } finally {
      setAuthLoading(false);
    }
  }, [mapAuthCodeToMessage]);

  const signup = useCallback(async (name: string, email: string, password?: string, roles: UserRole[] = [DEFAULT_USER_ROLE]) => {
    setAuthLoading(true);
    setAuthError(null);
    if (!password) {
        setAuthError("Password is required for signup.");
        setAuthLoading(false);
        return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      
      const theraWayUser: User = {
        id: fbUser.uid,
        email: fbUser.email || email,
        name: name,
        roles: roles.length > 0 ? roles : [DEFAULT_USER_ROLE], // Ensure there's at least one role
        profilePictureUrl: fbUser.photoURL, 
      };

      await setDoc(doc(db, 'users', fbUser.uid), {
        ...theraWayUser,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setUser(theraWayUser); 
      setFirebaseUser(fbUser); 
      setIsLoginPromptVisible(false);
      setActionAttempted(null);
    } catch (error: any) {
      setAuthError(error.code ? mapAuthCodeToMessage(error.code) : "Signup failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, [mapAuthCodeToMessage]);

  const socialSignIn = async (provider: GoogleAuthProvider | FacebookAuthProvider, providerName: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting user and firebaseUser states,
      // including Firestore document creation/update for social users.
      setIsLoginPromptVisible(false);
      setActionAttempted(null);
    } catch (error: any) {
      setAuthError(error.code ? mapAuthCodeToMessage(error.code, providerName) : `Sign in with ${providerName} failed.`);
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithGoogle = useCallback(async () => {
    await socialSignIn(googleProvider, 'Google');
  }, []);

  const signInWithFacebook = useCallback(async () => {
    await socialSignIn(facebookProvider, 'Facebook');
  }, []);

  const logout = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setIsLoginPromptVisible(false);
      setActionAttempted(null);
    } catch (error: any) {
      console.error("Logout error:", error);
      setAuthError("Failed to logout.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const promptLogin = useCallback((action?: string) => {
    setActionAttempted(action || null);
    setIsLoginPromptVisible(true);
  }, []);

  const closeLoginPrompt = useCallback(() => {
    setIsLoginPromptVisible(false);
    setActionAttempted(null);
  }, []);

  return (
    <AuthContext.Provider value={{
        user,
        firebaseUser,
        isAuthenticated,
        login,
        signup,
        signInWithGoogle,
        signInWithFacebook,
        logout,
        updateUserAuthContext,
        authLoading,
        authError,
        promptLogin,
        isLoginPromptVisible,
        closeLoginPrompt,
        actionAttempted
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};