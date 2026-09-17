// ── SMS segment estimation (client-side mirror) ──
//
// ⚠️ This intentionally duplicates `estimateSegments` in
// Way-Backend/src/lib/messaging/sms-provider.ts. The backend copy is authoritative
// and used for logging and cost guards; this copy exists so the composer can show a
// live counter as staff type, without a round-trip per keystroke.
//
// If you change the rules, change BOTH. They're both pure functions with tests.
//
// Why anyone should care: SMS is billed per segment, and the segment size depends
// on the alphabet.
//
//   GSM-7 (Latin)                  160 chars alone, 153 each once it splits
//   UCS-2 (anything else, Arabic)   70 chars alone,  67 each once it splits
//
// So a single Arabic character anywhere in the message drops the whole thing to
// 70-character segments and can triple its cost. That's the single most surprising
// thing about SMS pricing and it's worth showing staff before they hit send.

const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"

// These cost TWO septets each — an escape byte plus the character.
const GSM7_EXTENDED = "^{}\\[~]|€"

export interface SegmentEstimate {
  encoding: "GSM-7" | "UCS-2"
  count: number
  /** Characters left before the message spills into another billable segment. */
  remainingInLastSegment: number
}

export function estimateSegments(body: string): SegmentEstimate {
  if (!body) return { encoding: "GSM-7", count: 0, remainingInLastSegment: 160 }

  const chars = [...body] // spread so astral-plane characters aren't split
  const isGsm7 = chars.every(c => GSM7_BASIC.includes(c) || GSM7_EXTENDED.includes(c))

  if (!isGsm7) {
    // UCS-2. Surrogate pairs (emoji) occupy two units each, which .length reflects.
    const units = body.length
    const count = units <= 70 ? 1 : Math.ceil(units / 67)
    const capacity = count === 1 ? 70 : count * 67
    return { encoding: "UCS-2", count, remainingInLastSegment: capacity - units }
  }

  const septets = chars.reduce((sum, c) => sum + (GSM7_EXTENDED.includes(c) ? 2 : 1), 0)
  const count = septets <= 160 ? 1 : Math.ceil(septets / 153)
  const capacity = count === 1 ? 160 : count * 153
  return { encoding: "GSM-7", count, remainingInLastSegment: capacity - septets }
}

/**
 * Substitutes {{1}}, {{2}}… into a template body for preview.
 *
 * Unfilled placeholders are left visible rather than blanked, so staff can see at a
 * glance which values are still missing instead of reading a sentence with a
 * silent hole in it.
 */
export function renderPreview(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (match, index: string) => {
    const value = variables[index]
    return value && value.trim() ? value : match
  })
}

/** The distinct placeholder indexes used in a template body, ascending. */
export function extractPlaceholders(body: string): number[] {
  const found = new Set<number>()
  for (const match of body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    found.add(Number(match[1]))
  }
  return [...found].sort((a, b) => a - b)
}
