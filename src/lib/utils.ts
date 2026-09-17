import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strip all whitespace from a phone number so the value sent to the API is consistent
// regardless of how the user typed it ("+961 70 779 950" → "+96170779950"). The
// backend's Cognito layer already does the same thing before talking to Cognito —
// we apply it on the way out so the DB also stores the normalized form, which makes
// the UNIQUE(phone) constraint meaningful.
export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "")
}

// "18:00:00" → "18:00". Class times are wall-clock times at the studio, stored as a
// Postgres TIME, so they're formatted as plain strings — never via Date, which would
// apply the browser's timezone and could shift the hour. 24-hour to match how the
// schedule displays classes.
// (class-detail.tsx and schedule-calendar.tsx each still carry a private formatTime
// that does the same thing — candidates to switch over to this.)
export function formatClockTime(hhmmss: string): string {
  const [h = "00", m = "00"] = hhmmss.split(":")
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`
}
