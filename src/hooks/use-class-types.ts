import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { throwIfNotOk } from "@/lib/errors"

// Server row shape for /class-types responses. Fields match the backend
// class_types table (see Way-Backend migrations/003-class-types.sql).
export interface ClassType {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateClassTypeInput {
  name: string
  description?: string | null
  is_active?: boolean
}

export type UpdateClassTypeInput = Partial<CreateClassTypeInput>

// Full CRUD for class types. Mirrors the shape of useClayTypes so the pattern
// is instantly recognizable — plus richer update surface (description +
// is_active) since class_types carries more than just a name.
export function useClassTypes() {
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClassTypes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/class-types")
      await throwIfNotOk(response, "Failed to fetch class types")
      setClassTypes(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch class types")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClassTypes()
  }, [fetchClassTypes])

  const createClassType = async (input: CreateClassTypeInput): Promise<ClassType> => {
    const response = await apiFetch("/class-types", {
      method: "POST",
      body: JSON.stringify(input),
    })
    await throwIfNotOk(response, "Failed to create class type")
    return response.json()
  }

  const updateClassType = async (
    id: number,
    input: UpdateClassTypeInput
  ): Promise<ClassType> => {
    const response = await apiFetch(`/class-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    })
    await throwIfNotOk(response, "Failed to update class type")
    return response.json()
  }

  const deleteClassType = async (id: number): Promise<void> => {
    const response = await apiFetch(`/class-types/${id}`, { method: "DELETE" })
    await throwIfNotOk(response, "Failed to delete class type")
  }

  return {
    classTypes,
    loading,
    error,
    refetch: fetchClassTypes,
    createClassType,
    updateClassType,
    deleteClassType,
  }
}
