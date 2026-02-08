"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { getUserData } from "@/lib/firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { User } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

// Ensure user document exists — uses setDoc with merge so it resolves
// instantly from local cache. Does NOT include `role` to avoid overwriting
// a previously selected role.
async function ensureUserDocument(fbUser: FirebaseUser): Promise<void> {
  const userRef = doc(db, "users", fbUser.uid);
  await setDoc(userRef, {
    email: fbUser.email,
    displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
    photoURL: fbUser.photoURL || null,
  }, { merge: true });
}

// Wrap a promise with a timeout so it never hangs forever
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const refreshUser = async () => {
    if (firebaseUser) {
      const userData = await withTimeout(getUserData(firebaseUser.uid), 5000, null);
      setUser(userData);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Set a timeout to prevent infinite loading if Firebase fails to initialize
    const timeout = setTimeout(() => {
      if (loading) {
        console.error("Firebase auth initialization timeout");
        setLoading(false);
      }
    }, 10000);

    let unsubscribe: () => void;

    try {
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        setFirebaseUser(fbUser);

        if (fbUser) {
          try {
            // Ensure user document exists (resolves fast via local cache)
            ensureUserDocument(fbUser).catch(console.error);

            // Load user data with a timeout to prevent hanging
            const userData = await withTimeout(getUserData(fbUser.uid), 5000, null);
            setUser(userData);
          } catch (error) {
            console.error("Error fetching user data:", error);
            setUser(null);
          }
        } else {
          setUser(null);
        }

        clearTimeout(timeout);
        setLoading(false);
      }, (error) => {
        console.error("Auth state change error:", error);
        clearTimeout(timeout);
        setLoading(false);
      });
    } catch (error) {
      console.error("Firebase auth initialization error:", error);
      clearTimeout(timeout);
      setLoading(false);
      return;
    }

    return () => {
      clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
    };
  }, [mounted]);

  // Show loading spinner only after mounting on client
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
