// ── Messaging channel helpers ──
//
// Which delivery channel the studio uses, plus the wa.me deep-link builder for
// hand-sent WhatsApp messages.

import type { MessageChannel } from "@/types"

/**
 * The channel NEW messages are drafted on.
 *
 * ⚠️ Keep in step with the backend's DEFAULT_MESSAGE_CHANNEL (serverless.yml).
 * Only cosmetic things read this — whether the composer shows an SMS cost counter,
 * whether the Broadcasts tab exists. What actually happens to a message is decided
 * by that message's own `channel` field, so a drift here can never send a message
 * the wrong way.
 */
export const ACTIVE_CHANNEL: MessageChannel = "whatsapp_manual"

/** A person sends these by hand; there's no provider behind them. */
export const isManualChannel = (channel: MessageChannel): boolean =>
  channel === "whatsapp_manual"

/** SMS is billed per segment, so SMS surfaces show a live cost counter. */
export const isSmsChannel = (channel: MessageChannel): boolean => channel === "sms"

// Beyond this, browsers and WhatsApp itself start trimming the link — and what gets
// trimmed is the prefilled MESSAGE in the compose box, not just the URL. ~2,000 is
// the long-standing safe URL length across browsers.
//
// For scale: an English character costs 1 (a space costs 3), an Arabic letter costs
// 6 (two UTF-8 bytes, each written as %XX), an emoji 12. A normal 150-character
// Arabic message comes to ~900, so this only trips on unusually long messages.
export const MAX_PREFILL_URL_LENGTH = 2000

/**
 * Builds a wa.me link to a client's WhatsApp.
 *
 * wa.me wants the full international number as digits only — no "+", spaces or
 * dashes. Our stored phones are E.164 ("+96170123456"), so dropping the "+" is
 * all it takes.
 *
 * Returns null for a number that isn't in international form. A local number like
 * "03123456" would produce a link to the wrong person (wa.me reads the leading
 * digits as a country code), so it's refused rather than guessed at.
 */
export function buildWhatsAppLink(e164: string, text?: string): string | null {
  if (!/^\+[1-9]\d{6,14}$/.test(e164)) return null
  const base = `https://wa.me/${e164.slice(1)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/**
 * Copies text to the clipboard. Resolves true/false — never rejects.
 *
 * Why not just call navigator.clipboard.writeText: the handoff has to START the copy
 * inside the click (browsers require a user gesture) but only REPORTS the result
 * after a network round-trip. A promise that can reject, with its handler attached
 * only after that await, gets logged by the browser as an unhandled rejection in
 * the meantime. Settling to a boolean immediately avoids that entirely.
 *
 * navigator.clipboard is undefined outside secure contexts (plain http, other than
 * localhost), so that case resolves false rather than throwing.
 */
export function copyText(text: string): Promise<boolean> {
  if (!navigator.clipboard) return Promise.resolve(false)
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false,
  )
}

export interface WhatsAppHandoffPlan {
  /** Where to send the staff member. */
  url: string
  /**
   * True when the message was too long to prefill safely. The link then opens the
   * chat empty, and the message must be copied to the clipboard for pasting.
   */
  needsClipboard: boolean
}

/**
 * Decides how to hand a message over to WhatsApp: prefilled when it fits, or an
 * empty chat plus clipboard copy when it doesn't. Null if the number is unusable.
 */
export function planWhatsAppHandoff(e164: string, body: string): WhatsAppHandoffPlan | null {
  const prefilled = buildWhatsAppLink(e164, body)
  if (!prefilled) return null
  if (prefilled.length <= MAX_PREFILL_URL_LENGTH) {
    return { url: prefilled, needsClipboard: false }
  }
  return { url: buildWhatsAppLink(e164)!, needsClipboard: true }
}
