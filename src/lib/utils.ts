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
