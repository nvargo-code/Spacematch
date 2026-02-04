"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";

interface AuthGuardProps {
  children: React.ReactNode;
  requireRole?: boolean;
}

export function AuthGuard({ children, requireRole = false }: AuthGuardProps) {
  const router = useRouter();
  const { firebaseUser, user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        router.push("/login");
      } else if (requireRole && !user?.role) {
        router.push("/role-select");
      }
    }
  }, [firebaseUser, user, loading, requireRole, router]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!firebaseUser) {
    return null;
  }

  if (requireRole && !user?.role) {
    return null;
  }

  return <>{children}</>;
}
