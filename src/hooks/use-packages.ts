import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { throwIfNotOk } from "@/lib/errors"
import type { Package } from "@/types"

export function usePackages() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/packages")
      await throwIfNotOk(response, "Failed to fetch packages")
      const data = await response.json()
      setPackages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch packages")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  const createPackage = async (body: Record<string, unknown>): Promise<Package> => {
    const response = await apiFetch("/packages", {
      method: "POST",
      body: JSON.stringify(body),
    })
    await throwIfNotOk(response, "Failed to create package")
    return response.json()
  }

  const updatePackage = async (id: number, body: Record<string, unknown>): Promise<Package> => {
    const response = await apiFetch(`/packages/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    await throwIfNotOk(response, "Failed to update package")
    return response.json()
  }

  const deletePackage = async (id: number): Promise<void> => {
    const response = await apiFetch(`/packages/${id}`, { method: "DELETE" })
    await throwIfNotOk(response, "Failed to delete package")
  }

  return { packages, loading, error, refetch: fetchPackages, createPackage, updatePackage, deletePackage }
}
