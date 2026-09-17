import { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Megaphone, Plus, Loader2, Send, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { friendlyError } from "@/lib/errors"
import { estimateSegments, renderPreview, extractPlaceholders } from "@/lib/sms"
import type { Broadcast, MessageTemplate, DrainResult, SkippedRecipient } from "@/types"

interface Props {
  broadcasts: Broadcast[]
  templates: MessageTemplate[]
  loading: boolean
  onCreate: (body: Record<string, unknown>) => Promise<{ id: number; skipped: SkippedRecipient[] }>
  onDrainAll: (
    id: number,
    onProgress: (r: DrainResult) => void,
    shouldContinue: () => boolean,
  ) => Promise<DrainResult>
  onRefetch: () => void
}

/**
 * Broadcast campaigns — a promo to the whole client list.
 *
 * Two things make this more than a loop over recipients:
 *
 * 1. It can't finish in one request. 130 synchronous sends blow past API Gateway's
 *    29-second limit, so the campaign is drained in chunks of 25 behind a progress
 *    bar. Closing this dialog mid-send loses nothing and duplicates nothing — each
 *    chunk claims its own rows, so the next run resumes exactly where it stopped.
 *
 * 2. It costs real money and real reputation. Every recipient is a billed message,
 *    and carriers score senders on how often recipients report them. Over-sending
 *    degrades delivery for everything, including the "your piece is ready" messages
 *    people actually want. Hence admin-only, and hence the warning in the dialog.
 */
const BroadcastPanel = ({
  broadcasts, templates, loading, onCreate, onDrainAll, onRefetch,
}: Props) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const [sendingId, setSendingId] = useState<number | null>(null)
  const [progress, setProgress] = useState<DrainResult | null>(null)
  const [skipped, setSkipped] = useState<SkippedRecipient[]>([])

  // Lets an in-flight drain loop stop cleanly when this component unmounts, rather
  // than firing requests into a page the user has already navigated away from.
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])

  const marketingTemplates = templates.filter(tpl => tpl.is_active)
  const selectedTemplate = marketingTemplates.find(tpl => String(tpl.id) === templateId)

  // {{1}} is always the recipient's own name, filled per-person at fan-out time —
  // so it's excluded from the campaign-wide inputs here.
  const campaignPlaceholders = selectedTemplate
    ? extractPlaceholders(selectedTemplate.body).filter(n => n !== 1)
    : []

  const preview = selectedTemplate
    ? renderPreview(selectedTemplate.body, { "1": t("communications.sampleName"), ...variables })
    : ""
  const segments = estimateSegments(preview)

  const isComplete =
    name.trim() !== "" &&
    selectedTemplate !== undefined &&
    campaignPlaceholders.every(n => variables[String(n)]?.trim())

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      const created = await onCreate({
        name: name.trim(),
        template_id: Number(templateId),
        variables,
      })
      setSkipped(created.skipped ?? [])
      if (created.skipped?.length) {
        // Not a failure — the campaign was created. But these clients silently got
        // nothing, and staff should know before they assume everyone was reached.
        toast.warning(t("communications.someSkipped", { count: created.skipped.length }))
      } else {
        toast.success(t("communications.broadcastCreated"))
      }
      setName("")
      setTemplateId("")
      setVariables({})
      setOpen(false)
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "communications.operationFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSend = async (broadcast: Broadcast) => {
    setSendingId(broadcast.id)
    setProgress({ sent: 0, failed: 0, remaining: broadcast.pending_count })
    try {
      const totals = await onDrainAll(
        broadcast.id,
        result => mounted.current && setProgress(result),
        () => mounted.current,
      )
      toast.success(t("communications.broadcastSent", { sent: totals.sent, failed: totals.failed }))
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "communications.operationFailed"))
      // Partial progress is real and durable — refresh so the counts reflect what
      // actually went out before the failure.
      onRefetch()
    } finally {
      if (mounted.current) {
        setSendingId(null)
        setProgress(null)
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            {t("communications.broadcastsTitle")}
          </CardTitle>
          <CardDescription>{t("communications.broadcastsDesc")}</CardDescription>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="me-2 h-4 w-4" />
              {t("communications.newBroadcast")}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("communications.newBroadcast")}</DialogTitle>
              <DialogDescription>{t("communications.newBroadcastDesc")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("communications.campaignName")}</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t("communications.campaignNamePlaceholder")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("communications.campaignNameHelp")}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t("communications.template")}</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("communications.selectTemplate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {marketingTemplates.map(tpl => (
                      <SelectItem key={tpl.id} value={String(tpl.id)}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {campaignPlaceholders.map(index => (
                <div key={index} className="space-y-2">
                  <Label>
                    {selectedTemplate?.variable_labels?.[index - 1] ?? `{{${index}}}`}
                  </Label>
                  <Input
                    value={variables[String(index)] ?? ""}
                    onChange={e =>
                      setVariables(prev => ({ ...prev, [String(index)]: e.target.value }))
                    }
                  />
                </div>
              ))}

              {preview.trim() && (
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {t("communications.preview")}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{preview}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("communications.segmentInfo", {
                      count: segments.count,
                      encoding: segments.encoding,
                    })}
                    {segments.encoding === "UCS-2" && (
                      <span className="ms-1 text-amber-600 dark:text-amber-400">
                        {t("communications.unicodeWarning")}
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs text-muted-foreground">
                  {t("communications.broadcastWarning")}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreate} disabled={!isComplete || submitting}>
                {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("communications.createDraft")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Clients left out because their stored number couldn't be parsed. Shown
            until dismissed — a silent omission is worse than a noisy one. */}
        {skipped.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="text-sm font-medium">{t("communications.skippedTitle")}</p>
            <p className="mb-2 text-xs text-muted-foreground">
              {t("communications.skippedDesc")}
            </p>
            <ul className="space-y-0.5 text-xs">
              {skipped.map(s => (
                <li key={s.id}>
                  {s.name} — <span dir="ltr" className="text-muted-foreground">{s.phone}</span>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSkipped([])}>
              {t("common.close")}
            </Button>
          </div>
        )}

        {broadcasts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("communications.noBroadcasts")}
          </p>
        ) : (
          broadcasts.map(broadcast => {
            const isSending = sendingId === broadcast.id
            const done = broadcast.sent_count + broadcast.failed_count
            const percent = broadcast.total_count > 0
              ? Math.round((done / broadcast.total_count) * 100)
              : 0

            return (
              <div key={broadcast.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{broadcast.name}</span>
                      <Badge variant="outline">
                        {t(`communications.broadcastStatus.${broadcast.status}`)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("communications.broadcastCounts", {
                        total: broadcast.total_count,
                        sent: broadcast.sent_count,
                        failed: broadcast.failed_count,
                        pending: broadcast.pending_count,
                      })}
                    </p>
                  </div>

                  {broadcast.pending_count > 0 && (
                    <Button size="sm" onClick={() => handleSend(broadcast)} disabled={isSending}>
                      {isSending
                        ? <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        : <Send className="me-2 h-4 w-4" />}
                      {t("communications.sendBroadcast")}
                    </Button>
                  )}
                </div>

                {(isSending || (done > 0 && broadcast.pending_count > 0)) && (
                  <div className="mt-3 space-y-1">
                    <Progress
                      value={
                        isSending && progress && broadcast.total_count > 0
                          ? Math.round(
                              ((broadcast.total_count - progress.remaining) /
                                broadcast.total_count) * 100,
                            )
                          : percent
                      }
                    />
                    {isSending && progress && (
                      <p className="text-xs text-muted-foreground">
                        {t("communications.sendingProgress", {
                          sent: progress.sent,
                          remaining: progress.remaining,
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

export default BroadcastPanel
