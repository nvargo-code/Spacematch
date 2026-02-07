"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Post } from "@/types";
import { useAuth } from "@/context/AuthProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AvailabilityEditor } from "@/components/calendar/AvailabilityEditor";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChevronLeft } from "lucide-react";

export default function AvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const { firebaseUser } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else if (data.post) {
          setPost({
            ...data.post,
            createdAt: new Date(data.post.createdAt),
            updatedAt: new Date(data.post.updatedAt),
          });
        } else {
          setError("Post not found");
        }
      } catch {
        setError("Failed to load post");
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card padding="lg" className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">
            {error || "Post not found"}
          </h1>
        </Card>
      </div>
    );
  }

  // Only the post owner can manage availability, and only for space posts
  if (post.authorId !== firebaseUser?.uid) {
    router.push(`/post/${postId}`);
    return null;
  }

  if (post.type !== "space") {
    router.push(`/post/${postId}`);
    return null;
  }

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={`/post/${postId}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft size={16} className="mr-1" />
              Back to Post
            </Button>
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Manage Availability
        </h1>
        <p className="text-muted mb-6">{post.title}</p>

        <AvailabilityEditor postId={postId} />
      </div>
    </AuthGuard>
  );
}
