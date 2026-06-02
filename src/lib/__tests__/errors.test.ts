import { describe, it, expect, vi, beforeEach } from "vitest"
import { ApiError, throwIfNotOk, friendlyError } from "../errors"

// i18n is initialized at app boot. For tests we mock it so we can assert behavior
// without spinning up a real i18n instance per test.
vi.mock("@/i18n", () => ({
  default: {
    t: (key: string) => {
      const table: Record<string, string> = {
        "errors.unknown": "Something went wrong.",
        "errors.network": "Network failure.",
        "errors.codes.PHONE_TAKEN": "Phone is taken.",
        "errors.codes.EMAIL_TAKEN": "Email is taken.",
        "errors.status.401": "Session expired.",
        "errors.status.403": "Forbidden.",
        "errors.status.500": "Server error.",
        "domain.specificFallback": "Custom fallback message.",
      }
      // i18next behavior: returns the key itself when missing — mimic that
      return table[key] ?? key
    },
  },
}))

// Silence console.error inside tests — friendlyError logs raw errors by design
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("ApiError", () => {
  it("captures status, code, message, issues", () => {
    const err = new ApiError({
      status: 409,
      code: "PHONE_TAKEN",
      message: "dup",
      issues: [{ path: ["phone"], message: "taken" }],
    })
    expect(err.status).toBe(409)
    expect(err.code).toBe("PHONE_TAKEN")
    expect(err.message).toBe("dup")
    expect(err.issues).toHaveLength(1)
    expect(err.name).toBe("ApiError")
    expect(err instanceof Error).toBe(true)
  })

  it("defaults code and issues to null when not provided", () => {
    const err = new ApiError({ status: 500, message: "boom" })
    expect(err.code).toBeNull()
    expect(err.issues).toBeNull()
  })
})

describe("throwIfNotOk", () => {
  // Helper to build a fake Response without spinning up real fetch infrastructure
  const fakeResponse = (status: number, body: unknown, ok = status < 400): Response =>
    ({
      ok,
      status,
      json: () => Promise.resolve(body),
    }) as unknown as Response

  it("does nothing when response is ok", async () => {
    const res = fakeResponse(200, {})
    await expect(throwIfNotOk(res, "fallback")).resolves.toBeUndefined()
  })

  it("throws ApiError with backend code and message", async () => {
    const res = fakeResponse(409, {
      code: "PHONE_TAKEN",
      message: "Phone in use",
    })
    try {
      await throwIfNotOk(res, "fallback")
      expect.fail("should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).code).toBe("PHONE_TAKEN")
      expect((e as ApiError).status).toBe(409)
      expect((e as ApiError).message).toBe("Phone in use")
    }
  })

  it("falls back to the provided message when body is unparseable", async () => {
    const res = {
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("unparseable")),
    } as unknown as Response
    try {
      await throwIfNotOk(res, "domain-fallback")
      expect.fail("should have thrown")
    } catch (e) {
      expect((e as ApiError).message).toBe("domain-fallback")
      expect((e as ApiError).code).toBeNull()
    }
  })

  it("collapses Zod issues into message when no top-level message present", async () => {
    const res = fakeResponse(400, {
      issues: [
        { path: ["phone"], message: "Required" },
        { path: ["email"], message: "Invalid email" },
      ],
    })
    try {
      await throwIfNotOk(res, "fallback")
      expect.fail("should have thrown")
    } catch (e) {
      expect((e as ApiError).message).toContain("phone: Required")
      expect((e as ApiError).message).toContain("email: Invalid email")
    }
  })
})

describe("friendlyError", () => {
  it("maps ApiError code to translated message", () => {
    const err = new ApiError({ status: 409, code: "PHONE_TAKEN", message: "raw" })
    expect(friendlyError(err)).toBe("Phone is taken.")
  })

  it("falls back to status-based message when code is missing", () => {
    const err = new ApiError({ status: 403, message: "raw" })
    expect(friendlyError(err)).toBe("Forbidden.")
  })

  it("falls back to ApiError.message when neither code nor status mapping exists", () => {
    const err = new ApiError({ status: 418, message: "I am a teapot" })
    expect(friendlyError(err)).toBe("I am a teapot")
  })

  it("returns network message for fetch TypeError", () => {
    const err = new TypeError("Failed to fetch")
    expect(friendlyError(err)).toBe("Network failure.")
  })

  it("returns the domain fallback for unknown error shapes", () => {
    expect(friendlyError({ weird: true }, "domain.specificFallback")).toBe(
      "Custom fallback message.",
    )
  })

  it("returns the wildcard for unknowns with no fallback key", () => {
    expect(friendlyError("not even an Error")).toBe("Something went wrong.")
  })

  it("logs the raw error to console for devtools visibility", () => {
    const spy = vi.spyOn(console, "error")
    friendlyError(new Error("debug me"))
    expect(spy).toHaveBeenCalledWith("[friendlyError]", expect.any(Error))
  })
})
