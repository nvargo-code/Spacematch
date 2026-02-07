"use client";

import { ForumReply } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/utils/formatters";
import { Trash2 } from "lucide-react";

interface ReplyCardProps {
  reply: ForumReply;
  isOwner: boolean;
  onDelete?: () => void;
}

export function ReplyCard({ reply, isOwner, onDelete }: ReplyCardProps) {
  return (
    <div className="flex gap-3 p-4 rounded-lg bg-card border border-border">
      <Avatar
        src={reply.authorPhotoURL}
        alt={reply.authorName}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {reply.authorName}
            </span>
            <span className="text-xs text-muted">
              {formatDate(reply.createdAt)}
            </span>
          </div>
          {isOwner && onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-muted hover:text-error transition-colors"
              aria-label="Delete reply"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
          {reply.body}
        </p>
      </div>
    </div>
  );
}
