// ============================================================================
// channel.test.ts — wa.me link building for hand-sent WhatsApp messages
//
// WHY THIS MATTERS:
// A wrong link doesn't throw — it just opens a chat with the wrong person, or
// with a truncated message. Both fail silently in front of a client, so the
// rules are pinned down here.
// ============================================================================

import { describe, it, expect, vi, afterEach } from "vitest"
import {
  buildWhatsAppLink,
  planWhatsAppHandoff,
  copyText,
  isManualChannel,
  isSmsChannel,
  MAX_PREFILL_URL_LENGTH,
} from "../channel"

describe("buildWhatsAppLink", () => {
  it("drops the + and keeps only the digits wa.me expects", () => {
    expect(buildWhatsAppLink("+96170123456")).toBe("https://wa.me/96170123456")
  })

  it("URL-encodes the prefilled message", () => {
    const link = buildWhatsAppLink("+96170123456", "Hi Sara, your mug & bowl are ready!")
    expect(link).toBe(
      "https://wa.me/96170123456?text=Hi%20Sara%2C%20your%20mug%20%26%20bowl%20are%20ready!",
    )
  })

  it("encodes Arabic, and it round-trips intact", () => {
    const text = "مرحبا سارة"
    const link = buildWhatsAppLink("+96170123456", text)!
    expect(decodeURIComponent(new URL(link).searchParams.get("text")!)).toBe(text)
  })

  it("refuses a local-format number rather than guessing", () => {
    // "03123456" would be read by wa.me as country code 03… — someone else entirely.
    expect(buildWhatsAppLink("03123456")).toBeNull()
    expect(buildWhatsAppLink("70 123 456")).toBeNull()
    expect(buildWhatsAppLink("")).toBeNull()
  })

  it("refuses malformed international numbers", () => {
    expect(buildWhatsAppLink("+0123456789")).toBeNull() // no country code starts with 0
    expect(buildWhatsAppLink("+961 70 123 456")).toBeNull() // spaces
    expect(buildWhatsAppLink("+123")).toBeNull() // too short
  })
})

describe("planWhatsAppHandoff", () => {
  it("prefills a normal-length message", () => {
    const plan = planWhatsAppHandoff("+96170123456", "Hi Sara, your piece is ready!")
    expect(plan?.needsClipboard).toBe(false)
    expect(plan?.url).toContain("?text=")
  })

  it("falls back to an empty chat + clipboard when the link would be too long", () => {
    // Past the limit, what gets truncated is the message itself — so don't prefill.
    const plan = planWhatsAppHandoff("+96170123456", "a".repeat(MAX_PREFILL_URL_LENGTH))
    expect(plan?.needsClipboard).toBe(true)
    expect(plan?.url).toBe("https://wa.me/96170123456")
  })

  it("accounts for Arabic costing ~6 URL characters per letter", () => {
    // 300 Arabic letters look short but encode to ~1,800 characters, plus spaces.
    const arabic = "مرحبا ".repeat(60) // 360 characters
    const plan = planWhatsAppHandoff("+96170123456", arabic)
    expect(plan?.needsClipboard).toBe(true)
  })

  it("keeps a realistic Arabic notification prefilled", () => {
    const plan = planWhatsAppHandoff("+96170123456", "مرحبا سارة، قطعتك جاهزة للاستلام من الستوديو")
    expect(plan?.needsClipboard).toBe(false)
  })

  it("returns null for an unusable number", () => {
    expect(planWhatsAppHandoff("03123456", "hi")).toBeNull()
  })
})

describe("copyText", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("resolves true when the copy works", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    await expect(copyText("hi")).resolves.toBe(true)
  })

  it("resolves false — never rejects — when the copy is refused", async () => {
    // The handoff only reads the result after a network round-trip. A rejecting
    // promise would be logged as unhandled in the meantime.
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    })
    await expect(copyText("hi")).resolves.toBe(false)
  })

  it("resolves false where the clipboard API doesn't exist (insecure context)", async () => {
    vi.stubGlobal("navigator", {})
    await expect(copyText("hi")).resolves.toBe(false)
  })
})

describe("channel predicates", () => {
  it("identifies the hand-sent channel", () => {
    expect(isManualChannel("whatsapp_manual")).toBe(true)
    expect(isManualChannel("whatsapp")).toBe(false)
    expect(isManualChannel("sms")).toBe(false)
  })

  it("identifies SMS, the only channel billed per segment", () => {
    expect(isSmsChannel("sms")).toBe(true)
    expect(isSmsChannel("whatsapp_manual")).toBe(false)
  })
})
