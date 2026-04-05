import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { ScheduleSlot } from "@/types"

export function useSchedule() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/schedule")
      if (!response.ok) throw new Error(`Failed to fetch schedule: ${response.status}`)
      const data = await response.json()
      setSlots(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch schedule")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  const createSlot = async (body: Record<string, unknown>): Promise<ScheduleSlot> => {
    const response = await apiFetch("/schedule", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to create slot: ${response.status}`)
    }
    return response.json()
  }

  const updateSlot = async (id: number, body: Record<string, unknown>): Promise<ScheduleSlot> => {
    const response = await apiFetch(`/schedule/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to update slot: ${response.status}`)
    }
    return response.json()
  }

  const deleteSlot = async (id: number): Promise<void> => {
    const response = await apiFetch(`/schedule/${id}`, { method: "DELETE" })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to delete slot: ${response.status}`)
    }
  }

  return { slots, loading, error, refetch: fetchSlots, createSlot, updateSlot, deleteSlot }
}
