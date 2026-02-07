"use client";

import { useState, useEffect, useCallback } from "react";
import { AvailabilitySlot } from "@/types";
import {
  getAvailability,
  addAvailabilitySlot,
  deleteAvailabilitySlot,
  updateAvailabilitySlot,
  expandRecurringSlots,
} from "@/lib/firebase/availability";

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
      const data = await getAvailability(postId);
      setSlots(data);
      setEvents(expandRecurringSlots(data));
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
      const id = await addAvailabilitySlot(postId, slot);
      await loadAvailability();
      return id;
    },
    [postId, loadAvailability]
  );

  const removeSlot = useCallback(
    async (slotId: string) => {
      await deleteAvailabilitySlot(postId, slotId);
      await loadAvailability();
    },
    [postId, loadAvailability]
  );

  const updateSlot = useCallback(
    async (
      slotId: string,
      updates: Partial<Omit<AvailabilitySlot, "id" | "createdAt">>
    ) => {
      await updateAvailabilitySlot(postId, slotId, updates);
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
