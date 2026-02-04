"use client";

import { Post } from "@/types";
import { PostCard } from "./PostCard";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

interface PostGridProps {
  posts: Post[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
  className?: string;
}

export function PostGrid({
  posts,
  loading = false,
  hasMore = false,
  onLoadMore,
  emptyMessage = "No posts found",
  className,
}: PostGridProps) {
  if (!loading && posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      )}

      {/* Load more button */}
      {!loading && hasMore && onLoadMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={onLoadMore}
            className="px-6 py-3 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
