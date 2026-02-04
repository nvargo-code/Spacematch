"use client";

import Link from "next/link";
import { Chat } from "@/types";
import { useAuth } from "@/context/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, truncateText } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

interface ChatListProps {
  chats: Chat[];
  activeChatId?: string;
}

export function ChatList({ chats, activeChatId }: ChatListProps) {
  const { firebaseUser } = useAuth();

  if (chats.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p>No conversations yet</p>
        <p className="text-sm mt-1">Start a chat from a post you&apos;re interested in</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {chats.map((chat) => {
        const otherUserId = chat.participants.find((p) => p !== firebaseUser?.uid) || "";
        const otherUserName = chat.participantNames[otherUserId] || "User";
        const otherUserPhoto = chat.participantPhotos[otherUserId];
        const unreadCount = chat.unreadCount[firebaseUser?.uid || ""] || 0;
        const isActive = chat.id === activeChatId;

        return (
          <Link
            key={chat.id}
            href={`/messages/${chat.id}`}
            className={cn(
              "flex items-center gap-3 p-4 hover:bg-card transition-colors",
              isActive && "bg-card"
            )}
          >
            <div className="relative">
              <Avatar src={otherUserPhoto} alt={otherUserName} size="md" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-background text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground truncate">
                  {otherUserName}
                </span>
                {chat.lastMessage && (
                  <span className="text-xs text-muted">
                    {formatDate(chat.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              {chat.lastMessage && (
                <p
                  className={cn(
                    "text-sm truncate",
                    unreadCount > 0 ? "text-foreground font-medium" : "text-muted"
                  )}
                >
                  {chat.lastMessage.senderId === firebaseUser?.uid && "You: "}
                  {truncateText(chat.lastMessage.text, 40)}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
