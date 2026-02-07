"use client";

import { useState, useEffect, useCallback } from "react";
import { ForumReply } from "@/types";
import { getReplies, createReply, deleteReply } from "@/lib/firebase/forum";

export function useReplies(postId: string) {
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReplies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReplies(postId);
      setReplies(data);
    } catch (err) {
      console.error("Error loading replies:", err);
      setError("Failed to load replies");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  const addReply = useCallback(
    async (data: {
      body: string;
      authorId: string;
      authorName: string;
      authorPhotoURL?: string;
    }) => {
      const id = await createReply(postId, data);
      // Optimistically add the reply
      setReplies((prev) => [
        ...prev,
        {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      return id;
    },
    [postId]
  );

  const removeReply = useCallback(
    async (replyId: string) => {
      await deleteReply(postId, replyId);
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
    },
    [postId]
  );

  return { replies, loading, error, addReply, removeReply, refresh: loadReplies };
}
