"use client";

import { useState } from "react";
import { useSearchPosts } from "@/hooks/usePosts";
import { PostGrid } from "@/components/posts/PostGrid";
import { PostType } from "@/types";
import { cn } from "@/lib/utils";
import { Search as SearchIcon } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PostType | undefined>(undefined);
  const { posts, loading } = useSearchPosts(query, type);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Search Spaces</h1>

        {/* Search input */}
        <div className="relative mb-4">
          <SearchIcon
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by keyword, location, or type..."
            className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>

        {/* Type filter */}
        <div className="flex rounded-lg bg-card border border-border overflow-hidden w-fit">
          {[
            { value: undefined, label: "All" },
            { value: "need" as PostType, label: "Looking for Space" },
            { value: "space" as PostType, label: "Spaces Available" },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => setType(option.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                type === option.value
                  ? "bg-accent text-background"
                  : "text-muted hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {query.trim() ? (
        <PostGrid
          posts={posts}
          loading={loading}
          emptyMessage={`No results found for "${query}"`}
        />
      ) : (
        <div className="text-center py-12">
          <SearchIcon size={48} className="mx-auto text-muted mb-4" />
          <p className="text-muted">
            Enter a search term to find spaces or seekers
          </p>
        </div>
      )}
    </div>
  );
}
