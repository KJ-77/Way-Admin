import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { User } from "@/types"

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/users")
      if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`)
      const data = await response.json()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return { users, loading, error, refetch: fetchUsers }
}
