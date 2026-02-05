"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DocumentSnapshot } from "firebase/firestore";
import { getPosts, searchPosts, getUserPosts } from "@/lib/firebase/firestore";
import { Post, PostFilter } from "@/types";

export function usePosts(filters?: PostFilter) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const filtersRef = useRef(filters);

  // Update filters ref when filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const loadPosts = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPosts(
        filtersRef.current,
        reset ? undefined : lastDocRef.current || undefined
      );

      if (reset) {
        setPosts(result.posts);
      } else {
        setPosts((prev) => [...prev, ...result.posts]);
      }

      lastDocRef.current = result.lastDoc;
      setHasMore(result.posts.length === 12);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Error loading posts:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadPosts(false);
    }
  }, [loading, hasMore, loadPosts]);

  const refresh = useCallback(() => {
    lastDocRef.current = null;
    loadPosts(true);
  }, [loadPosts]);

  // Load posts when filters change
  useEffect(() => {
    lastDocRef.current = null;
    setPosts([]);
    loadPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return { posts, loading, hasMore, loadMore, refresh, error };
}

export function useSearchPosts(keyword: string, type?: "need" | "space") {
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
