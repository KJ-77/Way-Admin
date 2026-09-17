import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import {
  MessageSquare, UserPlus, PackageCheck, Megaphone, PenLine,
  Clock, ChevronRight, Inbox, AlertTriangle, MessageCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useMessageQueue } from "@/hooks/use-messaging"
import { isManualChannel } from "@/lib/channel"
import type { MessageTrigger } from "@/types"

// Mirrors the icon language used on the Communications page, so the same kind of
// message looks the same in both places.
const TRIGGER_META: Record<MessageTrigger, { icon: typeof UserPlus; tone: string }> = {
  client_created: { icon: UserPlus, tone: "text-chart-1 bg-chart-1/10" },
  item_stage: { icon: PackageCheck, tone: "text-chart-4 bg-chart-4/10" },
  broadcast: { icon: Megaphone, tone: "text-chart-3 bg-chart-3/10" },
  manual: { icon: PenLine, tone: "text-chart-2 bg-chart-2/10" },
  inbound: { icon: Inbox, tone: "text-muted-foreground bg-muted" },
}

// How many rows the widget shows before deferring to the full page. The dashboard
// is a glance, not a workspace — sending happens on the Communications page where
// the full message text is visible, because acting on something you can only half
// read defeats the point of the review step.
//
// Six, laid out in two columns from `lg` up: the widget spans the full dashboard
// width (it took over Recent Activity's space), and three stacked rows across that
// width read as mostly empty.
const PREVIEW_LIMIT = 6

/**
 * Dashboard widget: what's waiting for approval.
 *
 * Exists so a full queue can't sit unnoticed. Nothing sends automatically, which
 * also means nothing sends if nobody looks — this is the thing that makes people
 * look.
 */
const CommunicationsPreview = () => {
  const { t } = useTranslation()
  const { queue, unconfirmed, loading } = useMessageQueue()

  const pending = queue.filter(m => m.status === "pending_approval")
  const visible = pending.slice(0, PREVIEW_LIMIT)
  // Hand-sent WhatsApp confirmations are a routine step, not a problem — only
  // escalate the banner to a warning when a timed-out API send is in there too.
  // Mirrors the "Did these go out?" panel on the Communications page.
  const onlyRoutine = unconfirmed.every(m => isManualChannel(m.channel))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{t("dashboard.communications")}</CardTitle>
            {pending.length > 0 && <Badge variant="secondary">{pending.length}</Badge>}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/communications">
              {t("dashboard.viewAll")}
              <ChevronRight className="ms-1 h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
        <CardDescription>{t("dashboard.communicationsDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Above the queue: messages someone opened in WhatsApp (or a provider send
            that timed out) and nobody has confirmed yet. */}
        {unconfirmed.length > 0 && (
          <Link
            to="/communications"
            className={
              onlyRoutine
                ? "flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 transition-colors hover:bg-emerald-500/10"
                : "flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 transition-colors hover:bg-amber-500/10"
            }
          >
            {onlyRoutine
              ? <MessageCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
            <span className="text-sm">
              {t("dashboard.unconfirmedCount", { count: unconfirmed.length })}
            </span>
            <ChevronRight className="ms-auto h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
          </Link>
        )}

        {loading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-6 text-center">
            <Inbox className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("dashboard.communicationsEmpty")}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              {visible.map(message => {
                const meta = TRIGGER_META[message.trigger] ?? TRIGGER_META.manual
                const Icon = meta.icon

                return (
                  <Link
                    key={message.id}
                    to="/communications"
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className={`rounded-lg p-2 ${meta.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{message.user_name}</p>
                        {/* Translated label, not the raw enum — "whatsapp_manual"
                            uppercased reads like a bug. */}
                        <Badge variant="secondary" className="text-[10px]">
                          {t(`communications.channel.${message.channel}`)}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{message.body}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="hidden shrink-0 items-center gap-1 border-amber-500/30 text-amber-500 sm:inline-flex"
                    >
                      <Clock className="h-3 w-3" />
                      {t("dashboard.pendingApproval")}
                    </Badge>
                  </Link>
                )
              })}
            </div>

            {pending.length > PREVIEW_LIMIT && (
              <p className="pt-1 text-center text-xs text-muted-foreground">
                {t("dashboard.andMoreWaiting", { count: pending.length - PREVIEW_LIMIT })}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default CommunicationsPreview
