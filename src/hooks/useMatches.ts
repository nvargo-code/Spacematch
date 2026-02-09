"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";

const SEEN_MATCHES_KEY = "spacematch_seen_matches";

function getSeenMatchIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(SEEN_MATCHES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenMatchIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_MATCHES_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage errors
  }
}

export interface EnrichedMatch {
  id: string;
  seekerPostId: string;
  landlordPostId: string;
  seekerId: string;
  landlordId: string;
  matchScore: number;
  status: string;
  seekerPostTitle: string;
  seekerPostAuthorName: string;
  landlordPostTitle: string;
  landlordPostAuthorName: string;
  createdAt: string;
  updatedAt: string;
}

export function useMatches() {
  const { firebaseUser } = useAuth();
  const [allMatches, setAllMatches] = useState<EnrichedMatch[]>([]);
  const [newMatches, setNewMatches] = useState<EnrichedMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchCount, setMatchCount] = useState(0);

  const fetchMatches = useCallback(async () => {
    if (!firebaseUser) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/match?userId=${firebaseUser.uid}`);
      if (!res.ok) return;

      const data = await res.json();
      const matches: EnrichedMatch[] = data.matches || [];
      setAllMatches(matches);
      setMatchCount(matches.length);

      // Check for new (unseen) matches
      const seenIds = getSeenMatchIds();
      const unseen = matches.filter((m) => !seenIds.has(m.id));
      setNewMatches(unseen);
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  const markMatchesSeen = useCallback(() => {
    const seenIds = getSeenMatchIds();
    for (const m of allMatches) {
      seenIds.add(m.id);
    }
    saveSeenMatchIds(seenIds);
    setNewMatches([]);
  }, [allMatches]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return {
    allMatches,
    newMatches,
    matchCount,
    loading,
    fetchMatches,
    markMatchesSeen,
  };
}

export function useMatchCount() {
  const { firebaseUser } = useAuth();
  const [count, setCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (!firebaseUser) return;

    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/match?userId=${firebaseUser.uid}`);
        if (!res.ok) return;
        const data = await res.json();
        const matches: EnrichedMatch[] = data.matches || [];
        setCount(matches.length);

        const seenIds = getSeenMatchIds();
        const unseen = matches.filter((m) => !seenIds.has(m.id));
        setNewCount(unseen.length);
      } catch {
        // Silently fail for badge count
      }
    };

    fetchCount();
    // Poll every 60 seconds for new matches
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [firebaseUser]);

  return { count, newCount };
}
