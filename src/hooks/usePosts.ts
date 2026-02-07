"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { searchPosts, getUserPosts } from "@/lib/firebase/firestore";
import { Post, PostFilter } from "@/types";

export function usePosts(filters?: PostFilter) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);
  const filtersRef = useRef(filters);

  // Update filters ref when filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use API endpoint instead of direct Firestore SDK
      const params = new URLSearchParams();
      if (filtersRef.current?.type) {
        params.set("type", filtersRef.current.type);
      }

      const response = await fetch(`/api/posts?${params.toString()}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setPosts([]);
      } else {
        // Transform and filter posts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let filteredPosts = (data.posts || []).map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          attributes: p.attributes || {},
          searchKeywords: p.searchKeywords || [],
        }));
        if (filtersRef.current?.type) {
          filteredPosts = filteredPosts.filter(
            (p: Post) => p.type === filtersRef.current?.type
          );
        }
        setPosts(filteredPosts);
        setDebug(`${data.debug?.fetchTime || "?"} | ${filteredPosts.length} posts`);
      }
      setHasMore(false); // REST API returns all posts at once for now
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Error loading posts:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    // No pagination with REST API for now
  }, []);

  const refresh = useCallback(() => {
    loadPosts();
  }, [loadPosts]);

  // Load posts when filters change
  useEffect(() => {
    setPosts([]);
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return { posts, loading, hasMore, loadMore, refresh, error, debug };
}

export function useSearchPosts(keyword: string, type?: PostFilter["type"]) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!keyword.trim()) {
      setPosts([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const results = await searchPosts(keyword, type);
        setPosts(results);
      } catch (error) {
        console.error("Error searching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [keyword, type]);

  return { posts, loading };
}

export function useUserPosts(userId: string | undefined) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const userPosts = await getUserPosts(userId);
        setPosts(userPosts);
      } catch (error) {
        console.error("Error loading user posts:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  return { posts, loading };
}
