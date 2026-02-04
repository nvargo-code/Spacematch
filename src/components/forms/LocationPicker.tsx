"use client";

import { Input } from "@/components/ui/Input";
import { MapPin } from "lucide-react";

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function LocationPicker({ value, onChange, error }: LocationPickerProps) {
  return (
    <div className="relative">
      <Input
        label="Location"
        placeholder="City, State or Neighborhood"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        className="pl-10"
      />
      <MapPin
        size={18}
        className="absolute left-3 top-[38px] text-muted pointer-events-none"
      />
    </div>
  );
}
