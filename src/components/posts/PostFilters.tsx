"use client";

import { useState } from "react";
import { PostFilter, PostType } from "@/types";
import {
  SIZE_OPTIONS,
  ENVIRONMENT_OPTIONS,
  DURATION_OPTIONS,
  PRIVACY_OPTIONS,
  NOISE_OPTIONS,
  USER_TYPE_OPTIONS,
} from "@/types/attributes";
import { Button } from "@/components/ui/Button";
import { TagGroup } from "@/components/ui/TagGroup";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { Filter } from "lucide-react";

interface PostFiltersProps {
  filters: PostFilter;
  onChange: (filters: PostFilter) => void;
  className?: string;
}

export function PostFilters({ filters, onChange, className }: PostFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<PostFilter>(filters);

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const handleApply = () => {
    onChange(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const cleared: PostFilter = {};
    setLocalFilters(cleared);
    onChange(cleared);
    setIsOpen(false);
  };

  const handleTypeChange = (type: PostType | undefined) => {
    const newFilters = { ...localFilters, type };
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  return (
    <>
      {/* Filter bar */}
      <div className={cn("flex items-center gap-3 overflow-x-auto scrollbar-hide", className)}>
        {/* Type toggle */}
        <div className="flex rounded-lg bg-card border border-border overflow-hidden flex-shrink-0">
          {[
            { value: undefined, label: "All" },
            { value: "need" as PostType, label: "Seeking" },
            { value: "space" as PostType, label: "Available" },
            { value: "community" as PostType, label: "Community" },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => handleTypeChange(option.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap",
                filters.type === option.value
                  ? "bg-accent text-background"
                  : "text-muted hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Filter button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="relative flex-shrink-0"
        >
          <Filter size={16} className="mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-background text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter modal (mobile-friendly bottom sheet style) */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Filters"
        size="lg"
      >
        <ModalBody className="max-h-[60vh] overflow-y-auto space-y-6">
          <TagGroup
            label="Size"
            options={SIZE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            selected={localFilters.sizeCategory ? [localFilters.sizeCategory] : []}
            onChange={(vals) =>
              setLocalFilters({ ...localFilters, sizeCategory: vals[0] })
            }
            multiple={false}
          />

          <TagGroup
            label="Environment"
            options={ENVIRONMENT_OPTIONS}
            selected={localFilters.environment ? [localFilters.environment] : []}
            onChange={(vals) =>
              setLocalFilters({ ...localFilters, environment: vals[0] })
            }
            multiple={false}
          />

          <TagGroup
            label="Duration"
            options={DURATION_OPTIONS}
            selected={localFilters.duration ? [localFilters.duration] : []}
            onChange={(vals) =>
              setLocalFilters({ ...localFilters, duration: vals[0] })
            }
            multiple={false}
          />

          <TagGroup
            label="Privacy"
            options={PRIVACY_OPTIONS}
            selected={localFilters.privacyLevel ? [localFilters.privacyLevel] : []}
            onChange={(vals) =>
              setLocalFilters({ ...localFilters, privacyLevel: vals[0] })
            }
            multiple={false}
          />

          <TagGroup
            label="Noise Level"
            options={NOISE_OPTIONS}
            selected={localFilters.noiseLevel ? [localFilters.noiseLevel] : []}
            onChange={(vals) =>
              setLocalFilters({ ...localFilters, noiseLevel: vals[0] })
            }
            multiple={false}
          />

          <TagGroup
            label="Ideal For"
            options={USER_TYPE_OPTIONS}
            selected={localFilters.userTypes || []}
            onChange={(vals) => setLocalFilters({ ...localFilters, userTypes: vals })}
          />

          {/* Amenities */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Amenities
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "hasParking", label: "Parking" },
                { key: "hasRestroom", label: "Restroom" },
                { key: "adaAccessible", label: "ADA Accessible" },
                { key: "petsAllowed", label: "Pets Allowed" },
                { key: "climateControlled", label: "Climate Control" },
              ].map((amenity) => (
                <label
                  key={amenity.key}
                  className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border cursor-pointer hover:border-accent/50"
                >
                  <input
                    type="checkbox"
                    checked={
                      localFilters[amenity.key as keyof PostFilter] === true
                    }
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        [amenity.key]: e.target.checked || undefined,
                      })
                    }
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-foreground">{amenity.label}</span>
                </label>
              ))}
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="justify-between">
          <Button variant="ghost" onClick={handleClear}>
            Clear all
          </Button>
          <Button onClick={handleApply}>Apply filters</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
