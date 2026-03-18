import { useState, useEffect, useCallback } from "react"
import type { User } from "@/types"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function useUser(id: string | undefined) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    if (!id) {
      setError("No user ID provided")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_BASE_URL}/users/${id}`)
      if (!response.ok) throw new Error(`Failed to fetch user: ${response.status}`)
      const data = await response.json()
      setUser(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch user")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return { user, loading, error, refetch: fetchUser }
}
