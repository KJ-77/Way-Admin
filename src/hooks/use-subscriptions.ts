import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { UserPackage } from "@/types"

// Lightweight hook for a single user's subscriptions (used on user detail page + session create dialog)
export function useUserSubscriptions(userId: string | undefined) {
  const [subscriptions, setSubscriptions] = useState<UserPackage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSubscriptions = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    try {
      setLoading(true)
      const response = await apiFetch(`/user-packages?user_id=${userId}`)
      if (!response.ok) throw new Error("Failed to fetch subscriptions")
      setSubscriptions(await response.json())
    } catch {
      setSubscriptions([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  return { subscriptions, loading, refetch: fetchSubscriptions }
}

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<UserPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/user-packages")
      if (!response.ok) throw new Error(`Failed to fetch subscriptions: ${response.status}`)
      const data = await response.json()
      setSubscriptions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch subscriptions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  const createSubscription = async (body: Record<string, unknown>): Promise<UserPackage> => {
    const response = await apiFetch("/user-packages", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to create subscription: ${response.status}`)
    }
    return response.json()
  }

  const updateSubscription = async (id: number, body: Record<string, unknown>): Promise<UserPackage> => {
    const response = await apiFetch(`/user-packages/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to update subscription: ${response.status}`)
    }
    return response.json()
  }

  const deleteSubscription = async (id: number): Promise<void> => {
    const response = await apiFetch(`/user-packages/${id}`, { method: "DELETE" })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to delete subscription: ${response.status}`)
    }
  }

  return {
    subscriptions,
    loading,
    error,
    refetch: fetchSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
  }
}
