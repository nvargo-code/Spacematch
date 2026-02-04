"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Chat, Message } from "@/types";
import { useAuth } from "@/context/AuthProvider";
import { sendMessage, subscribeToMessages, markChatAsRead } from "@/lib/firebase/chat";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { ArrowLeft } from "lucide-react";

interface ChatRoomProps {
  chat: Chat;
}

export function ChatRoom({ chat }: ChatRoomProps) {
  const { firebaseUser, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUserId = chat.participants.find((p) => p !== firebaseUser?.uid) || "";
  const otherUserName = chat.participantNames[otherUserId] || "User";
  const otherUserPhoto = chat.participantPhotos[otherUserId];

  // Subscribe to messages
  useEffect(() => {
    if (!chat.id) return;

    const unsubscribe = subscribeToMessages(chat.id, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    // Mark as read
    if (firebaseUser?.uid) {
      markChatAsRead(chat.id, firebaseUser.uid);
    }

    return () => unsubscribe();
  }, [chat.id, firebaseUser?.uid]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!firebaseUser || !user) return;

    setSending(true);
    try {
      await sendMessage(chat.id, {
        text,
        senderId: firebaseUser.uid,
        senderName: user.displayName,
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Link
          href="/messages"
          className="p-2 -ml-2 text-muted hover:text-foreground md:hidden"
        >
          <ArrowLeft size={20} />
        </Link>
        <Avatar src={otherUserPhoto} alt={otherUserName} size="md" />
        <div>
          <h2 className="font-semibold text-foreground">{otherUserName}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Say hello to start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const showAvatar =
              index === 0 ||
              messages[index - 1].senderId !== message.senderId;

            return (
              <ChatBubble
                key={message.id}
                message={message}
                showAvatar={showAvatar}
                senderPhoto={otherUserPhoto}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
