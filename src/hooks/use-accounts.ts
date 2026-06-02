import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { throwIfNotOk } from "@/lib/errors"
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
      await throwIfNotOk(response, "Failed to fetch accounts")
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

  // Returns the account on full success, or throws a DbSyncError on partial success (207).
  // 207 needs special handling BEFORE throwIfNotOk so we can surface the structured payload
  // to the AccountsTable retry UI.
  const createAccount = async (data: { email: string; full_name: string; phone?: string; role: string }) => {
    const response = await apiFetch("/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    })

    if (response.status === 207) {
      const body = await response.json().catch(() => null)
      if (body?.error === "db_sync_failed") {
        const err: DbSyncError = { type: "db_sync_failed", account: body.account }
        throw err
      }
    }

    await throwIfNotOk(response, "Failed to create account")
    return response.json() as Promise<AdminAccount>
  }

  const updateAccount = async (id: string, data: Record<string, unknown>) => {
    const response = await apiFetch(`/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
    await throwIfNotOk(response, "Failed to update account")
    return response.json()
  }

  const deleteAccount = async (id: string) => {
    const response = await apiFetch(`/accounts/${id}`, {
      method: "DELETE",
    })
    await throwIfNotOk(response, "Failed to delete account")
    return response.json()
  }

  // Retry syncing an account to the database (POST /accounts/sync)
  const syncAccountToDb = async (account: DbSyncError["account"]) => {
    const response = await apiFetch("/accounts/sync", {
      method: "POST",
      body: JSON.stringify(account),
    })
    await throwIfNotOk(response, "Failed to sync account")
    return response.json() as Promise<AdminAccount>
  }

  // Admin-initiated password reset — sets a temp password and puts user in FORCE_CHANGE_PASSWORD state
  const resetPassword = async (id: string): Promise<{ tempPassword: string }> => {
    const response = await apiFetch(`/accounts/${id}/reset-password`, {
      method: "POST",
    })
    await throwIfNotOk(response, "Failed to reset password")
    return response.json()
  }

  return { accounts, loading, error, refetch: fetchAccounts, createAccount, updateAccount, deleteAccount, syncAccountToDb, resetPassword }
}
