"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { getUserData } from "@/lib/firebase/auth";
import { User } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

// Ensure user document exists via REST API (merge behavior, won't overwrite role)
async function ensureUserDocument(fbUser: FirebaseUser): Promise<void> {
  await fetch("/api/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
      photoURL: fbUser.photoURL || null,
    }),
  });
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
        setFirebaseUser(fbUser);

        if (fbUser) {
          try {
            // Ensure user document exists before reading it
            await ensureUserDocument(fbUser);

            // Load user data via REST API (no SDK hang)
            const userData = await getUserData(fbUser.uid);
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
