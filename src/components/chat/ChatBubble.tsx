"use client";

import { Message } from "@/types";
import { useAuth } from "@/context/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: Message;
  showAvatar?: boolean;
  senderPhoto?: string;
}

export function ChatBubble({ message, showAvatar = true, senderPhoto }: ChatBubbleProps) {
  const { firebaseUser } = useAuth();
  const isSelf = message.senderId === firebaseUser?.uid;

  return (
    <div
      className={cn(
        "flex gap-2 max-w-[80%]",
        isSelf ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      {showAvatar && !isSelf && (
        <Avatar src={senderPhoto} alt={message.senderName} size="sm" />
      )}

      <div
        className={cn(
          "rounded-2xl px-4 py-2",
          isSelf
            ? "bg-accent text-background rounded-br-sm"
            : "bg-card text-foreground rounded-bl-sm"
        )}
      >
        {!isSelf && showAvatar && (
          <p className="text-xs font-medium mb-1 opacity-70">
            {message.senderName}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <p
          className={cn(
            "text-xs mt-1",
            isSelf ? "text-background/70" : "text-muted"
          )}
        >
          {formatDate(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
