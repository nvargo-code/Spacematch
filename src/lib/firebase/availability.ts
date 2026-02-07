import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import { AvailabilitySlot } from "@/types";

export async function getAvailability(
  postId: string
): Promise<AvailabilitySlot[]> {
  const slotsRef = collection(db, "posts", postId, "availability");
  const q = query(slotsRef, orderBy("startDate", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      recurring: data.recurring
        ? {
            frequency: data.recurring.frequency,
            dayOfWeek: data.recurring.dayOfWeek,
            endRecurrence: data.recurring.endRecurrence?.toDate() || undefined,
          }
        : undefined,
      notes: data.notes || undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
}

export async function addAvailabilitySlot(
  postId: string,
  slot: Omit<AvailabilitySlot, "id" | "createdAt">
): Promise<string> {
  const slotsRef = collection(db, "posts", postId, "availability");

  const docData: Record<string, unknown> = {
    startDate: Timestamp.fromDate(slot.startDate),
    endDate: Timestamp.fromDate(slot.endDate),
    createdAt: serverTimestamp(),
  };

  if (slot.recurring) {
    docData.recurring = {
      frequency: slot.recurring.frequency,
      ...(slot.recurring.dayOfWeek !== undefined && {
        dayOfWeek: slot.recurring.dayOfWeek,
      }),
      ...(slot.recurring.endRecurrence && {
        endRecurrence: Timestamp.fromDate(slot.recurring.endRecurrence),
      }),
    };
  }

  if (slot.notes) {
    docData.notes = slot.notes;
  }

  const ref = await addDoc(slotsRef, docData);

  // Update summary fields on post
  await updateAvailabilitySummary(postId);

  return ref.id;
}

export async function updateAvailabilitySlot(
  postId: string,
  slotId: string,
  updates: Partial<Omit<AvailabilitySlot, "id" | "createdAt">>
): Promise<void> {
  const slotRef = doc(db, "posts", postId, "availability", slotId);
  const updateData: Record<string, unknown> = {};

  if (updates.startDate) {
    updateData.startDate = Timestamp.fromDate(updates.startDate);
  }
  if (updates.endDate) {
    updateData.endDate = Timestamp.fromDate(updates.endDate);
  }
  if (updates.recurring !== undefined) {
    if (updates.recurring) {
      updateData.recurring = {
        frequency: updates.recurring.frequency,
        ...(updates.recurring.dayOfWeek !== undefined && {
          dayOfWeek: updates.recurring.dayOfWeek,
        }),
        ...(updates.recurring.endRecurrence && {
          endRecurrence: Timestamp.fromDate(updates.recurring.endRecurrence),
        }),
      };
    } else {
      updateData.recurring = null;
    }
  }
  if (updates.notes !== undefined) {
    updateData.notes = updates.notes || null;
  }

  await updateDoc(slotRef, updateData);
  await updateAvailabilitySummary(postId);
}

export async function deleteAvailabilitySlot(
  postId: string,
  slotId: string
): Promise<void> {
  const slotRef = doc(db, "posts", postId, "availability", slotId);
  await deleteDoc(slotRef);
  await updateAvailabilitySummary(postId);
}

async function updateAvailabilitySummary(postId: string): Promise<void> {
  const slots = await getAvailability(postId);
  const postRef = doc(db, "posts", postId);

  if (slots.length === 0) {
    await updateDoc(postRef, {
      hasAvailability: false,
      availabilityStart: null,
      availabilityEnd: null,
    });
    return;
  }

  const allDates = slots.flatMap((s) => [s.startDate, s.endDate]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  await updateDoc(postRef, {
    hasAvailability: true,
    availabilityStart: Timestamp.fromDate(minDate),
    availabilityEnd: Timestamp.fromDate(maxDate),
  });
}

/**
 * Expand recurring slots into individual date ranges for calendar display.
 * Generates occurrences up to `horizon` (default 6 months from now).
 */
export function expandRecurringSlots(
  slots: AvailabilitySlot[],
  horizon?: Date
): { start: Date; end: Date; title: string; slotId: string }[] {
  const maxDate = horizon || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  const events: { start: Date; end: Date; title: string; slotId: string }[] = [];

  for (const slot of slots) {
    if (!slot.recurring) {
      events.push({
        start: slot.startDate,
        end: slot.endDate,
        title: slot.notes || "Available",
        slotId: slot.id,
      });
      continue;
    }

    const { frequency, dayOfWeek, endRecurrence } = slot.recurring;
    const recEnd = endRecurrence && endRecurrence < maxDate ? endRecurrence : maxDate;
    const durationMs = slot.endDate.getTime() - slot.startDate.getTime();

    let current = new Date(slot.startDate);

    // If dayOfWeek is set, adjust to the correct day
    if (dayOfWeek !== undefined) {
      while (current.getDay() !== dayOfWeek) {
        current.setDate(current.getDate() + 1);
      }
    }

    while (current <= recEnd) {
      events.push({
        start: new Date(current),
        end: new Date(current.getTime() + durationMs),
        title: slot.notes || "Available",
        slotId: slot.id,
      });

      switch (frequency) {
        case "weekly":
          current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "biweekly":
          current = new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000);
          break;
        case "monthly":
          current = new Date(current);
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }
  }

  return events;
}
