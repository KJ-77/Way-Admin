import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { throwIfNotOk } from "@/lib/errors"
import type { ClassDetailResponse } from "@/types"

/**
 * Fetches the class-detail payload — slot (with override merged + capacity +
 * attending_count) plus the joined session list for a specific (slotId, date)
 * pair.
 *
 * Backed by GET /schedule/:slotId/sessions?date=YYYY-MM-DD. Re-fires when
 * either input changes, and exposes a `refetch` so callers can refresh after
 * a session mutation without remounting.
 */
export function useClassDetail(slotId: number, classDate: string) {
  const [data, setData] = useState<ClassDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    if (!slotId || !classDate) return
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch(`/schedule/${slotId}/sessions?date=${classDate}`)
      await throwIfNotOk(res, "Failed to load class detail")
      const json: ClassDetailResponse = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load class detail")
    } finally {
      setLoading(false)
    }
  }, [slotId, classDate])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  return { data, loading, error, refetch: fetchDetail }
}
