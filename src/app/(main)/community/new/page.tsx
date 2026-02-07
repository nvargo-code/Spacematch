"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { ImageUploader } from "@/components/forms/ImageUploader";
import { FORUM_CATEGORIES, ForumCategory } from "@/types/forum";
import {
  communityPostSchema,
  CommunityPostFormData,
} from "@/lib/utils/forum-validators";
import { createPost } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";

export default function NewCommunityPostPage() {
  const router = useRouter();
  const { firebaseUser, user } = useAuth();
  const { success, error: showError } = useToast();
  const [images, setImages] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CommunityPostFormData>({
    resolver: zodResolver(communityPostSchema),
    defaultValues: {
      images: [],
    },
  });

  const selectedCategory = watch("category");

  const onSubmit = async (data: CommunityPostFormData) => {
    if (!firebaseUser || !user) return;

    try {
      const postId = await createPost(
        firebaseUser.uid,
        user.displayName || "Anonymous",
        user.photoURL || undefined,
        {
          type: "community",
          title: data.title,
          description: data.description,
          images: images,
          attributes: {},
          category: data.category as ForumCategory,
        }
      );
      success("Community post created!");
      router.push(`/post/${postId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create post";
      showError(message);
    }
  };

  return (
    <AuthGuard requireRole>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-8 text-center">
          New Community Post
        </h1>

        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Category selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {FORUM_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setValue("category", cat.value, { shouldValidate: true })}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                      selectedCategory === cat.value
                        ? "bg-purple-500 text-white border-purple-500"
                        : "bg-card text-muted border-border hover:border-purple-500/50"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {errors.category && (
                <p className="mt-1.5 text-sm text-error">
                  {errors.category.message}
                </p>
              )}
            </div>

            <Input
              label="Title"
              {...register("title")}
              error={errors.title?.message}
              placeholder="What's on your mind?"
            />

            <Textarea
              label="Description"
              {...register("description")}
              error={errors.description?.message}
              placeholder="Share your thoughts, tips, questions..."
              className="min-h-[160px]"
            />

            {/* Images (optional) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Images (optional)
              </label>
              <ImageUploader
                images={images}
                onChange={setImages}
                maxImages={5}
              />
            </div>

            <Button type="submit" fullWidth loading={isSubmitting}>
              Post to Community
            </Button>
          </form>
        </Card>
      </div>
    </AuthGuard>
  );
}
