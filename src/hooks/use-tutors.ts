import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { Tutor } from "@/types"

export function useTutors() {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTutors = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/tutors")
      if (!response.ok) throw new Error(`Failed to fetch tutors: ${response.status}`)
      const data = await response.json()
      setTutors(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tutors")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTutors()
  }, [fetchTutors])

  const createTutor = async (body: Record<string, unknown>): Promise<Tutor> => {
    const response = await apiFetch("/tutors", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to create tutor: ${response.status}`)
    }
    return response.json()
  }

  const updateTutor = async (id: number, body: Record<string, unknown>): Promise<Tutor> => {
    const response = await apiFetch(`/tutors/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to update tutor: ${response.status}`)
    }
    return response.json()
  }

  const deleteTutor = async (id: number): Promise<void> => {
    const response = await apiFetch(`/tutors/${id}`, { method: "DELETE" })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to delete tutor: ${response.status}`)
    }
  }

  return { tutors, loading, error, refetch: fetchTutors, createTutor, updateTutor, deleteTutor }
}
