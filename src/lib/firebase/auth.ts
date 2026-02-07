import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";
import { User, UserRole } from "@/types";

const googleProvider = new GoogleAuthProvider();

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  await updateProfile(user, { displayName });
  await sendEmailVerification(user);

  await createUserDocument(user);

  return user;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<FirebaseUser> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);

  // Ensure user document exists (in case it wasn't created during signup)
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    await createUserDocument(user);
  }

  return user;
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const { user } = await signInWithPopup(auth, googleProvider);

  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    await createUserDocument(user);
  }

  return user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

async function createUserDocument(user: FirebaseUser): Promise<void> {
  const userRef = doc(db, "users", user.uid);

  await setDoc(userRef, {
    email: user.email,
    displayName: user.displayName || user.email?.split("@")[0],
    photoURL: user.photoURL || null,
    role: null,
    bio: "",
    location: "",
    createdAt: serverTimestamp(),
    activePostCount: 0,
    extraPostCredits: 0,
  });
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, { role }, { merge: true });
}

export async function getUserData(userId: string): Promise<User | null> {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return null;
  }

  const data = userDoc.data();
  return {
    id: userDoc.id,
    email: data.email,
    displayName: data.displayName,
    photoURL: data.photoURL,
    role: data.role,
    bio: data.bio,
    location: data.location,
    createdAt: data.createdAt?.toDate() || new Date(),
    stripeCustomerId: data.stripeCustomerId,
    activePostCount: data.activePostCount || 0,
    extraPostCredits: data.extraPostCredits || 0,
  };
}

export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<User, "displayName" | "bio" | "location" | "photoURL">>
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, data, { merge: true });
}
