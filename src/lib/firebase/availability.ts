import { AvailabilitySlot } from "@/types";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromFirestoreValue(val: any): any {
  if (val === null || val === undefined) return null;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return val.doubleValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("nullValue" in val) return null;
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) return (val.arrayValue?.values || []).map(fromFirestoreValue);
  if ("mapValue" in val) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) {
      result[k] = fromFirestoreValue(v);
    }
    return result;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export async function getAvailability(
  postId: string
): Promise<AvailabilitySlot[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts/${postId}/availability?orderBy=startDate`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) return [];
    const errText = await response.text();
    console.error("getAvailability REST error:", errText);
    return [];
  }

  const data = await response.json();
  const documents = data.documents || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return documents.map((doc: any) => {
    const fields = doc.fields || {};
    const id = doc.name?.split("/").pop();

    const recurring = fields.recurring ? fromFirestoreValue(fields.recurring) : undefined;

    return {
      id,
      startDate: new Date(fields.startDate?.timestampValue || Date.now()),
      endDate: new Date(fields.endDate?.timestampValue || Date.now()),
      recurring: recurring ? {
        frequency: recurring.frequency,
        dayOfWeek: recurring.dayOfWeek,
        endRecurrence: recurring.endRecurrence ? new Date(recurring.endRecurrence) : undefined,
      } : undefined,
      notes: fields.notes?.stringValue || undefined,
      createdAt: new Date(fields.createdAt?.timestampValue || Date.now()),
    };
  });
}

export async function addAvailabilitySlot(
  postId: string,
  slot: Omit<AvailabilitySlot, "id" | "createdAt">
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = {
    startDate: { timestampValue: slot.startDate.toISOString() },
    endDate: { timestampValue: slot.endDate.toISOString() },
    createdAt: { timestampValue: new Date().toISOString() },
  };

  if (slot.recurring) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recurringFields: Record<string, any> = {
      frequency: toFirestoreValue(slot.recurring.frequency),
    };
    if (slot.recurring.dayOfWeek !== undefined) {
      recurringFields.dayOfWeek = toFirestoreValue(slot.recurring.dayOfWeek);
    }
    if (slot.recurring.endRecurrence) {
      recurringFields.endRecurrence = { timestampValue: slot.recurring.endRecurrence.toISOString() };
    }
    fields.recurring = { mapValue: { fields: recurringFields } };
  }

  if (slot.notes) {
    fields.notes = toFirestoreValue(slot.notes);
  }

  const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts/${postId}/availability`;
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error("addAvailabilitySlot REST error:", errText);
    throw new Error("Failed to add availability slot");
  }

  const createData = await createRes.json();
  const newDocId = createData.name?.split("/").pop();

  // Update summary fields on post
  await updateAvailabilitySummary(postId);

  return newDocId;
}

export async function updateAvailabilitySlot(
  postId: string,
  slotId: string,
  updates: Partial<Omit<AvailabilitySlot, "id" | "createdAt">>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = {};
  const updateMask: string[] = [];

  if (updates.startDate) {
    fields.startDate = { timestampValue: updates.startDate.toISOString() };
    updateMask.push("startDate");
  }
  if (updates.endDate) {
    fields.endDate = { timestampValue: updates.endDate.toISOString() };
    updateMask.push("endDate");
  }
  if (updates.recurring !== undefined) {
    if (updates.recurring) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recurringFields: Record<string, any> = {
        frequency: toFirestoreValue(updates.recurring.frequency),
      };
      if (updates.recurring.dayOfWeek !== undefined) {
        recurringFields.dayOfWeek = toFirestoreValue(updates.recurring.dayOfWeek);
      }
      if (updates.recurring.endRecurrence) {
        recurringFields.endRecurrence = { timestampValue: updates.recurring.endRecurrence.toISOString() };
      }
      fields.recurring = { mapValue: { fields: recurringFields } };
    } else {
      fields.recurring = { nullValue: null };
    }
    updateMask.push("recurring");
  }
  if (updates.notes !== undefined) {
    fields.notes = updates.notes ? toFirestoreValue(updates.notes) : { nullValue: null };
    updateMask.push("notes");
  }

  const docPath = `projects/${projectId}/databases/(default)/documents/posts/${postId}/availability/${slotId}`;
  const patchUrl = `https://firestore.googleapis.com/v1/${docPath}?${updateMask.map(f => `updateMask.fieldPaths=${f}`).join("&")}`;

  const res = await fetch(patchUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("updateAvailabilitySlot REST error:", errText);
    throw new Error("Failed to update availability slot");
  }

  await updateAvailabilitySummary(postId);
}

export async function deleteAvailabilitySlot(
  postId: string,
  slotId: string
): Promise<void> {
  const docPath = `projects/${projectId}/databases/(default)/documents/posts/${postId}/availability/${slotId}`;
  const deleteUrl = `https://firestore.googleapis.com/v1/${docPath}`;

  const res = await fetch(deleteUrl, { method: "DELETE" });

  if (!res.ok) {
    const errText = await res.text();
    console.error("deleteAvailabilitySlot REST error:", errText);
    throw new Error("Failed to delete availability slot");
  }

  await updateAvailabilitySummary(postId);
}

async function updateAvailabilitySummary(postId: string): Promise<void> {
  const slots = await getAvailability(postId);
  const docPath = `projects/${projectId}/databases/(default)/documents/posts/${postId}`;

  if (slots.length === 0) {
    const patchUrl = `https://firestore.googleapis.com/v1/${docPath}?updateMask.fieldPaths=hasAvailability&updateMask.fieldPaths=availabilityStart&updateMask.fieldPaths=availabilityEnd`;
    await fetch(patchUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          hasAvailability: { booleanValue: false },
          availabilityStart: { nullValue: null },
          availabilityEnd: { nullValue: null },
        },
      }),
    });
    return;
  }

  const allDates = slots.flatMap((s) => [s.startDate, s.endDate]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  const patchUrl = `https://firestore.googleapis.com/v1/${docPath}?updateMask.fieldPaths=hasAvailability&updateMask.fieldPaths=availabilityStart&updateMask.fieldPaths=availabilityEnd`;
  await fetch(patchUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        hasAvailability: { booleanValue: true },
        availabilityStart: { timestampValue: minDate.toISOString() },
        availabilityEnd: { timestampValue: maxDate.toISOString() },
      },
    }),
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
