"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePosts } from "@/hooks/usePosts";
import { useMatches } from "@/hooks/useMatches";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PostGrid } from "@/components/posts/PostGrid";
import { PostFilters } from "@/components/posts/PostFilters";
import { MatchCelebration } from "@/components/ui/MatchCelebration";
import { Button } from "@/components/ui/Button";
import { PostFilter, PostType, MatchResult } from "@/types";
import { Plus } from "lucide-react";

export default function FeedPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as PostType | null;

  const [filters, setFilters] = useState<PostFilter>(() => {
    if (typeParam && ["need", "space", "community"].includes(typeParam)) {
      return { type: typeParam };
    }
    return {};
  });

  // Keep filters in sync when URL type param changes (e.g. header link navigation)
  useEffect(() => {
    const validTypes = ["need", "space", "community"];
    if (typeParam && validTypes.includes(typeParam)) {
      setFilters((prev) => (prev.type === typeParam ? prev : { ...prev, type: typeParam }));
    } else if (!typeParam) {
      setFilters((prev) => (prev.type === undefined ? prev : { ...prev, type: undefined }));
    }
  }, [typeParam]);

  const isCommunity = filters.type === "community";

  // Update filters and sync URL without triggering Next.js navigation
  const handleFiltersChange = useCallback(
    (newFilters: PostFilter) => {
      setFilters(newFilters);
      const params = new URLSearchParams(window.location.search);
      if (newFilters.type) {
        params.set("type", newFilters.type);
      } else {
        params.delete("type");
      }
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `/feed?${qs}` : "/feed");
    },
    []
  );
  const { posts, loading, hasMore, loadMore } = usePosts(filters);
  const { newMatches, markMatchesSeen } = useMatches();
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);

  const handleDismissCelebration = useCallback(() => {
    markMatchesSeen();
    setCelebrationDismissed(true);
  }, [markMatchesSeen]);

  // Convert enriched matches to MatchResult format for the celebration component
  const celebrationMatches: MatchResult[] = newMatches.map((m) => ({
    post: {
      id: m.seekerPostId,
      title: m.seekerPostTitle || m.landlordPostTitle,
      authorName: m.seekerPostAuthorName || m.landlordPostAuthorName,
    },
    score: m.matchScore,
    matchingAttributes: [],
  }));

  return (
    <AuthGuard requireRole>
      {!celebrationDismissed && celebrationMatches.length > 0 && (
        <MatchCelebration
          matches={celebrationMatches}
          onDismiss={handleDismissCelebration}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Feed</h1>
            <p className="text-sm text-muted">
              Discover spaces and seekers in your area
            </p>
          </div>

          <div className="flex items-center gap-3">
            <PostFilters filters={filters} onChange={handleFiltersChange} />
            <Link href={isCommunity ? "/community/new" : "/post/new"}>
              <Button size="sm">
                <Plus size={16} className="mr-1" />
                {isCommunity ? "New Community Post" : "New Post"}
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
