"use client";

import { useState, useEffect } from "react";
import { Chat } from "@/types";
import { getChat, subscribeToChats } from "@/lib/firebase/chat";

export function useChats(userId: string | undefined) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setChats([]);
      setLoading(false);
      return;
    }

    // Subscribe to real-time updates
    const unsubscribe = subscribeToChats(userId, (updatedChats) => {
      setChats(updatedChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { chats, loading };
}

export function useChatById(chatId: string | undefined) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) {
      setChat(null);
      setLoading(false);
      return;
    }

    const loadChat = async () => {
      try {
        const chatData = await getChat(chatId);
        if (chatData) {
          setChat(chatData);
        } else {
          setError("Chat not found");
        }
      } catch (err) {
        console.error("Error loading chat:", err);
        setError("Failed to load chat");
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [chatId]);

  return { chat, loading, error };
}

export function useTotalUnreadCount(userId: string | undefined) {
  const { chats } = useChats(userId);

  return chats.reduce((total, chat) => {
    return total + (chat.unreadCount[userId || ""] || 0);
  }, 0);
}
