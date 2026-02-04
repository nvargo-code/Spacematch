"use client";

import { useState } from "react";
import Link from "next/link";
import { usePosts } from "@/hooks/usePosts";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PostGrid } from "@/components/posts/PostGrid";
import { PostFilters } from "@/components/posts/PostFilters";
import { Button } from "@/components/ui/Button";
import { PostFilter } from "@/types";
import { Plus } from "lucide-react";

export default function FeedPage() {
  const [filters, setFilters] = useState<PostFilter>({});
  const { posts, loading, hasMore, loadMore } = usePosts(filters);

  return (
    <AuthGuard requireRole>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Feed</h1>
            <p className="text-sm text-muted">
              Discover spaces and seekers in your area
            </p>
          </div>

          <div className="flex items-center gap-3">
            <PostFilters filters={filters} onChange={setFilters} />
            <Link href="/post/new">
              <Button size="sm">
                <Plus size={16} className="mr-1" />
                New Post
              </Button>
            </Link>
          </div>
        </div>

        <PostGrid
          posts={posts}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>
    </AuthGuard>
  );
}
