"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { useChats } from "@/hooks/useChat";
import { getOrCreateChat } from "@/lib/firebase/chat";
import { getUserData } from "@/lib/firebase/auth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ChatList } from "@/components/chat/ChatList";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firebaseUser, user } = useAuth();
  const { chats, loading } = useChats(firebaseUser?.uid);
  const [creating, setCreating] = useState(false);

  const newUserId = searchParams.get("new");

  // Handle creating new chat from query param
  useEffect(() => {
    if (!newUserId || !firebaseUser || !user || creating) return;

    const createNewChat = async () => {
      setCreating(true);
      try {
        // Get the other user's info
        const otherUser = await getUserData(newUserId);
        if (!otherUser) {
          router.push("/messages");
          return;
        }

        const chatId = await getOrCreateChat(
          firebaseUser.uid,
          user.displayName,
          user.photoURL,
          newUserId,
          otherUser.displayName,
          otherUser.photoURL
        );

        router.push(`/messages/${chatId}`);
      } catch (error) {
        console.error("Error creating chat:", error);
        router.push("/messages");
      }
    };

    createNewChat();
  }, [newUserId, firebaseUser, user, router, creating]);

  if (creating) {
    return (
      <AuthGuard>
        <div className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
          <Spinner size="lg" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Messages</h1>

        <Card padding="none">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={48} className="mx-auto text-muted mb-4" />
              <p className="text-muted">No conversations yet</p>
              <p className="text-sm text-muted mt-1">
                Start a chat from a post you&apos;re interested in
              </p>
            </div>
          ) : (
            <ChatList chats={chats} />
          )}
        </Card>
      </div>
    </AuthGuard>
  );
}
