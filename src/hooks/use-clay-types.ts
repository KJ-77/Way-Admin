import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { throwIfNotOk } from "@/lib/errors"

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
      await throwIfNotOk(response, "Failed to fetch clay types")
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
    await throwIfNotOk(response, "Failed to create clay type")
    return response.json()
  }

  // Rename — the path param is the OLD name, the body carries the new name.
  // Backend re-points items.clay_type rows so historical data stays accurate.
  const renameClayType = async (oldName: string, newName: string): Promise<ClayType> => {
    const response = await apiFetch(`/clay-types/${encodeURIComponent(oldName)}`, {
      method: "PUT",
      body: JSON.stringify({ name: newName }),
    })
    await throwIfNotOk(response, "Failed to rename clay type")
    return response.json()
  }

  const deleteClayType = async (name: string): Promise<void> => {
    const response = await apiFetch(`/clay-types/${encodeURIComponent(name)}`, { method: "DELETE" })
    await throwIfNotOk(response, "Failed to delete clay type")
  }

  return { clayTypes, loading, error, refetch: fetchClayTypes, createClayType, renameClayType, deleteClayType }
}
