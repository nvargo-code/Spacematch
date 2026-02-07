"use client";

import Link from "next/link";
import Image from "next/image";
import { Post } from "@/types";
import { FORUM_CATEGORIES } from "@/types/forum";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { formatDate, truncateText } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { MapPin, Clock, Search, Building2, Users, MessageSquare, Calendar } from "lucide-react";

interface PostCardProps {
  post: Post;
  className?: string;
}

export function PostCard({ post, className }: PostCardProps) {
  const TypeIcon =
    post.type === "community"
      ? Users
      : post.type === "need"
        ? Search
        : Building2;

  const badgeLabel =
    post.type === "community"
      ? "Community"
      : post.type === "need"
        ? "Looking"
        : "Available";

  const badgeClass =
    post.type === "community"
      ? "bg-purple-500 text-white"
      : post.type === "need"
        ? "bg-accent text-background"
        : "bg-success text-background";

  const categoryLabel =
    post.type === "community" && post.category
      ? FORUM_CATEGORIES.find((c) => c.value === post.category)?.label
      : null;

  return (
    <Link href={`/post/${post.id}`}>
      <Card
        variant="interactive"
        padding="none"
        className={cn("overflow-hidden h-full flex flex-col", className)}
      >
        {/* Image */}
        {post.images.length > 0 ? (
          <div className="relative aspect-video bg-background">
            <Image
              src={post.images[0]}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  badgeClass
                )}
              >
                <TypeIcon size={12} />
                {badgeLabel}
              </span>
              {post.hasAvailability && post.type === "space" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500 text-white">
                  <Calendar size={12} />
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-background flex items-center justify-center">
            <TypeIcon size={48} className="text-muted" />
          </div>
        )}

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
            {post.title}
          </h3>

          <p className="text-sm text-muted line-clamp-2 mb-3 flex-1">
            {truncateText(post.description, 100)}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.type === "community" ? (
              <>
                {categoryLabel && (
                  <Tag size="sm" className="bg-purple-500/20 text-purple-300">
                    {categoryLabel}
                  </Tag>
                )}
                {(post.replyCount ?? 0) > 0 && (
                  <Tag size="sm">
                    <MessageSquare size={10} className="mr-0.5" />
                    {post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}
                  </Tag>
                )}
              </>
            ) : (
              <>
                {post.attributes.sizeCategory && (
                  <Tag size="sm">{post.attributes.sizeCategory}</Tag>
                )}
                {post.attributes.environment && (
                  <Tag size="sm">{post.attributes.environment}</Tag>
                )}
                {post.attributes.userTypes?.slice(0, 2).map((type) => (
                  <Tag key={type} size="sm">
                    {type}
                  </Tag>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Avatar src={post.authorPhotoURL} alt={post.authorName} size="sm" />
              <span className="text-sm text-foreground">{post.authorName}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted">
              {post.type !== "community" && post.attributes.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {post.attributes.location.split(",")[0]}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDate(post.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
