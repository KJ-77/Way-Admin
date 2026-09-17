import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Send, Trash2, Loader2, AlertCircle, Inbox, UserPlus,
  PackageCheck, Megaphone, PenLine, RefreshCw, MessageCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import ConfirmDialog from "@/components/ui/confirm-dialog"
import { friendlyError } from "@/lib/errors"
import { estimateSegments } from "@/lib/sms"
import { copyText, isManualChannel, isSmsChannel, planWhatsAppHandoff } from "@/lib/channel"
import type { Message, MessageTrigger } from "@/types"

// What caused each message to exist. Icons make the queue scannable — staff can
// see "three pickup reminders and a broadcast" without reading every row.
const TRIGGER_META: Record<MessageTrigger, { icon: typeof UserPlus; tone: string }> = {
  client_created: { icon: UserPlus, tone: "text-chart-1 bg-chart-1/10" },
  item_stage: { icon: PackageCheck, tone: "text-chart-4 bg-chart-4/10" },
  broadcast: { icon: Megaphone, tone: "text-chart-3 bg-chart-3/10" },
  manual: { icon: PenLine, tone: "text-chart-2 bg-chart-2/10" },
  inbound: { icon: Inbox, tone: "text-muted-foreground bg-muted" },
}

interface Props {
  messages: Message[]
  loading: boolean
  error: string | null
  onApprove: (id: number) => Promise<Message>
  onHandoff: (id: number) => Promise<Message>
  onCancel: (id: number) => Promise<Message>
  onRefetch: () => void
}

/**
 * The approval queue — the heart of the whole feature.
 *
 * Every outbound message lands here first and waits for a person. The text shown is
 * byte-for-byte what the client will receive (the backend snapshots the rendered
 * body at draft time), so there is never a gap between what staff approve and what
 * gets sent.
 */
const ApprovalQueue = ({
  messages, loading, error, onApprove, onHandoff, onCancel, onRefetch,
}: Props) => {
  const { t } = useTranslation()

  // Tracks which row is mid-send. Sending is SYNCHRONOUS and can take a few seconds,
  // so without this the UI looks frozen and staff click again. The backend also
  // guards against double-sends with an atomic claim, but making a second click
  // impossible is better than making it harmless.
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<Message | null>(null)

  const handleApprove = async (message: Message) => {
    setPendingId(message.id)
    try {
      await onApprove(message.id)
      toast.success(t("communications.sendSuccess", { name: message.user_name }))
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "communications.sendFailed"))
      // Refetch even on failure: the message may now be 'failed' or flagged as
      // unconfirmed, and leaving a stale 'pending' row invites a second attempt.
      onRefetch()
    } finally {
      setPendingId(null)
    }
  }

  /**
   * Hand-sent WhatsApp: opens the client's chat with the message filled in, and
   * claims the message so nobody else sends it too.
   *
   * After this the message leaves the queue and appears in "Did these go out?" at
   * the top of the page, where the person confirms whether they pressed send. That
   * list is server-backed, so it survives a reload and other staff can see it.
   */
  const handleOpenWhatsApp = (message: Message) => {
    const plan = planWhatsAppHandoff(message.phone, message.body)
    if (!plan) {
      toast.error(t("communications.invalidWhatsAppNumber"))
      return
    }

    // ⚠️ ORDER MATTERS — do not move these below the `await`.
    // Browsers only allow window.open() and clipboard writes as a DIRECT result of
    // the click. After an await the gesture is considered over, and Safari in
    // particular blocks the tab as an unprompted popup. So we open a blank tab and
    // start the copy immediately, then claim, then point the tab at WhatsApp.
    //
    // Deliberately NOT passing "noopener": with it, window.open() returns null and
    // we'd have no handle to navigate later. The opener link is severed by hand
    // below instead.
    const tab = window.open("", "_blank")
    // Starts now (inside the gesture); copyText never rejects, so it's safe to only
    // read the outcome after the await below.
    const copy = plan.needsClipboard ? copyText(message.body) : null

    void (async () => {
      setPendingId(message.id)
      try {
        await onHandoff(message.id)
      } catch (err) {
        // Someone else claimed it, or the request failed. Close the blank tab
        // rather than leave the person staring at an empty page.
        tab?.close()
        toast.error(friendlyError(err, "communications.operationFailed"))
        setPendingId(null)
        onRefetch()
        return
      }

      if (tab) {
        // Cut the new tab's link back to this dashboard before navigating. An
        // opened page can otherwise redirect its opener ("reverse tabnabbing").
        // wa.me is trustworthy; there's still no reason to grant it that.
        tab.opener = null
        tab.location.href = plan.url
        toast.success(t("communications.handoffOpened"))
      } else {
        // Blocked despite being in the click. The confirm panel has a Reopen link,
        // which is a fresh click and always allowed.
        toast.warning(t("communications.popupBlocked"))
      }

      if (copy) {
        void copy.then((ok) =>
          ok
            ? toast.info(t("communications.messageCopied"))
            : toast.error(t("communications.copyFailed")),
        )
      }

      setPendingId(null)
      // Moves the message out of the queue and into "Did these go out?".
      onRefetch()
    })()
  }

  const handleCancel = async (message: Message) => {
    setPendingId(message.id)
    try {
      await onCancel(message.id)
      toast.success(t("communications.discardSuccess"))
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "communications.operationFailed"))
    } finally {
      setPendingId(null)
      setConfirmCancel(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={onRefetch}>
            <RefreshCw className="me-2 h-4 w-4" />
            {t("common.retry")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              {t("communications.queueTitle")}
              {messages.length > 0 && (
                <Badge variant="secondary">{messages.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>{t("communications.queueDesc")}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onRefetch} aria-label={t("common.refresh")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          {messages.length === 0 ? (
            // An empty queue is the normal, healthy state — say so rather than
            // showing a bare "no results", which reads like something is broken.
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium">{t("communications.queueEmpty")}</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("communications.queueEmptyDesc")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(message => {
                const meta = TRIGGER_META[message.trigger] ?? TRIGGER_META.manual
                const Icon = meta.icon
                const isPending = pendingId === message.id
                // Decided per message, not from a global setting: the queue can hold
                // drafts from more than one channel, and each must go out its own way.
                const manual = isManualChannel(message.channel)
                // Only SMS bills per segment, so only SMS gets the cost line.
                const segments = isSmsChannel(message.channel) ? estimateSegments(message.body) : null

                return (
                  <div
                    key={message.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{message.user_name}</span>
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          {message.phone}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {t(`communications.trigger.${message.trigger}`)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {t(`communications.channel.${message.channel}`)}
                        </Badge>
                        {message.template_category === "marketing" && (
                          // Worth calling out: marketing costs more and is the only
                          // category opt-outs apply to.
                          <Badge variant="outline" className="border-chart-3/40 bg-chart-3/10 text-xs text-chart-3">
                            {t("communications.marketing")}
                          </Badge>
                        )}
                      </div>

                      {/* Exactly what the client will receive — no truncation. */}
                      <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {message.body}
                      </p>

                      {segments && (
                        <p className="text-xs text-muted-foreground/70">
                          {t("communications.segmentInfo", {
                            count: segments.count,
                            encoding: segments.encoding,
                          })}
                          {segments.encoding === "UCS-2" && (
                            // Arabic drops the segment size from 160 to 70 characters,
                            // so this message costs multiples of an English one.
                            <span className="ms-1 text-amber-600 dark:text-amber-400">
                              {t("communications.unicodeWarning")}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* flex-wrap so the pair drops under the text on narrow screens
                        instead of pushing past the card edge. */}
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {manual ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenWhatsApp(message)}
                          disabled={isPending}
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          {isPending ? (
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                          ) : (
                            <MessageCircle className="me-2 h-4 w-4" />
                          )}
                          {t("communications.openInWhatsApp")}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(message)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="me-2 h-4 w-4" />
                          )}
                          {t("communications.approve")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmCancel(message)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t("communications.discard")}</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmCancel !== null}
        onOpenChange={open => !open && setConfirmCancel(null)}
        title={t("communications.discardTitle")}
        description={t("communications.discardDesc", { name: confirmCancel?.user_name ?? "" })}
        confirmLabel={t("communications.discard")}
        variant="destructive"
        loading={pendingId === confirmCancel?.id}
        onConfirm={() => confirmCancel && handleCancel(confirmCancel)}
      />
    </>
  )
}

export default ApprovalQueue
