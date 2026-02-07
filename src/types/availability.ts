export interface RecurringPattern {
  frequency: "weekly" | "biweekly" | "monthly";
  dayOfWeek?: number;
  endRecurrence?: Date;
}

export interface AvailabilitySlot {
  id: string;
  startDate: Date;
  endDate: Date;
  recurring?: RecurringPattern;
  notes?: string;
  createdAt: Date;
}
