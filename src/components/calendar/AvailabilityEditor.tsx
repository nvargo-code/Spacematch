"use client";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAvailability } from "@/hooks/useAvailability";
import { useToast } from "@/context/ToastProvider";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AvailabilitySlotModal } from "./AvailabilitySlotModal";
import { formatDate } from "@/lib/utils/formatters";
import { Trash2, Plus, Calendar } from "lucide-react";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core";

interface AvailabilityEditorProps {
  postId: string;
}

export function AvailabilityEditor({ postId }: AvailabilityEditorProps) {
  const { slots, events, loading, addSlot, removeSlot } =
    useAvailability(postId);
  const { success, error: showError } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStart, setSelectedStart] = useState<Date | undefined>();
  const [selectedEnd, setSelectedEnd] = useState<Date | undefined>();

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedStart(selectInfo.start);
    setSelectedEnd(selectInfo.end);
    setModalOpen(true);
  };

  const handleEventClick = async (clickInfo: EventClickArg) => {
    const slotId = clickInfo.event.extendedProps.slotId;
    if (!slotId) return;

    if (confirm("Delete this availability slot?")) {
      try {
        await removeSlot(slotId);
        success("Availability slot deleted");
      } catch {
        showError("Failed to delete slot");
      }
    }
  };

  const handleSave = async (data: {
    startDate: Date;
    endDate: Date;
    recurring?: {
      frequency: "weekly" | "biweekly" | "monthly";
      dayOfWeek?: number;
      endRecurrence?: Date;
    };
    notes?: string;
  }) => {
    try {
      await addSlot(data);
      success("Availability added");
    } catch {
      showError("Failed to add availability");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  const calendarEvents = events.map((e) => ({
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: "#22c55e",
    borderColor: "#16a34a",
    extendedProps: { slotId: e.slotId },
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Click and drag on the calendar to add availability, or click an event
          to delete it.
        </p>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} className="mr-1.5" />
          Add Manually
        </Button>
      </div>

      <div className="fc-dark">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          selectable
          select={handleDateSelect}
          eventClick={handleEventClick}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          height="auto"
          dayMaxEvents={3}
        />
      </div>

      {/* Slot list */}
      {slots.length > 0 && (
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar size={16} />
            Availability Slots ({slots.length})
          </h3>
          <div className="space-y-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
              >
                <div>
                  <p className="text-sm text-foreground">
                    {formatDate(slot.startDate)} — {formatDate(slot.endDate)}
                  </p>
                  {slot.recurring && (
                    <p className="text-xs text-muted">
                      Repeats {slot.recurring.frequency}
                    </p>
                  )}
                  {slot.notes && (
                    <p className="text-xs text-muted mt-0.5">{slot.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => removeSlot(slot.id)}
                  className="p-1.5 text-muted hover:text-error transition-colors"
                  aria-label="Delete slot"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AvailabilitySlotModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStart(undefined);
          setSelectedEnd(undefined);
        }}
        onSave={handleSave}
        initialStart={selectedStart}
        initialEnd={selectedEnd}
      />
    </div>
  );
}
