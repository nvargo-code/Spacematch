"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { useChatById, useChats } from "@/hooks/useChat";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ChatList } from "@/components/chat/ChatList";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const { firebaseUser } = useAuth();
  const { chat, loading, error } = useChatById(chatId);
  const { chats, loading: chatsLoading } = useChats(firebaseUser?.uid);

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]">
        <div className="flex h-full">
          {/* Sidebar - hidden on mobile */}
          <div className="hidden md:block w-80 border-r border-border overflow-y-auto">
            <div className="p-4 border-b border-border">
              <h1 className="text-lg font-semibold text-foreground">Messages</h1>
            </div>
            {chatsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <ChatList chats={chats} activeChatId={chatId} />
            )}
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : error || !chat ? (
              <div className="flex-1 flex items-center justify-center">
                <Card padding="lg" className="text-center">
                  <p className="text-foreground">{error || "Chat not found"}</p>
                </Card>
              </div>
            ) : (
              <ChatRoom chat={chat} />
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
