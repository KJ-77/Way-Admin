import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { Item } from "@/types"

export function useItems() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/items")
      if (!response.ok) throw new Error(`Failed to fetch items: ${response.status}`)
      const data = await response.json()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch items")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const createItem = async (body: Record<string, unknown>): Promise<Item> => {
    const response = await apiFetch("/items", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to create item: ${response.status}`)
    }
    return response.json()
  }

  const updateItem = async (id: number, body: Record<string, unknown>): Promise<Item> => {
    const response = await apiFetch(`/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to update item: ${response.status}`)
    }
    return response.json()
  }

  const deleteItem = async (id: number): Promise<void> => {
    const response = await apiFetch(`/items/${id}`, { method: "DELETE" })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to delete item: ${response.status}`)
    }
  }

  return { items, loading, error, refetch: fetchItems, createItem, updateItem, deleteItem }
}

// Lightweight hook for a single user's items (used on user detail page)
export function useUserItems(userId: string | undefined) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    try {
      setLoading(true)
      const response = await apiFetch(`/items?user_id=${userId}`)
      if (!response.ok) throw new Error("Failed to fetch items")
      setItems(await response.json())
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return { items, loading, refetch: fetchItems }
}
