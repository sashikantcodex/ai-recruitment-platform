/** Pure interview scheduling helpers. */
export function computeEndTime(startsAt: Date, durationMinutes: number): Date {
  if (durationMinutes <= 0) {
    throw new Error("durationMinutes must be positive");
  }
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

export function buildInterviewTopic(jobTitle?: string): string {
  return `Interview: ${jobTitle?.trim() || "Role"}`;
}

export function isFutureSchedule(startsAt: Date, now = new Date()): boolean {
  return startsAt.getTime() > now.getTime();
}
