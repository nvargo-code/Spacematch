"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { useUserPosts } from "@/hooks/usePosts";
import { useToast } from "@/context/ToastProvider";
import { signOut, updateUserProfile, updateUserRole } from "@/lib/firebase/auth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PostGrid } from "@/components/posts/PostGrid";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { LogOut, Edit2, Search, Building2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, firebaseUser, refreshUser } = useAuth();
  const { posts, loading: postsLoading } = useUserPosts(firebaseUser?.uid);
  const { success, error: showError } = useToast();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: user?.location || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleSaveProfile = async () => {
    if (!firebaseUser) return;

    setSaving(true);
    try {
      await updateUserProfile(firebaseUser.uid, editForm);
      await refreshUser();
      success("Profile updated");
      setShowEditModal(false);
    } catch {
      showError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (role: UserRole) => {
    if (!firebaseUser || user?.role === role) return;

    try {
      await updateUserRole(firebaseUser.uid, role);
      await refreshUser();
      success("Role updated");
    } catch {
      showError("Failed to update role");
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile header */}
        <Card padding="lg" className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar src={user?.photoURL} alt={user?.displayName} size="xl" />

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {user?.displayName}
              </h1>
              <p className="text-muted">{user?.email}</p>
              {user?.bio && (
                <p className="mt-2 text-foreground">{user.bio}</p>
              )}
              {user?.location && (
                <p className="text-sm text-muted mt-1">{user.location}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditForm({
                    displayName: user?.displayName || "",
                    bio: user?.bio || "",
                    location: user?.location || "",
                  });
                  setShowEditModal(true);
                }}
              >
                <Edit2 size={16} className="mr-1" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut size={16} className="mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </Card>

        {/* Role selector */}
        <Card padding="lg" className="mb-8">
          <CardHeader>
            <CardTitle>Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "seeker" as UserRole, icon: Search, label: "Space Seeker" },
                { value: "landlord" as UserRole, icon: Building2, label: "Space Provider" },
              ].map((role) => {
                const Icon = role.icon;
                const isSelected = user?.role === role.value;
                return (
                  <button
                    key={role.value}
                    onClick={() => handleRoleChange(role.value)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3",
                      isSelected
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card hover:border-accent/50"
                    )}
                  >
                    <Icon
                      size={24}
                      className={isSelected ? "text-accent" : "text-muted"}
                    />
                    <span className="font-medium text-foreground">{role.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Post stats */}
        <Card padding="lg" className="mb-8">
          <CardHeader>
            <CardTitle>Your Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <div className="px-4 py-2 bg-background rounded-lg">
                <span className="text-accent font-semibold">
                  {user?.activePostCount || 0}
                </span>
                <span className="text-muted"> / 3 active posts</span>
              </div>
              {(user?.extraPostCredits || 0) > 0 && (
                <div className="px-4 py-2 bg-background rounded-lg">
                  <span className="text-success font-semibold">
                    +{user?.extraPostCredits}
                  </span>
                  <span className="text-muted"> extra slots</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User's posts */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Your Active Posts
          </h2>
          <PostGrid
            posts={posts}
            loading={postsLoading}
            emptyMessage="You haven't created any posts yet"
          />
        </div>
      </div>

      {/* Edit profile modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
      >
        <ModalBody className="space-y-4">
          <Input
            label="Display Name"
            value={editForm.displayName}
            onChange={(e) =>
              setEditForm({ ...editForm, displayName: e.target.value })
            }
          />
          <Textarea
            label="Bio"
            value={editForm.bio}
            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
            placeholder="Tell others about yourself..."
          />
          <Input
            label="Location"
            value={editForm.location}
            onChange={(e) =>
              setEditForm({ ...editForm, location: e.target.value })
            }
            placeholder="City, State"
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveProfile} loading={saving}>
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>
    </AuthGuard>
  );
}
