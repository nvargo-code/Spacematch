"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tag } from "./Tag";
import { Input } from "./Input";
import { Plus } from "lucide-react";

interface TagOption {
  value: string;
  label: string;
}

interface TagGroupProps {
  label?: string;
  options: TagOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
  multiple?: boolean;
  error?: string;
  className?: string;
}

export function TagGroup({
  label,
  options,
  selected,
  onChange,
  allowCustom = false,
  customPlaceholder = "Add custom...",
  multiple = true,
  error,
  className,
}: TagGroupProps) {
  const [customValue, setCustomValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleToggle = (value: string) => {
    if (multiple) {
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value));
      } else {
        onChange([...selected, value]);
      }
    } else {
      onChange(selected.includes(value) ? [] : [value]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customValue.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setCustomValue("");
      setShowCustomInput(false);
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    } else if (e.key === "Escape") {
      setShowCustomInput(false);
      setCustomValue("");
    }
  };

  // Separate predefined options from custom values
  const predefinedValues = options.map((o) => o.value);
  const customValues = selected.filter((v) => !predefinedValues.includes(v));

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Tag
            key={option.value}
            selected={selected.includes(option.value)}
            onClick={() => handleToggle(option.value)}
          >
            {option.label}
          </Tag>
        ))}

        {/* Custom values */}
        {customValues.map((value) => (
          <Tag
            key={value}
            selected
            onRemove={() => onChange(selected.filter((v) => v !== value))}
          >
            {value}
          </Tag>
        ))}

        {/* Add custom button/input */}
        {allowCustom && (
          <>
            {showCustomInput ? (
              <div className="flex items-center gap-2">
                <Input
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={handleCustomKeyDown}
                  onBlur={() => {
                    if (!customValue.trim()) {
                      setShowCustomInput(false);
                    }
                  }}
                  placeholder={customPlaceholder}
                  className="w-40 !min-h-[36px] !py-1.5"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="p-1.5 rounded-lg bg-accent text-background hover:bg-accent-hover"
                  disabled={!customValue.trim()}
                >
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <Tag onClick={() => setShowCustomInput(true)}>
                <Plus size={14} />
                Something else
              </Tag>
            )}
          </>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}
