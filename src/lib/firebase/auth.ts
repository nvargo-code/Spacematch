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
import { auth } from "./config";
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

  // User document creation is handled by AuthProvider via POST /api/user
  return user;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<FirebaseUser> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  // User document ensure is handled by AuthProvider via POST /api/user
  return user;
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const { user } = await signInWithPopup(auth, googleProvider);
  // User document ensure is handled by AuthProvider via POST /api/user
  return user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const res = await fetch("/api/user/role", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: userId, role }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update role");
  }
}

export async function getUserData(userId: string): Promise<User | null> {
  // On the server (e.g. webhook routes), call Firestore REST API directly
  // On the client, call our API route
  const isServer = typeof window === "undefined";

  let url: string;
  if (isServer) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;
  } else {
    url = `/api/user?uid=${encodeURIComponent(userId)}`;
  }

  const res = await fetch(url);

  if (isServer) {
    // Parse Firestore REST response directly
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error("getUserData REST error:", res.status);
      return null;
    }
    const doc = await res.json();
    const fields = doc.fields || {};
    const sv = (f: { stringValue?: string }) => f?.stringValue || "";
    const iv = (f: { integerValue?: string }) => f?.integerValue ? parseInt(f.integerValue, 10) : 0;
    return {
      id: userId,
      email: sv(fields.email),
      displayName: sv(fields.displayName),
      photoURL: fields.photoURL?.stringValue || undefined,
      role: (sv(fields.role) || null) as User["role"],
      bio: sv(fields.bio),
      location: sv(fields.location),
      createdAt: fields.createdAt?.timestampValue ? new Date(fields.createdAt.timestampValue) : new Date(),
      stripeCustomerId: fields.stripeCustomerId?.stringValue,
      activePostCount: iv(fields.activePostCount),
      extraPostCredits: iv(fields.extraPostCredits),
    };
  }

  // Client-side: parse API route response
  if (!res.ok) {
    console.error("getUserData fetch error:", res.status);
    return null;
  }
  const data = await res.json();
  if (!data.user) return null;

  return {
    ...data.user,
    createdAt: data.user.createdAt ? new Date(data.user.createdAt) : new Date(),
  };
}

export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<User, "displayName" | "bio" | "location" | "photoURL">>
): Promise<void> {
  // updateUserProfile still uses SDK for now (non-critical path)
  const { doc, setDoc } = await import("firebase/firestore");
  const { db } = await import("./config");
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, data, { merge: true });
}
