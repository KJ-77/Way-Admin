import i18n from "@/i18n"

// Shape the backend sends on any non-2xx response (see Way-Backend/src/lib/response.ts).
// `code` is the stable machine-readable key the frontend translates against.
interface ApiErrorBody {
  code?: string
  error?: string
  message?: string
  issues?: Array<{ path: (string | number)[]; message: string }>
}

// Typed error thrown by hooks via `throwIfNotOk`. Carries the parsed backend body
// so toast/alert call sites can map by `code` instead of relying on raw `message`.
export class ApiError extends Error {
  public readonly status: number
  public readonly code: string | null
  public readonly issues: ApiErrorBody["issues"] | null
  public readonly raw: unknown

  constructor(opts: { status: number; code?: string; message: string; issues?: ApiErrorBody["issues"]; raw?: unknown }) {
    super(opts.message)
    this.name = "ApiError"
    this.status = opts.status
    this.code = opts.code ?? null
    this.issues = opts.issues ?? null
    this.raw = opts.raw
  }
}

// Hook-side helper. Parses the backend error body and throws a typed ApiError.
// Use in place of the old `if (!response.ok) throw new Error(...)` pattern.
// `fallbackMessage` is what we throw when the body is unparseable.
export async function throwIfNotOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) return

  const body = await response.json().catch(() => null) as ApiErrorBody | null

  // Build a human-ish message for the Error.message (used as a last-resort display string).
  // Translation happens later in friendlyError() via the `code` field.
  const message = body?.message
    || body?.issues?.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
    || body?.error
    || fallbackMessage

  throw new ApiError({
    status: response.status,
    code: body?.code,
    message,
    issues: body?.issues ?? undefined,
    raw: body,
  })
}

// Translates any error into a user-facing string. Always logs raw to console first
// so devtools still sees the unmodified error (per Khalil's spec).
//
// Resolution order:
//   1. `errors.codes.<CODE>` — stable backend code (preferred)
//   2. `errors.status.<HTTP_STATUS>` — generic per-status fallback
//   3. The error's own message (better than nothing)
//   4. `fallbackKey` — i18n key the call site provides as a domain-specific default
//   5. `errors.unknown` — final wildcard
export function friendlyError(err: unknown, fallbackKey: string = "errors.unknown"): string {
  console.error("[friendlyError]", err)

  // Network-level failures (fetch throws TypeError when the request can't even leave the browser).
  if (err instanceof TypeError && /fetch|network|failed to fetch/i.test(err.message)) {
    return i18n.t("errors.network")
  }

  if (err instanceof ApiError) {
    if (err.code) {
      const key = `errors.codes.${err.code}`
      const translated = i18n.t(key)
      // i18next returns the key itself when no translation exists — treat that as "no mapping"
      if (translated !== key) return translated
    }

    const statusKey = `errors.status.${err.status}`
    const statusTranslated = i18n.t(statusKey)
    if (statusTranslated !== statusKey) return statusTranslated

    if (err.message) return err.message
  }

  // Generic Error (e.g. thrown by `throw new Error(...)` inside a hook)
  if (err instanceof Error && err.message) {
    const fallback = i18n.t(fallbackKey)
    return fallback !== fallbackKey ? fallback : err.message
  }

  // Unknown shape — use the domain fallback, or the wildcard if the key doesn't exist
  const fallback = i18n.t(fallbackKey)
  return fallback !== fallbackKey ? fallback : i18n.t("errors.unknown")
}
