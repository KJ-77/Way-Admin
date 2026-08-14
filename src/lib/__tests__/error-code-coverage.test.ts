// ============================================================================
// error-code-coverage.test.ts — contract test between backend error codes and
// the admin's i18n catalog.
//
// WHY THIS EXISTS:
// friendlyError() resolves `errors.codes.<CODE>` first and falls back to
// `errors.status.<HTTP_STATUS>` when the key is missing. That fallback is silent
// — nothing throws, nothing warns, the UI just quietly degrades to a generic
// string. A 403 with a perfectly good backend message ("This subscription
// doesn't cover this class...") rendered as "You don't have permission to do
// this.", which is both vaguer and actively misleading: it reads as a
// permissions problem when it's really a data-selection mistake.
//
// The failure mode is "backend adds a code, frontend never learns about it", so
// a hand-maintained list here would reproduce the same forgetting problem. This
// reads the backend source instead, which means adding a code without a
// translation fails the suite.
// ============================================================================

import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import en from "@/i18n/locales/en.json"

// Way-Backend is a sibling repo. In a checkout that doesn't have it, the
// extraction tests skip rather than fail — this guards drift, it isn't a
// dependency of the app itself.
const BACKEND_SRC = path.resolve(process.cwd(), "../Way-Backend/src")
const hasBackend = fs.existsSync(BACKEND_SRC)

// Codes attached to internal errors for control flow, never serialized onto an
// API response. `ETIMEDOUT` tags a provider timeout so the send-policy
// classifier can decide retryable vs unconfirmed; it's always reclassified into
// SEND_FAILED / SEND_UNCONFIRMED before anything reaches the client.
const NOT_WIRE_CODES = new Set(["ETIMEDOUT"])

/** Recursively collect .ts files, skipping test directories. */
function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : walk(full)
    return full.endsWith(".ts") ? [full] : []
  })
}

/**
 * Scrapes every error code the backend can put on the wire. Two emission
 * shapes, both in Way-Backend:
 *   1. `code: "SOMETHING"`            — createResponse bodies + handleError
 *   2. `businessError(409, "X", ...)` — service-layer throws
 * Postgres codes ("23505") are excluded by the leading-letter requirement.
 */
function extractBackendCodes(): Set<string> {
  const files = [
    ...walk(path.join(BACKEND_SRC, "functions")),
    ...walk(path.join(BACKEND_SRC, "services")),
    path.join(BACKEND_SRC, "lib", "response.ts"),
  ].filter((f) => fs.existsSync(f))

  const codes = new Set<string>()
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8")
    for (const m of src.matchAll(/\bcode:\s*["']([A-Z][A-Z0-9_]*)["']/g)) codes.add(m[1])
    for (const m of src.matchAll(/businessError\(\s*\d+\s*,\s*["']([A-Z][A-Z0-9_]*)["']/g)) {
      codes.add(m[1])
    }
  }

  for (const internal of NOT_WIRE_CODES) codes.delete(internal)
  return codes
}

describe("backend error code → i18n coverage", () => {
  it.skipIf(!hasBackend)("every backend error code has an admin translation", () => {
    const backendCodes = [...extractBackendCodes()].sort()
    const translated = new Set(Object.keys(en.errors.codes))

    // Sanity: if the scrape returns nothing the regexes have rotted and the
    // test would pass vacuously.
    expect(backendCodes.length).toBeGreaterThan(20)

    const missing = backendCodes.filter((code) => !translated.has(code))

    expect(
      missing,
      `Backend emits error codes with no entry in en.json → errors.codes.\n` +
        `These will silently render as the generic errors.status.<code> string.\n` +
        `Add them to src/i18n/locales/en.json:\n${missing.map((c) => `  - ${c}`).join("\n")}`,
    ).toEqual([])
  })

  it.skipIf(!hasBackend)("has no translations for codes the backend never emits", () => {
    // Not a hard failure condition, but stale keys mean dead copy that reviewers
    // trust and nobody maintains. Kept strict so removals get noticed.
    const backendCodes = extractBackendCodes()
    const stale = Object.keys(en.errors.codes).filter((code) => !backendCodes.has(code))

    expect(stale, `en.json has translations for codes the backend no longer emits: ${stale.join(", ")}`)
      .toEqual([])
  })
})

describe("the specific regression: 403s that aren't permission problems", () => {
  // Both of these are 403 but describe a wrong *selection*, not a missing
  // privilege. Without their own entries they inherit errors.status.403
  // ("You don't have permission to do this."), which sends staff hunting for a
  // roles bug that doesn't exist.
  it.each(["CLASS_TYPE_MISMATCH", "SUB_OWNERSHIP", "CLIENT_ATTENDANCE_FORBIDDEN"])(
    "%s has its own message, not the generic 403",
    (code) => {
      const message = (en.errors.codes as Record<string, string>)[code]

      expect(message).toBeTruthy()
      expect(message).not.toBe(en.errors.status["403"])
    },
  )
})
