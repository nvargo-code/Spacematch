"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface TagProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function Tag({
  children,
  selected = false,
  onClick,
  onRemove,
  size = "md",
  className,
}: TagProps) {
  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
        sizes[size],
        selected
          ? "bg-accent text-background"
          : "bg-card border border-border text-foreground",
        onClick && "cursor-pointer hover:bg-accent hover:text-background",
        className
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:text-error focus:outline-none"
          aria-label="Remove"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
}
