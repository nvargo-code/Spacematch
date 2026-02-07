"use client";

import { useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface AvailabilitySlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    startDate: Date;
    endDate: Date;
    recurring?: {
      frequency: "weekly" | "biweekly" | "monthly";
      dayOfWeek?: number;
      endRecurrence?: Date;
    };
    notes?: string;
  }) => Promise<void>;
  initialStart?: Date;
  initialEnd?: Date;
}

export function AvailabilitySlotModal({
  isOpen,
  onClose,
  onSave,
  initialStart,
  initialEnd,
}: AvailabilitySlotModalProps) {
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(
    initialStart ? formatDate(initialStart) : ""
  );
  const [endDate, setEndDate] = useState(
    initialEnd ? formatDate(initialEnd) : ""
  );
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">(
    "weekly"
  );
  const [endRecurrence, setEndRecurrence] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!startDate || !endDate) return;

    setSaving(true);
    try {
      await onSave({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        recurring: isRecurring
          ? {
              frequency,
              dayOfWeek: new Date(startDate).getDay(),
              endRecurrence: endRecurrence
                ? new Date(endRecurrence)
                : undefined,
            }
          : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Availability" size="md">
      <ModalBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Recurring toggle */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
            />
            <span className="text-sm text-foreground">Recurring availability</span>
          </label>
        </div>

        {isRecurring && (
          <div className="space-y-3 pl-6 border-l-2 border-accent/30">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Frequency
              </label>
              <div className="flex gap-2">
                {(["weekly", "biweekly", "monthly"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                      frequency === f
                        ? "bg-accent text-background border-accent"
                        : "bg-card text-muted border-border hover:border-accent/50"
                    )}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="End Recurrence (optional)"
              type="date"
              value={endRecurrence}
              onChange={(e) => setEndRecurrence(e.target.value)}
            />
          </div>
        )}

        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Available weekday mornings only"
          className="min-h-[80px]"
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!startDate || !endDate}
        >
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}
