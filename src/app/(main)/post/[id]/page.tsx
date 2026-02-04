"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPost } from "@/lib/firebase/firestore";
import { Post } from "@/types";
import { PostDetail } from "@/components/posts/PostDetail";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";

export default function PostPage() {
  const params = useParams();
  const postId = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const postData = await getPost(postId);
        if (postData) {
          setPost(postData);
        } else {
          setError("Post not found");
        }
      } catch (err) {
        console.error("Error loading post:", err);
        setError("Failed to load post");
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card padding="lg" className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">
            {error || "Post not found"}
          </h1>
          <p className="text-muted">
            This post may have been deleted or doesn&apos;t exist.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PostDetail post={post} />
    </div>
  );
}
