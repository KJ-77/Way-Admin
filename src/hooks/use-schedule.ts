import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { ScheduleSlot, ScheduleWeekResponse, UpsertOverridePayload } from "@/types"

// ── Beirut week-start utility (frontend copy) ──
// Mirrors backend src/lib/time.ts. Kept in lockstep — if you change the rule
// here, change it there. We do it client-side so the navigator can compute
// "prev/next Monday" without round-tripping the server.
const STUDIO_TZ = "Asia/Beirut"
const DAYS_FROM_MONDAY: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
}

export function getBeirutWeekStart(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date)
  const y = parts.find(p => p.type === "year")!.value
  const m = parts.find(p => p.type === "month")!.value
  const d = parts.find(p => p.type === "day")!.value
  const weekday = parts.find(p => p.type === "weekday")!.value
  const local = new Date(`${y}-${m}-${d}T00:00:00Z`)
  local.setUTCDate(local.getUTCDate() - DAYS_FROM_MONDAY[weekday])
  return local.toISOString().slice(0, 10)
}

// Adds `days` (can be negative) to a YYYY-MM-DD string and returns YYYY-MM-DD.
export function addDays(yyyyMmDd: string, days: number): string {
  const d = new Date(`${yyyyMmDd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function useSchedule(initialWeek?: string) {
  const [weekStart, setWeekStart] = useState<string>(initialWeek ?? getBeirutWeekStart())
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = useCallback(async (week: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch(`/schedule?week=${week}`)
      if (!response.ok) throw new Error(`Failed to fetch schedule: ${response.status}`)
      const data: ScheduleWeekResponse = await response.json()
      setSlots(data.slots)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch schedule")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSlots(weekStart)
  }, [fetchSlots, weekStart])

  // Refetch helper for callers — uses the current weekStart implicitly.
  const refetch = useCallback(() => fetchSlots(weekStart), [fetchSlots, weekStart])

  // ── Week navigation ──
  const goToPreviousWeek = useCallback(() => setWeekStart(prev => addDays(prev, -7)), [])
  const goToNextWeek = useCallback(() => setWeekStart(prev => addDays(prev, 7)), [])
  const goToCurrentWeek = useCallback(() => setWeekStart(getBeirutWeekStart()), [])

  // ── Template-level CRUD ──
  const createSlot = async (body: Record<string, unknown>): Promise<ScheduleSlot> => {
    const response = await apiFetch("/schedule", { method: "POST", body: JSON.stringify(body) })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to create slot: ${response.status}`)
    }
    return response.json()
  }

  const updateSlot = async (id: number, body: Record<string, unknown>): Promise<ScheduleSlot> => {
    const response = await apiFetch(`/schedule/${id}`, { method: "PUT", body: JSON.stringify(body) })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to update slot: ${response.status}`)
    }
    return response.json()
  }

  // Soft-delete on the backend; the slot row sticks around for audit.
  const deleteSlot = async (id: number): Promise<void> => {
    const response = await apiFetch(`/schedule/${id}`, { method: "DELETE" })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to delete slot: ${response.status}`)
    }
  }

  // ── Override (per-week exception) mutations ──
  const upsertOverride = async (slotId: number, payload: UpsertOverridePayload): Promise<void> => {
    const response = await apiFetch(`/schedule/${slotId}/override`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to update override: ${response.status}`)
    }
  }

  const clearOverride = async (slotId: number, week: string): Promise<void> => {
    const response = await apiFetch(`/schedule/${slotId}/override?week=${week}`, { method: "DELETE" })
    // 404 = no override existed → treat as success (idempotent clear)
    if (!response.ok && response.status !== 404) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to clear override: ${response.status}`)
    }
  }

  return {
    slots, loading, error,
    weekStart,
    refetch,
    goToPreviousWeek, goToNextWeek, goToCurrentWeek,
    createSlot, updateSlot, deleteSlot,
    upsertOverride, clearOverride,
  }
}
