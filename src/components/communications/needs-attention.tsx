import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  AlertTriangle, Check, X, Loader2, RotateCcw, ExternalLink, Copy, MessageCircle, Trash2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { friendlyError } from "@/lib/errors"
import { buildWhatsAppLink, copyText, isManualChannel } from "@/lib/channel"
import type { Message } from "@/types"

type Resolution = "sent" | "failed" | "not_sent"

interface Props {
  unconfirmed: Message[]
  failed: Message[]
  onResolve: (id: number, resolution: Resolution) => Promise<Message>
  onRequeue: (id: number) => Promise<Message>
  // Lets a failure that shouldn't be resent leave the pile. Without it, re-queuing
  // was the only way out.
  onDiscard: (id: number) => Promise<Message>
  onRefetch: () => void
}

/**
 * The piles that need a human decision.
 *
 * HAND-SENT ("Did these go out?") is the everyday one. A staff member opened
 * WhatsApp for these, and we can't see whether they pressed send — so they tell us.
 * It's a normal step, not a problem, so it's styled in WhatsApp green rather than as
 * a warning. Two escape hatches sit beside each: Reopen (if the tab was closed or
 * blocked) and Copy (if the message was too long to prefill).
 *
 * UNCONFIRMED is the subtle one for automatic channels. When an API send times out
 * we genuinely don't know whether it arrived. The system deliberately does NOT retry
 * — retrying something that may already have been delivered is exactly how a client
 * receives the same message twice — so it parks here for a person to check.
 *
 * In both cases we never guess. Guessing "sent" silently drops a message that never
 * arrived; guessing "failed" leads staff to resend one the client already has.
 *
 * FAILED is the easy pile: the provider rejected it outright, nothing was delivered,
 * and it can safely go back in the queue once the underlying problem is fixed.
 */
const NeedsAttention = ({
  unconfirmed, failed, onResolve, onRequeue, onDiscard, onRefetch,
}: Props) => {
  const { t } = useTranslation()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Split by channel: a hand-sent message and a timed-out API send ask different
  // questions and offer different answers.
  const handedOff = unconfirmed.filter(m => isManualChannel(m.channel))
  const providerUnconfirmed = unconfirmed.filter(m => !isManualChannel(m.channel))

  // Nothing to do — render nothing at all rather than an empty card. This panel
  // should be invisible in normal operation; a permanent empty box trains staff to
  // stop looking at it.
  if (unconfirmed.length === 0 && failed.length === 0) return null

  const handleResolve = async (message: Message, resolution: Resolution) => {
    setPendingId(message.id)
    try {
      await onResolve(message.id, resolution)
      toast.success(
        resolution === "not_sent"
          ? t("communications.notSentSuccess")
          : t("communications.resolveSuccess"),
      )
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "communications.operationFailed"))
    } finally {
      setPendingId(null)
    }
  }

  const handleRequeue = async (message: Message) => {
    setPendingId(message.id)
    try {
      await onRequeue(message.id)
      toast.success(t("communications.requeueSuccess"))
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "communications.operationFailed"))
    } finally {
      setPendingId(null)
    }
  }

  const handleDiscard = async (message: Message) => {
    setPendingId(message.id)
    try {
      await onDiscard(message.id)
      toast.success(t("communications.discardSuccess"))
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "communications.operationFailed"))
    } finally {
      setPendingId(null)
    }
  }

  const handleCopy = async (message: Message) => {
    if (await copyText(message.body)) {
      setCopiedId(message.id)
      setTimeout(() => setCopiedId(current => (current === message.id ? null : current)), 2000)
    } else {
      toast.error(t("communications.copyFailed"))
    }
  }

  // Only escalate the card to warning styling when something is actually wrong.
  // A panel holding nothing but routine hand-sent confirmations stays calm.
  const hasProblems = providerUnconfirmed.length > 0 || failed.length > 0

  return (
    <Card className={hasProblems ? "border-amber-500/40" : "border-emerald-500/40"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasProblems ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : (
            <MessageCircle className="h-4 w-4 text-emerald-500" />
          )}
          {hasProblems ? t("communications.attentionTitle") : t("communications.confirmHeading")}
          <Badge variant="secondary">{unconfirmed.length + failed.length}</Badge>
        </CardTitle>
        <CardDescription>
          {hasProblems ? t("communications.attentionDesc") : t("communications.confirmHelp")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {handedOff.length > 0 && (
          <div className="space-y-2">
            {/* Only needs its own heading when it shares the card with problems. */}
            {hasProblems && (
              <>
                <p className="text-sm font-medium">{t("communications.confirmHeading")}</p>
                <p className="text-xs text-muted-foreground">{t("communications.confirmHelp")}</p>
              </>
            )}

            {handedOff.map(message => {
              const isPending = pendingId === message.id
              // Prefill-free link: the message may have been too long to prefill,
              // and reopening an empty chat plus Copy covers both cases.
              const reopenUrl = buildWhatsAppLink(message.phone)

              return (
                <div key={message.id} className="rounded-lg border bg-emerald-500/5 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{message.user_name}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">{message.phone}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {message.body}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleResolve(message, "sent")}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {isPending
                        ? <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        : <Check className="me-2 h-4 w-4" />}
                      {t("communications.didSend")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleResolve(message, "not_sent")}
                    >
                      <X className="me-2 h-4 w-4" />
                      {t("communications.didNotSend")}
                    </Button>

                    {/* A real link rather than window.open(): clicking it is a fresh
                        user gesture, so it's never popup-blocked. Also the recovery
                        path when the original tab was blocked or closed. */}
                    {reopenUrl && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={reopenUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="me-2 h-4 w-4" />
                          {t("communications.reopenWhatsApp")}
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleCopy(message)}>
                      {copiedId === message.id
                        ? <Check className="me-2 h-4 w-4 text-emerald-500" />
                        : <Copy className="me-2 h-4 w-4" />}
                      {copiedId === message.id
                        ? t("communications.copied")
                        : t("communications.copyMessage")}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {providerUnconfirmed.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("communications.unconfirmedHeading")}</p>
            <p className="text-xs text-muted-foreground">
              {t("communications.unconfirmedHelp")}
            </p>

            {providerUnconfirmed.map(message => {
              const isPending = pendingId === message.id
              return (
                <div key={message.id} className="rounded-lg border bg-amber-500/5 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{message.user_name}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">{message.phone}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {message.body}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleResolve(message, "sent")}
                    >
                      {isPending
                        ? <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        : <Check className="me-2 h-4 w-4 text-emerald-500" />}
                      {t("communications.itArrived")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleResolve(message, "failed")}
                    >
                      <X className="me-2 h-4 w-4 text-red-500" />
                      {t("communications.itDidNotArrive")}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {failed.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("communications.failedHeading")}</p>
            {failed.map(message => {
              const isPending = pendingId === message.id
              return (
                <div key={message.id} className="rounded-lg border bg-red-500/5 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{message.user_name}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">{message.phone}</span>
                  </div>
                  {/* The provider's own reason. Usually actionable — a bad number,
                      an opted-out recipient, a spend cap. */}
                  {message.error_message && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {message.error_message}
                    </p>
                  )}
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {message.body}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleRequeue(message)}
                    >
                      {isPending
                        ? <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        : <RotateCcw className="me-2 h-4 w-4" />}
                      {t("communications.requeue")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleDiscard(message)}
                      className="text-muted-foreground"
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      {t("communications.discard")}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default NeedsAttention
