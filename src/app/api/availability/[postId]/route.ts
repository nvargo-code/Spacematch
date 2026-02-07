import { NextResponse } from "next/server";
import {
  getAvailability,
  addAvailabilitySlot,
  expandRecurringSlots,
} from "@/lib/firebase/availability";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const slots = await getAvailability(params.postId);
    const events = expandRecurringSlots(slots);

    return NextResponse.json({ slots, events });
  } catch (error) {
    console.error("GET availability error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const body = await request.json();

    const slot = {
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      recurring: body.recurring
        ? {
            frequency: body.recurring.frequency,
            dayOfWeek: body.recurring.dayOfWeek,
            endRecurrence: body.recurring.endRecurrence
              ? new Date(body.recurring.endRecurrence)
              : undefined,
          }
        : undefined,
      notes: body.notes || undefined,
    };

    const id = await addAvailabilitySlot(params.postId, slot);

    return NextResponse.json({ id });
  } catch (error) {
    console.error("POST availability error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
