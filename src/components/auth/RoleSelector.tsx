"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { updateUserRole } from "@/lib/firebase/auth";
import { useToast } from "@/context/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { UserRole } from "@/types";
import { Search, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleOption {
  value: UserRole;
  title: string;
  description: string;
  icon: typeof Search;
}

const roles: RoleOption[] = [
  {
    value: "seeker",
    title: "Space Seeker",
    description: "I'm looking for a creative space to rent",
    icon: Search,
  },
  {
    value: "landlord",
    title: "Space Provider",
    description: "I have a space to offer for creative use",
    icon: Building2,
  },
];

export function RoleSelector() {
  const router = useRouter();
  const { firebaseUser, refreshUser } = useAuth();
  const { success, error: showError } = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedRole || !firebaseUser) return;

    setLoading(true);
    try {
      await updateUserRole(firebaseUser.uid, selectedRole);
      await refreshUser();
      success("Welcome to SpaceMatch!");
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to set role";
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle>How will you use SpaceMatch?</CardTitle>
        <CardDescription>You can change this later in your profile settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.value;

            return (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all",
                  "flex items-center gap-4",
                  isSelected
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card hover:border-accent/50"
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    isSelected ? "bg-accent text-background" : "bg-background text-muted"
                  )}
                >
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{role.title}</h3>
                  <p className="text-sm text-muted">{role.description}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                    <Check size={16} className="text-background" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleSubmit}
          fullWidth
          loading={loading}
          disabled={!selectedRole}
          className="mt-6"
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
