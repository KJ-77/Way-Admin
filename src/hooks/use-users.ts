import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { throwIfNotOk } from "@/lib/errors"
import type { User } from "@/types"

// Response shape from POST /users — includes temp password for no-email clients
export interface CreateUserResponse {
  user: User
  tempPassword: string | null
}

export function useUsers(opts: { includeDeleted?: boolean } = {}) {
  const { includeDeleted = false } = opts
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const path = includeDeleted ? "/users?include_deleted=true" : "/users"
      const response = await apiFetch(path)
      await throwIfNotOk(response, "Failed to fetch clients")
      const data = await response.json()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch clients")
    } finally {
      setLoading(false)
    }
  }, [includeDeleted])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const createUser = async (body: Record<string, unknown>): Promise<CreateUserResponse> => {
    const response = await apiFetch("/users", {
      method: "POST",
      body: JSON.stringify(body),
    })
    await throwIfNotOk(response, "Failed to create client")
    return response.json()
  }

  const updateUser = async (id: string, body: Record<string, unknown>): Promise<User> => {
    const response = await apiFetch(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    await throwIfNotOk(response, "Failed to update client")
    return response.json()
  }

  // Soft-delete — backend flips is_active=false and disables the Cognito user.
  const deleteUser = async (id: string): Promise<void> => {
    const response = await apiFetch(`/users/${id}`, { method: "DELETE" })
    await throwIfNotOk(response, "Failed to delete client")
  }

  // Reverses a soft-delete — flips is_active=true and re-enables the Cognito login.
  const restoreUser = async (id: string): Promise<User> => {
    const response = await apiFetch(`/users/${id}/restore`, { method: "POST" })
    await throwIfNotOk(response, "Failed to restore client")
    return response.json()
  }

  // Admin/studio-manager initiated password reset — backend generates a temp password,
  // puts the Cognito user in FORCE_CHANGE_PASSWORD state, and returns the temp password
  // so the admin can read it out / copy it to share with the client.
  const resetPassword = async (id: string): Promise<{ tempPassword: string }> => {
    const response = await apiFetch(`/users/${id}/reset-password`, { method: "POST" })
    await throwIfNotOk(response, "Failed to reset client password")
    return response.json()
  }

  return { users, loading, error, refetch: fetchUsers, createUser, updateUser, deleteUser, restoreUser, resetPassword }
}
