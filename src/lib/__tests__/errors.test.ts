import { describe, it, expect, vi, beforeEach } from "vitest"
import { ApiError, throwIfNotOk, friendlyError } from "../errors"

// i18n is initialized at app boot. For tests we mock it so we can assert behavior
// without spinning up a real i18n instance per test.
vi.mock("@/i18n", () => ({
  default: {
    t: (key: string, vars?: Record<string, unknown>) => {
      const table: Record<string, string> = {
        "errors.unknown": "Something went wrong.",
        "errors.network": "Network failure.",
        "errors.codes.PHONE_TAKEN": "Phone is taken.",
        "errors.codes.EMAIL_TAKEN": "Email is taken.",
        "errors.codes.FK_VIOLATION": "Can't delete while “{{blocker}}” are linked.",
        "errors.fk.generic": "other records",
        "errors.fk.tables.sessions": "booked sessions",
        "errors.fk.tables.user_packages": "subscriptions",
        "errors.status.401": "Session expired.",
        "errors.status.403": "Forbidden.",
        "errors.status.500": "Server error.",
        "domain.specificFallback": "Custom fallback message.",
      }
      // i18next behavior: returns the key itself when missing — mimic that
      const found = table[key]
      if (found === undefined) return key
      // Minimal {{var}} interpolation so we can assert the FK message
      return found.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars?.[name] ?? `{{${name}}}`))
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

  // ── FK violations ─────────────────────────────────────────────────────────
  // Staff were reading "another record depends on this data" as a bug report.
  // The message now names the blocking table, parsed out of the Postgres error
  // detail the backend forwards — no extra API call, and no per-FK copy to write.

  it("names the blocking records using the labelled table", () => {
    const err = new ApiError({
      status: 400,
      code: "FK_VIOLATION",
      message: 'update or delete on table "user_packages" violates foreign key constraint',
      constraint: "sessions_user_package_id_fkey",
      detail: 'Key (id)=(42) is still referenced from table "sessions".',
    })
    expect(friendlyError(err)).toBe("Can't delete while “booked sessions” are linked.")
  })

  it("derives the table for relationships with no hand-written label", () => {
    // The maintenance-free path: any FK in the schema, including ones added
    // later, names its own blocking table without new copy being written.
    const err = new ApiError({
      status: 400,
      code: "FK_VIOLATION",
      message: "fk",
      constraint: "items_clay_type_id_fkey",
      detail: 'Key (id)=(7) is still referenced from table "items".',
    })
    expect(friendlyError(err)).toBe("Can't delete while “items” are linked.")
  })

  it("does NOT reuse another relationship's label — a different FK names its own table", () => {
    // The specific regression this guards: a clay-type delete must never tell
    // staff the problem is booked sessions.
    const err = new ApiError({
      status: 400,
      code: "FK_VIOLATION",
      message: "fk",
      constraint: "items_clay_type_id_fkey",
      detail: 'Key (id)=(7) is still referenced from table "items".',
    })
    const msg = friendlyError(err)
    expect(msg).toContain("items")
    expect(msg).not.toContain("booked sessions")
  })

  it("humanises underscored table names that have no label", () => {
    const err = new ApiError({
      status: 400,
      code: "FK_VIOLATION",
      message: "fk",
      constraint: "packages_class_type_id_fkey",
      detail: 'Key (id)=(3) is still referenced from table "class_types".',
    })
    expect(friendlyError(err)).toBe("Can't delete while “class types” are linked.")
  })

  it("prefers the table label over the raw table name", () => {
    // Staff call user_packages "subscriptions" — the label wins over "user packages"
    const err = new ApiError({
      status: 400,
      code: "FK_VIOLATION",
      message: "fk",
      constraint: "user_packages_package_id_fkey",
      detail: 'Key (id)=(3) is still referenced from table "user_packages".',
    })
    expect(friendlyError(err)).toBe("Can't delete while “subscriptions” are linked.")
  })

  it("resolves the label from the table, so any FK into that table gets it", () => {
    // Two different constraints, same blocking table → same label, no new entry
    const viaOneFk = new ApiError({
      status: 400, code: "FK_VIOLATION", message: "fk",
      constraint: "sessions_user_package_id_fkey",
      detail: 'Key (id)=(42) is still referenced from table "sessions".',
    })
    const viaAnotherFk = new ApiError({
      status: 400, code: "FK_VIOLATION", message: "fk",
      constraint: "sessions_slot_id_fkey",
      detail: 'Key (id)=(9) is still referenced from table "sessions".',
    })
    expect(friendlyError(viaOneFk)).toBe(friendlyError(viaAnotherFk))
  })

  it("falls back to generic wording when detail is unparseable", () => {
    // e.g. a non-English server locale — must degrade, never leak an identifier
    const err = new ApiError({
      status: 400,
      code: "FK_VIOLATION",
      message: "fk",
      constraint: "some_table_we_have_not_labelled_fkey",
      detail: "Schlüssel (id)=(7) wird noch von Tabelle referenziert.",
    })
    const msg = friendlyError(err)
    expect(msg).toBe("Can't delete while “other records” are linked.")
    expect(msg).not.toContain("_fkey")
  })

  it("falls back to generic wording when no constraint or detail is sent", () => {
    const err = new ApiError({ status: 400, code: "FK_VIOLATION", message: "fk" })
    expect(friendlyError(err)).toBe("Can't delete while “other records” are linked.")
  })

  it("captures the constraint off the response body", async () => {
    const res = {
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({ code: "FK_VIOLATION", message: "fk", constraint: "sessions_user_package_id_fkey" }),
    } as unknown as Response
    await expect(throwIfNotOk(res, "fallback")).rejects.toMatchObject({
      constraint: "sessions_user_package_id_fkey",
    })
  })

  it("logs the raw error to console for devtools visibility", () => {
    const spy = vi.spyOn(console, "error")
    friendlyError(new Error("debug me"))
    expect(spy).toHaveBeenCalledWith("[friendlyError]", expect.any(Error))
  })
})
