import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { AdminAccount } from "@/types"

// Returned when Cognito succeeds but DB insert fails (HTTP 207)
export interface DbSyncError {
  type: "db_sync_failed"
  account: {
    id: string
    email: string
    full_name: string
    phone: string | null
    role: string
  }
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/accounts")
      if (!response.ok) throw new Error(`Failed to fetch accounts: ${response.status}`)
      const data = await response.json()
      setAccounts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch accounts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Returns the account on full success, or throws a DbSyncError on partial success (207)
  const createAccount = async (data: { email: string; full_name: string; phone?: string; role: string }) => {
    const response = await apiFetch("/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    })

    const body = await response.json().catch(() => null)

    // 207 = Cognito succeeded but DB sync failed
    if (response.status === 207 && body?.error === "db_sync_failed") {
      const err: DbSyncError = { type: "db_sync_failed", account: body.account }
      throw err
    }

    if (!response.ok) {
      throw new Error(body?.message || body?.error || `Failed: ${response.status}`)
    }

    return body as AdminAccount
  }

  const updateAccount = async (id: string, data: Record<string, unknown>) => {
    const response = await apiFetch(`/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const errData = await response.json().catch(() => null)
      throw new Error(errData?.message || errData?.error || `Failed: ${response.status}`)
    }
    return response.json()
  }

  const deleteAccount = async (id: string) => {
    const response = await apiFetch(`/accounts/${id}`, {
      method: "DELETE",
    })
    if (!response.ok) {
      const errData = await response.json().catch(() => null)
      throw new Error(errData?.message || errData?.error || `Failed: ${response.status}`)
    }
    return response.json()
  }

  // Retry syncing an account to the database (POST /accounts/sync)
  const syncAccountToDb = async (account: DbSyncError["account"]) => {
    const response = await apiFetch("/accounts/sync", {
      method: "POST",
      body: JSON.stringify(account),
    })
    if (!response.ok) {
      const errData = await response.json().catch(() => null)
      throw new Error(errData?.message || errData?.error || `Sync failed: ${response.status}`)
    }
    return response.json() as Promise<AdminAccount>
  }

  // Admin-initiated password reset — triggers Cognito to email a verification code
  const resetPassword = async (id: string) => {
    const response = await apiFetch(`/accounts/${id}/reset-password`, {
      method: "POST",
    })
    if (!response.ok) {
      const errData = await response.json().catch(() => null)
      throw new Error(errData?.message || errData?.error || `Failed: ${response.status}`)
    }
    return response.json()
  }

  return { accounts, loading, error, refetch: fetchAccounts, createAccount, updateAccount, deleteAccount, syncAccountToDb, resetPassword }
}
