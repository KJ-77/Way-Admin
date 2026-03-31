import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { Session } from "@/types"

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/sessions")
      if (!response.ok) throw new Error(`Failed to fetch sessions: ${response.status}`)
      const data = await response.json()
      setSessions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sessions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const createSession = async (body: Record<string, unknown>): Promise<Session> => {
    const response = await apiFetch("/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to create session: ${response.status}`)
    }
    return response.json()
  }

  const updateSession = async (id: number, body: Record<string, unknown>): Promise<Session> => {
    const response = await apiFetch(`/sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to update session: ${response.status}`)
    }
    return response.json()
  }

  const deleteSession = async (id: number): Promise<void> => {
    const response = await apiFetch(`/sessions/${id}`, { method: "DELETE" })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to delete session: ${response.status}`)
    }
  }

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
    createSession,
    updateSession,
    deleteSession,
  }
}

// Lightweight hook for a single user's sessions (used on user detail page)
export function useUserSessions(userId: string | undefined) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    try {
      setLoading(true)
      const response = await apiFetch(`/sessions?user_id=${userId}`)
      if (!response.ok) throw new Error("Failed to fetch sessions")
      setSessions(await response.json())
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return { sessions, loading, refetch: fetchSessions }
}
