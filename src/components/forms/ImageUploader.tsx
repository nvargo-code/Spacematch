"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { uploadImage } from "@/lib/firebase/storage";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastProvider";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { ImagePlus, X } from "lucide-react";

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  className?: string;
}

export function ImageUploader({
  images = [],
  onChange,
  maxImages = 5,
  className,
}: ImageUploaderProps) {
  const { firebaseUser } = useAuth();
  const { error: showError } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ensure images is always an array
  const safeImages = images || [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxImages - safeImages.length;
    if (files.length > remainingSlots) {
      showError(`You can only upload ${remainingSlots} more image(s)`);
      return;
    }

    // Validate file types
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const invalidFiles = files.filter((f) => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      showError("Only JPEG, PNG, WebP, and GIF images are allowed");
      return;
    }

    // Validate file sizes (max 5MB each)
    const oversizedFiles = files.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      showError("Each image must be less than 5MB");
      return;
    }

    if (!firebaseUser) {
      showError("You must be logged in to upload images");
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = files.map((file) =>
        uploadImage(file, firebaseUser.uid, "posts")
      );
      const urls = await Promise.all(uploadPromises);
      onChange([...safeImages, ...urls]);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const message = err instanceof Error ? err.message : "Failed to upload images. Check Firebase Storage rules.";
      showError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    onChange(safeImages.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("w-full", className)}>
      <label className="block text-sm font-medium text-foreground mb-2">
        Images ({safeImages.length}/{maxImages})
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Existing images */}
        {safeImages.map((url, index) => (
          <div
            key={url}
            className="relative aspect-square rounded-lg overflow-hidden bg-card border border-border group"
          >
            <Image
              src={url}
              alt={`Upload ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error"
              aria-label="Remove image"
            >
              <X size={16} />
            </button>
          </div>
        ))}

        {/* Upload button */}
        {safeImages.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "aspect-square rounded-lg border-2 border-dashed border-border",
              "flex flex-col items-center justify-center gap-2",
              "text-muted hover:text-foreground hover:border-accent transition-colors",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <Spinner size="md" />
            ) : (
              <>
                <ImagePlus size={24} />
                <span className="text-xs">Add Image</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="mt-2 text-xs text-muted">
        JPEG, PNG, WebP, or GIF. Max 5MB each.
      </p>
    </div>
  );
}
