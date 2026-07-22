import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import { app } from "./config";

// The auth instance from Firebase
export const auth = getAuth(app);

// Provider configs
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signInWithEmail = async (email: string, password: string): Promise<FirebaseUser> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

export const getCurrentUser = (): Promise<FirebaseUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};
