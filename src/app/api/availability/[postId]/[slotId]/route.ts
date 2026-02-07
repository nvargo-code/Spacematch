import { NextResponse } from "next/server";
import {
  deleteAvailabilitySlot,
  updateAvailabilitySlot,
} from "@/lib/firebase/availability";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: { postId: string; slotId: string } }
) {
  try {
    await deleteAvailabilitySlot(params.postId, params.slotId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE availability error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { postId: string; slotId: string } }
) {
  try {
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.startDate) updates.startDate = new Date(body.startDate);
    if (body.endDate) updates.endDate = new Date(body.endDate);
    if (body.recurring !== undefined) {
      updates.recurring = body.recurring
        ? {
            frequency: body.recurring.frequency,
            dayOfWeek: body.recurring.dayOfWeek,
            endRecurrence: body.recurring.endRecurrence
              ? new Date(body.recurring.endRecurrence)
              : undefined,
          }
        : undefined;
    }
    if (body.notes !== undefined) updates.notes = body.notes;

    await updateAvailabilitySlot(params.postId, params.slotId, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH availability error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
