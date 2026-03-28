import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { User } from "@/types"

// Response shape from POST /users — includes temp password for no-email clients
export interface CreateUserResponse {
  user: User
  tempPassword: string | null
}

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

  const createUser = async (body: Record<string, unknown>): Promise<CreateUserResponse> => {
    const response = await apiFetch("/users", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      const errorMsg = errorData?.message
        || errorData?.issues?.map((i: { path: string[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join(", ")
        || errorData?.error
        || `Failed to create client: ${response.status}`
      throw new Error(errorMsg)
    }
    return response.json()
  }

  const updateUser = async (id: string, body: Record<string, unknown>): Promise<User> => {
    const response = await apiFetch(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      const errorMsg = errorData?.message
        || errorData?.issues?.map((i: { path: string[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join(", ")
        || errorData?.error
        || `Failed to update client: ${response.status}`
      throw new Error(errorMsg)
    }
    return response.json()
  }

  const deleteUser = async (id: string): Promise<void> => {
    const response = await apiFetch(`/users/${id}`, { method: "DELETE" })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to delete client: ${response.status}`)
    }
  }

  return { users, loading, error, refetch: fetchUsers, createUser, updateUser, deleteUser }
}
