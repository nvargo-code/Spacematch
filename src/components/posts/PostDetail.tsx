"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Post } from "@/types";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastProvider";
import { deletePost } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { formatDate, formatBudgetRange } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Clock,
  Search,
  Building2,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ParkingSquare,
  Droplets,
  Wifi,
  Wind,
  Flame,
  Accessibility,
  Dog,
  Thermometer,
  Volume2,
  DoorOpen,
} from "lucide-react";

interface PostDetailProps {
  post: Post;
}

const utilityIcons: Record<string, typeof Wifi> = {
  electricity: Flame,
  water: Droplets,
  wifi: Wifi,
  hvac: Wind,
  gas: Flame,
};

export function PostDetail({ post }: PostDetailProps) {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const { success, error: showError } = useToast();
  const [currentImage, setCurrentImage] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = firebaseUser?.uid === post.authorId;
  const TypeIcon = post.type === "need" ? Search : Building2;

  const handleDelete = async () => {
    if (!firebaseUser) return;

    setDeleting(true);
    try {
      await deletePost(post.id, firebaseUser.uid);
      success("Post deleted successfully");
      router.push("/profile");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete post";
      showError(message);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
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
      <div className="max-w-4xl mx-auto">
        {/* Image gallery */}
        {post.images.length > 0 && (
          <div className="relative aspect-video md:aspect-[2/1] rounded-xl overflow-hidden bg-card mb-6">
            <Image
              src={post.images[currentImage]}
              alt={`${post.title} - Image ${currentImage + 1}`}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 896px"
            />

            {/* Navigation arrows */}
            {post.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight size={24} />
                </button>

                {/* Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {post.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        i === currentImage ? "bg-white" : "bg-white/50"
                      )}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Type badge */}
            <div className="absolute top-4 left-4">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                  post.type === "need"
                    ? "bg-accent text-background"
                    : "bg-success text-background"
                )}
              >
                <TypeIcon size={16} />
                {post.type === "need" ? "Looking for Space" : "Space Available"}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            <Card padding="lg">
              <h1 className="text-2xl font-bold text-foreground mb-4">
                {post.title}
              </h1>

              <div className="flex items-center gap-4 text-sm text-muted mb-6">
                {post.attributes.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={16} />
                    {post.attributes.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock size={16} />
                  {formatDate(post.createdAt)}
                </span>
              </div>

              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {post.description}
              </p>
            </Card>

            {/* Attributes */}
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Space Details
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {post.attributes.sizeCategory && (
                  <div className="flex items-center gap-3">
                    <Maximize2 size={20} className="text-muted" />
                    <div>
                      <p className="text-xs text-muted">Size</p>
                      <p className="text-sm text-foreground capitalize">
                        {post.attributes.sizeCategory}
                      </p>
                    </div>
                  </div>
                )}

                {post.attributes.environment && (
                  <div className="flex items-center gap-3">
                    <DoorOpen size={20} className="text-muted" />
                    <div>
                      <p className="text-xs text-muted">Environment</p>
                      <p className="text-sm text-foreground capitalize">
                        {post.attributes.environment}
                      </p>
                    </div>
                  </div>
                )}

                {post.attributes.duration && (
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-muted" />
                    <div>
                      <p className="text-xs text-muted">Duration</p>
                      <p className="text-sm text-foreground capitalize">
                        {post.attributes.duration}
                      </p>
                    </div>
                  </div>
                )}

                {post.attributes.privacyLevel && (
                  <div className="flex items-center gap-3">
                    <Building2 size={20} className="text-muted" />
                    <div>
                      <p className="text-xs text-muted">Privacy</p>
                      <p className="text-sm text-foreground capitalize">
                        {post.attributes.privacyLevel}
                      </p>
                    </div>
                  </div>
                )}

                {post.attributes.noiseLevel && (
                  <div className="flex items-center gap-3">
                    <Volume2 size={20} className="text-muted" />
                    <div>
                      <p className="text-xs text-muted">Noise Level</p>
                      <p className="text-sm text-foreground capitalize">
                        {post.attributes.noiseLevel}
                      </p>
                    </div>
                  </div>
                )}

                {post.attributes.budget && (
                  <div className="flex items-center gap-3">
                    <span className="text-muted text-lg font-bold">$</span>
                    <div>
                      <p className="text-xs text-muted">Budget</p>
                      <p className="text-sm text-foreground">
                        {formatBudgetRange(
                          post.attributes.budget.min,
                          post.attributes.budget.max,
                          post.attributes.budget.period
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Utilities */}
              {post.attributes.utilities && post.attributes.utilities.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted mb-3">Utilities</p>
                  <div className="flex flex-wrap gap-2">
                    {post.attributes.utilities.map((utility) => {
                      const Icon = utilityIcons[utility] || Wifi;
                      return (
                        <Tag key={utility}>
                          <Icon size={14} />
                          {utility}
                        </Tag>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Amenities */}
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted mb-3">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {post.attributes.hasParking && (
                    <Tag>
                      <ParkingSquare size={14} />
                      Parking
                    </Tag>
                  )}
                  {post.attributes.hasRestroom && (
                    <Tag>
                      <Droplets size={14} />
                      Restroom
                    </Tag>
                  )}
                  {post.attributes.adaAccessible && (
                    <Tag>
                      <Accessibility size={14} />
                      ADA Accessible
                    </Tag>
                  )}
                  {post.attributes.petsAllowed && (
                    <Tag>
                      <Dog size={14} />
                      Pets OK
                    </Tag>
                  )}
                  {post.attributes.climateControlled && (
                    <Tag>
                      <Thermometer size={14} />
                      Climate Control
                    </Tag>
                  )}
                </div>
              </div>

              {/* User types */}
              {post.attributes.userTypes && post.attributes.userTypes.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted mb-3">Ideal For</p>
                  <div className="flex flex-wrap gap-2">
                    {post.attributes.userTypes.map((type) => (
                      <Tag key={type}>{type}</Tag>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Author card */}
            <Card padding="lg">
              <Link
                href={isOwner ? "/profile" : `#`}
                className="flex items-center gap-3 mb-4"
              >
                <Avatar src={post.authorPhotoURL} alt={post.authorName} size="lg" />
                <div>
                  <p className="font-semibold text-foreground">{post.authorName}</p>
                  <p className="text-sm text-muted">
                    {post.type === "need" ? "Space Seeker" : "Space Provider"}
                  </p>
                </div>
              </Link>

              {firebaseUser && !isOwner && (
                <Link href={`/messages?new=${post.authorId}&postId=${post.id}`}>
                  <Button fullWidth>
                    <MessageSquare size={18} className="mr-2" />
                    Message
                  </Button>
                </Link>
              )}

              {!firebaseUser && (
                <Link href="/login">
                  <Button fullWidth>Log in to message</Button>
                </Link>
              )}

              {isOwner && (
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 size={18} className="mr-2" />
                  Delete Post
                </Button>
              )}
            </Card>
          </div>
        </div>
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
            Are you sure you want to delete this post? This action cannot be undone.
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
