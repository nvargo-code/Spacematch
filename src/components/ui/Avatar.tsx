"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({ src, alt = "User avatar", size = "md", className }: AvatarProps) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  };

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-card border border-border flex items-center justify-center",
        sizes[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={size === "xl" ? "64px" : size === "lg" ? "48px" : size === "md" ? "40px" : "32px"}
        />
      ) : (
        <User size={iconSizes[size]} className="text-muted" />
      )}
    </div>
  );
}
