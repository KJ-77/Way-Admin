import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
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
      if (!response.ok) throw new Error(`Failed to fetch packages: ${response.status}`)
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
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to create package: ${response.status}`)
    }
    return response.json()
  }

  const updatePackage = async (id: number, body: Record<string, unknown>): Promise<Package> => {
    const response = await apiFetch(`/packages/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to update package: ${response.status}`)
    }
    return response.json()
  }

  const deletePackage = async (id: number): Promise<void> => {
    const response = await apiFetch(`/packages/${id}`, { method: "DELETE" })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || errorData?.error || `Failed to delete package: ${response.status}`)
    }
  }

  return { packages, loading, error, refetch: fetchPackages, createPackage, updatePackage, deletePackage }
}
