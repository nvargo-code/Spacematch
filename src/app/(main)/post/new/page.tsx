"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { PostForm } from "@/components/forms/PostForm";

export default function NewPostPage() {
  return (
    <AuthGuard requireRole>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-8 text-center">
          Create a Post
        </h1>
        <PostForm />
      </div>
    </AuthGuard>
  );
}
