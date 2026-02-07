"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Post } from "@/types";
import { FORUM_CATEGORIES } from "@/types/forum";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastProvider";
import { useReplies } from "@/hooks/useReplies";
import { deletePost } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { ReplyCard } from "./ReplyCard";
import { ReplyForm } from "./ReplyForm";
import { formatDate } from "@/lib/utils/formatters";
import {
  Clock,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";

interface CommunityPostDetailProps {
  post: Post;
}

export function CommunityPostDetail({ post }: CommunityPostDetailProps) {
  const router = useRouter();
  const { firebaseUser, user } = useAuth();
  const { success, error: showError } = useToast();
  const { replies, loading: repliesLoading, addReply, removeReply } = useReplies(post.id);
  const [currentImage, setCurrentImage] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = firebaseUser?.uid === post.authorId;
  const categoryLabel = FORUM_CATEGORIES.find(
    (c) => c.value === post.category
  )?.label;

  const handleDelete = async () => {
    if (!firebaseUser) return;
    setDeleting(true);
    try {
      await deletePost(post.id, firebaseUser.uid);
      success("Post deleted successfully");
      router.push("/feed");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete post";
      showError(message);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleReplySubmit = async (data: { body: string }) => {
    if (!firebaseUser || !user) return;
    try {
      await addReply({
        body: data.body,
        authorId: firebaseUser.uid,
        authorName: user.displayName || "Anonymous",
        authorPhotoURL: user.photoURL || undefined,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to post reply";
      showError(message);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      await removeReply(replyId);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete reply";
      showError(message);
    }
  };

  const nextImage = () => {
    setCurrentImage((i) => (i + 1) % post.images.length);
  };

  const prevImage = () => {
    setCurrentImage((i) => (i - 1 + post.images.length) % post.images.length);
  };

  return (
    <>
      <div className="max-w-3xl mx-auto">
        {/* Image gallery */}
        {post.images.length > 0 && (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-card mb-6">
            <Image
              src={post.images[currentImage]}
              alt={`${post.title} - Image ${currentImage + 1}`}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
            {post.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-purple-500 text-white">
                <Users size={16} />
                Community
              </span>
            </div>
          </div>
        )}

        {/* Post content */}
        <Card padding="lg" className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              {categoryLabel && (
                <Tag className="bg-purple-500/20 text-purple-300 mb-2">
                  {categoryLabel}
                </Tag>
              )}
              <h1 className="text-2xl font-bold text-foreground">
                {post.title}
              </h1>
            </div>
            {isOwner && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Link href={isOwner ? "/profile" : "#"} className="flex items-center gap-2">
              <Avatar
                src={post.authorPhotoURL}
                alt={post.authorName}
                size="sm"
              />
              <span className="text-sm font-medium text-foreground">
                {post.authorName}
              </span>
            </Link>
            <span className="text-xs text-muted flex items-center gap-1">
              <Clock size={12} />
              {formatDate(post.createdAt)}
            </span>
          </div>

          <p className="text-foreground whitespace-pre-wrap leading-relaxed">
            {post.description}
          </p>
        </Card>

        {/* Replies section */}
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare size={20} />
            Replies ({replies.length})
          </h2>

          {repliesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {replies.length === 0 ? (
                <p className="text-muted text-sm text-center py-4">
                  No replies yet. Be the first to reply!
                </p>
              ) : (
                replies.map((reply) => (
                  <ReplyCard
                    key={reply.id}
                    reply={reply}
                    isOwner={firebaseUser?.uid === reply.authorId}
                    onDelete={() => handleDeleteReply(reply.id)}
                  />
                ))
              )}
            </div>
          )}

          {firebaseUser ? (
            <ReplyForm onSubmit={handleReplySubmit} />
          ) : (
            <div className="text-center py-4">
              <Link href="/login">
                <Button variant="secondary">Log in to reply</Button>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Post"
        size="sm"
      >
        <ModalBody>
          <p className="text-foreground">
            Are you sure you want to delete this post? This action cannot be
            undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
