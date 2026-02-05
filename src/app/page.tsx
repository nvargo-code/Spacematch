"use client";

import { useState } from "react";
import Link from "next/link";
import { usePosts } from "@/hooks/usePosts";
import { useAuth } from "@/context/AuthProvider";
import { PostGrid } from "@/components/posts/PostGrid";
import { PostFilters } from "@/components/posts/PostFilters";
import { Button } from "@/components/ui/Button";
import { PostFilter } from "@/types";
import { Plus, Search } from "lucide-react";

export default function HomePage() {
  const { firebaseUser, user } = useAuth();
  const [filters, setFilters] = useState<PostFilter>({});
  const { posts, loading, hasMore, loadMore, error } = usePosts(filters);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero section for non-logged in users */}
      {!firebaseUser && (
        <div className="text-center py-12 mb-8 bg-gradient-to-b from-card to-background rounded-xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Find Your Perfect Creative Space
          </h1>
          <p className="text-lg text-muted mb-8 max-w-2xl mx-auto">
            Connect with landlords offering unique spaces for artists, musicians,
            makers, and creators of all kinds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg">
                <Plus size={20} className="mr-2" />
                Get Started
              </Button>
            </Link>
            <Link href="/search">
              <Button variant="secondary" size="lg">
                <Search size={20} className="mr-2" />
                Browse Spaces
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {filters.type === "need"
              ? "Space Seekers"
              : filters.type === "space"
              ? "Available Spaces"
              : "Latest Posts"}
          </h2>
          <p className="text-sm text-muted">
            {posts.length} {posts.length === 1 ? "post" : "posts"} found
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PostFilters filters={filters} onChange={setFilters} />

          {firebaseUser && user?.role && (
            <Link href="/post/new">
              <Button size="sm">
                <Plus size={16} className="mr-1" />
                New Post
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Debug info - remove after fixing */}
      <div className="mb-6 p-4 bg-card border border-border rounded-lg text-xs text-muted">
        <p>Debug: Loading={String(loading)}, Posts={posts.length}, Error={error || "none"}</p>
        <p>Firebase Project: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "NOT SET"}</p>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error text-sm">
          <strong>Error loading posts:</strong> {error}
        </div>
      )}

      {/* Post grid */}
      <PostGrid
        posts={posts}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        emptyMessage="No posts yet. Be the first to create one!"
      />
    </div>
  );
}
