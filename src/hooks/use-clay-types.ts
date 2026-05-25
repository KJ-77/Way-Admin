import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"

export interface ClayType {
  name: string
  created_at: string
}

export function useClayTypes() {
  const [clayTypes, setClayTypes] = useState<ClayType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClayTypes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/clay-types")
      if (!response.ok) throw new Error(`Failed to fetch clay types: ${response.status}`)
      setClayTypes(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch clay types")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClayTypes()
  }, [fetchClayTypes])

  const createClayType = async (name: string): Promise<ClayType> => {
    const response = await apiFetch("/clay-types", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to create clay type: ${response.status}`)
    }
    return response.json()
  }

  // Rename — the path param is the OLD name, the body carries the new name.
  // Backend re-points items.clay_type rows so historical data stays accurate.
  const renameClayType = async (oldName: string, newName: string): Promise<ClayType> => {
    const response = await apiFetch(`/clay-types/${encodeURIComponent(oldName)}`, {
      method: "PUT",
      body: JSON.stringify({ name: newName }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to rename clay type: ${response.status}`)
    }
    return response.json()
  }

  const deleteClayType = async (name: string): Promise<void> => {
    const response = await apiFetch(`/clay-types/${encodeURIComponent(name)}`, { method: "DELETE" })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.message || `Failed to delete clay type: ${response.status}`)
    }
  }

  return { clayTypes, loading, error, refetch: fetchClayTypes, createClayType, renameClayType, deleteClayType }
}
