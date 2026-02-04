"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { RoleSelector } from "@/components/auth/RoleSelector";
import { Spinner } from "@/components/ui/Spinner";

export default function RoleSelectPage() {
  const router = useRouter();
  const { firebaseUser, user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        router.push("/login");
      } else if (user?.role) {
        router.push("/");
      }
    }
  }, [firebaseUser, user, loading, router]);

  if (loading || !firebaseUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <RoleSelector />
    </div>
  );
}
