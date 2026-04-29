// ============================================================================
// utils.test.ts — Tests for the cn() utility function
//
// WHAT'S BEING TESTED:
// cn() — a tiny but important function that merges Tailwind CSS class names.
// It combines clsx (conditional class joining) with tailwind-merge (resolving
// conflicting Tailwind classes like "p-2 p-4" into just "p-4").
//
// WHY THIS?
// It's the only pure utility function in the frontend. Most of the frontend
// logic lives in React hooks (which need API mocking) and components (which
// need React Testing Library). cn() gives us a clean way to prove the test
// setup works before we tackle those harder patterns.
//
// Even though it's simple, cn() is used in EVERY component via shadcn — if it
// broke, the entire UI's styling would break. Tests protect against that.
// ============================================================================

import { describe, it, expect } from "vitest"
import { cn } from "../utils"

describe("cn", () => {
  it("merges multiple class strings together", () => {
    const result = cn("px-4", "py-2", "text-white")
    expect(result).toBe("px-4 py-2 text-white")
  })

  it("resolves conflicting Tailwind classes (last one wins)", () => {
    // tailwind-merge knows that p-2 and p-4 conflict — it keeps the last one
    const result = cn("p-2", "p-4")
    expect(result).toBe("p-4")
  })

  it("handles conditional classes (the clsx part)", () => {
    const isActive = true
    const isDisabled = false
    // clsx syntax: falsy values get filtered out
    const result = cn("base-class", isActive && "bg-blue-500", isDisabled && "opacity-50")
    expect(result).toBe("base-class bg-blue-500")
  })

  it("handles undefined and null inputs gracefully", () => {
    const result = cn("text-sm", undefined, null, "font-bold")
    expect(result).toBe("text-sm font-bold")
  })

  it("returns empty string when given no arguments", () => {
    const result = cn()
    expect(result).toBe("")
  })
})
