import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { throwIfNotOk } from "@/lib/errors"
import type {
  Message,
  MessageTemplate,
  Conversation,
  Broadcast,
  BroadcastCreated,
  DrainResult,
} from "@/types"

/**
 * The approval queue — messages drafted and waiting for a human.
 *
 * `unconfirmed` is a separate, deliberately small list: sends we handed to the
 * provider but never got a confirmed result for. Those are NEVER auto-retried
 * (retrying a send that may already have gone out is how a client receives the same
 * message twice), so a person has to say what actually happened.
 */
export function useMessageQueue() {
  const [queue, setQueue] = useState<Message[]>([])
  const [unconfirmed, setUnconfirmed] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // Both lists feed the same screen, so fetch them together — a staggered
      // refresh makes the counts disagree for a beat and looks like a bug.
      const [queueRes, unconfirmedRes] = await Promise.all([
        apiFetch("/messages/queue"),
        apiFetch("/messages/unconfirmed"),
      ])
      await throwIfNotOk(queueRes, "Failed to fetch the message queue")
      await throwIfNotOk(unconfirmedRes, "Failed to fetch unconfirmed messages")
      setQueue(await queueRes.json())
      setUnconfirmed(await unconfirmedRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch the message queue")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  /**
   * Approves and sends. This is SYNCHRONOUS on the backend — the request doesn't
   * return until the provider has answered — so call sites must show a pending
   * state and disable the button. It can legitimately take a few seconds.
   */
  const approve = async (id: number): Promise<Message> => {
    const response = await apiFetch(`/messages/${id}/approve`, { method: "POST" })
    await throwIfNotOk(response, "Failed to send the message")
    return response.json()
  }

  const cancel = async (id: number): Promise<Message> => {
    const response = await apiFetch(`/messages/${id}/cancel`, { method: "POST" })
    await throwIfNotOk(response, "Failed to discard the message")
    return response.json()
  }

  const requeue = async (id: number): Promise<Message> => {
    const response = await apiFetch(`/messages/${id}/requeue`, { method: "POST" })
    await throwIfNotOk(response, "Failed to re-queue the message")
    return response.json()
  }

  /**
   * Claims a hand-sent WhatsApp message the moment staff open WhatsApp for it.
   *
   * Sends nothing. It stops a second staff member sending the same message (the
   * loser gets a 409) and moves it into the "handed off, unconfirmed" list, where
   * the person confirms whether they actually pressed send.
   */
  const handoff = async (id: number): Promise<Message> => {
    const response = await apiFetch(`/messages/${id}/handoff`, { method: "POST" })
    await throwIfNotOk(response, "Failed to open the message")
    return response.json()
  }

  /**
   * Records what really happened to an unconfirmed send. We never guess.
   *
   * `not_sent` is for hand-sent messages only: WhatsApp was opened but nothing was
   * sent, so the message goes straight back into the approval queue.
   */
  const resolve = async (
    id: number,
    resolution: "sent" | "failed" | "not_sent",
  ): Promise<Message> => {
    const response = await apiFetch(`/messages/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution }),
    })
    await throwIfNotOk(response, "Failed to resolve the message")
    return response.json()
  }

  const createMessage = async (body: Record<string, unknown>): Promise<Message> => {
    const response = await apiFetch("/messages", {
      method: "POST",
      body: JSON.stringify(body),
    })
    await throwIfNotOk(response, "Failed to draft the message")
    return response.json()
  }

  return {
    queue,
    unconfirmed,
    loading,
    error,
    refetch: fetchAll,
    approve,
    handoff,
    cancel,
    requeue,
    resolve,
    createMessage,
  }
}

/**
 * Message templates.
 *
 * Editable in place because the studio is on SMS — there's no provider review step,
 * so a reworded template is live immediately. Under WhatsApp this would have needed
 * resubmission to Meta.
 */
export function useMessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/message-templates")
      await throwIfNotOk(response, "Failed to fetch templates")
      setTemplates(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch templates")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const updateTemplate = async (
    id: number,
    body: Record<string, unknown>,
  ): Promise<MessageTemplate> => {
    const response = await apiFetch(`/message-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    await throwIfNotOk(response, "Failed to update the template")
    return response.json()
  }

  return { templates, loading, error, refetch: fetchTemplates, updateTemplate }
}

/** Per-client message history. A one-way send log on SMS; a real inbox on WhatsApp. */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/conversations")
      await throwIfNotOk(response, "Failed to fetch conversations")
      setConversations(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch conversations")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const getMessages = async (conversationId: number): Promise<Message[]> => {
    const response = await apiFetch(`/conversations/${conversationId}/messages`)
    await throwIfNotOk(response, "Failed to fetch the conversation")
    return response.json()
  }

  return { conversations, loading, error, refetch: fetchConversations, getMessages }
}

export function useBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBroadcasts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/broadcasts")
      await throwIfNotOk(response, "Failed to fetch broadcasts")
      setBroadcasts(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch broadcasts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBroadcasts()
  }, [fetchBroadcasts])

  const createBroadcast = async (body: Record<string, unknown>): Promise<BroadcastCreated> => {
    const response = await apiFetch("/broadcasts", {
      method: "POST",
      body: JSON.stringify(body),
    })
    await throwIfNotOk(response, "Failed to create the broadcast")
    return response.json()
  }

  /** Sends ONE chunk (25 recipients). Callers loop — see `drainAll` below. */
  const drainOnce = async (id: number): Promise<DrainResult> => {
    const response = await apiFetch(`/broadcasts/${id}/drain`, { method: "POST" })
    await throwIfNotOk(response, "Failed to send the broadcast")
    return response.json()
  }

  /**
   * Drains a whole campaign, chunk by chunk, reporting progress as it goes.
   *
   * Chunking exists because 130 synchronous sends can't fit inside API Gateway's
   * 29-second response limit. Each call claims its own rows (FOR UPDATE SKIP
   * LOCKED), so closing the browser mid-drain loses nothing and duplicates nothing —
   * the next call simply resumes where this one stopped.
   *
   * `shouldContinue` lets the UI stop the loop when the component unmounts, so a
   * closed dialog doesn't keep firing requests in the background.
   */
  const drainAll = async (
    id: number,
    onProgress: (result: DrainResult) => void,
    shouldContinue: () => boolean = () => true,
  ): Promise<DrainResult> => {
    let totals: DrainResult = { sent: 0, failed: 0, remaining: 0 }

    // Bounded rather than `while (true)`: a bug that stopped `remaining` from
    // decreasing would otherwise hammer the API forever. 200 chunks × 25 = 5000
    // recipients, far above any realistic studio campaign.
    for (let chunk = 0; chunk < 200; chunk++) {
      if (!shouldContinue()) break

      const result = await drainOnce(id)
      totals = {
        sent: totals.sent + result.sent,
        failed: totals.failed + result.failed,
        remaining: result.remaining,
      }
      onProgress(totals)

      if (result.remaining === 0) break
      // Nothing was claimed and nothing is left to claim — another admin is
      // draining the same campaign concurrently. Stop rather than spin.
      if (result.sent === 0 && result.failed === 0) break
    }

    return totals
  }

  return {
    broadcasts,
    loading,
    error,
    refetch: fetchBroadcasts,
    createBroadcast,
    drainOnce,
    drainAll,
  }
}

/**
 * Marketing opt-out.
 *
 * The ONLY opt-out path on SMS: Lebanon has no inbound, so a client can't text
 * "STOP". Staff record it here when someone asks by phone or in person. Utility
 * messages ("your piece is ready") still send — someone who doesn't want promos
 * still wants their pottery.
 */
export function useMarketingOptOut() {
  const setOptOut = async (userId: string, optOut: boolean): Promise<void> => {
    const response = await apiFetch(`/users/${userId}/marketing-opt-out`, {
      method: "PUT",
      body: JSON.stringify({ opt_out: optOut }),
    })
    await throwIfNotOk(response, "Failed to update the opt-out setting")
  }

  return { setOptOut }
}
