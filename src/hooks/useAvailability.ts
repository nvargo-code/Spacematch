"use client";

import { useState, useEffect, useCallback } from "react";
import { AvailabilitySlot } from "@/types";
import { expandRecurringSlots } from "@/lib/firebase/availability";

export function useAvailability(postId: string) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [events, setEvents] = useState<
    { start: Date; end: Date; title: string; slotId: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/availability/${postId}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Parse dates from JSON
      const parsedSlots: AvailabilitySlot[] = (data.slots || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) => ({
          ...s,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
          createdAt: new Date(s.createdAt),
          recurring: s.recurring
            ? {
                ...s.recurring,
                endRecurrence: s.recurring.endRecurrence
                  ? new Date(s.recurring.endRecurrence)
                  : undefined,
              }
            : undefined,
        })
      );

      setSlots(parsedSlots);
      setEvents(expandRecurringSlots(parsedSlots));
    } catch (err) {
      console.error("Error loading availability:", err);
      setError("Failed to load availability");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const addSlot = useCallback(
    async (slot: Omit<AvailabilitySlot, "id" | "createdAt">) => {
      const res = await fetch(`/api/availability/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: slot.startDate.toISOString(),
          endDate: slot.endDate.toISOString(),
          recurring: slot.recurring
            ? {
                frequency: slot.recurring.frequency,
                dayOfWeek: slot.recurring.dayOfWeek,
                endRecurrence: slot.recurring.endRecurrence?.toISOString(),
              }
            : undefined,
          notes: slot.notes,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      await loadAvailability();
      return data.id;
    },
    [postId, loadAvailability]
  );

  const removeSlot = useCallback(
    async (slotId: string) => {
      const res = await fetch(`/api/availability/${postId}/${slotId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      await loadAvailability();
    },
    [postId, loadAvailability]
  );

  const updateSlot = useCallback(
    async (
      slotId: string,
      updates: Partial<Omit<AvailabilitySlot, "id" | "createdAt">>
    ) => {
      const body: Record<string, unknown> = {};
      if (updates.startDate) body.startDate = updates.startDate.toISOString();
      if (updates.endDate) body.endDate = updates.endDate.toISOString();
      if (updates.recurring !== undefined) {
        body.recurring = updates.recurring
          ? {
              frequency: updates.recurring.frequency,
              dayOfWeek: updates.recurring.dayOfWeek,
              endRecurrence: updates.recurring.endRecurrence?.toISOString(),
            }
          : null;
      }
      if (updates.notes !== undefined) body.notes = updates.notes;

      const res = await fetch(`/api/availability/${postId}/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      await loadAvailability();
    },
    [postId, loadAvailability]
  );

  return {
    slots,
    events,
    loading,
    error,
    addSlot,
    removeSlot,
    updateSlot,
    refresh: loadAvailability,
  };
}
