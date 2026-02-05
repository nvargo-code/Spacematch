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
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { User } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

// Create user document if it doesn't exist
async function ensureUserDocument(fbUser: FirebaseUser): Promise<void> {
  const userRef = doc(db, "users", fbUser.uid);
  await setDoc(userRef, {
    email: fbUser.email,
    displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
    photoURL: fbUser.photoURL || null,
    role: null,
    bio: "",
    location: "",
    createdAt: serverTimestamp(),
    activePostCount: 0,
    extraPostCredits: 0,
  }, { merge: true }); // merge: true won't overwrite existing fields
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
      const userData = await getUserData(firebaseUser.uid);
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
        clearTimeout(timeout);
        setFirebaseUser(fbUser);

        if (fbUser) {
          try {
            // Ensure user document exists
            await ensureUserDocument(fbUser);
            const userData = await getUserData(fbUser.uid);
            setUser(userData);
          } catch (error) {
            console.error("Error fetching user data:", error);
            setUser(null);
          }
        } else {
          setUser(null);
        }

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
