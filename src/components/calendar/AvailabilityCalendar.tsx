"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { useAvailability } from "@/hooks/useAvailability";
import { Spinner } from "@/components/ui/Spinner";

interface AvailabilityCalendarProps {
  postId: string;
}

export function AvailabilityCalendar({ postId }: AvailabilityCalendarProps) {
  const { events, loading } = useAvailability(postId);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-muted text-sm text-center py-4">
        No availability set yet.
      </p>
    );
  }

  const calendarEvents = events.map((e) => ({
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: "#22c55e",
    borderColor: "#16a34a",
  }));

  return (
    <div className="fc-dark">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={calendarEvents}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        height="auto"
        dayMaxEvents={3}
      />
    </div>
  );
}
