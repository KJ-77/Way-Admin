import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Pencil, Loader2, Zap, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { friendlyError } from "@/lib/errors"
import { estimateSegments, extractPlaceholders } from "@/lib/sms"
import { ACTIVE_CHANNEL, isSmsChannel } from "@/lib/channel"
import type { MessageTemplate } from "@/types"

interface Props {
  templates: MessageTemplate[]
  loading: boolean
  onUpdate: (id: number, body: Record<string, unknown>) => Promise<MessageTemplate>
  onRefetch: () => void
}

/**
 * Template management.
 *
 * This panel only works because the studio doesn't use the WhatsApp Business API.
 * There, every template body must be pre-approved by Meta and changing a word means
 * resubmitting and waiting — so editing in place would be a lie. On SMS and on
 * hand-sent WhatsApp, templates are just local text: reword one and the next message
 * uses it.
 *
 * What is deliberately NOT editable here is the trigger. `trigger_event` is the key
 * that wires a template to an automatic event ("item_stage:ready"), and changing it
 * would silently disconnect that automation with no visible symptom.
 */
const TemplatesPanel = ({ templates, loading, onUpdate, onRefetch }: Props) => {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<MessageTemplate | null>(null)
  const [draftBody, setDraftBody] = useState("")
  const [saving, setSaving] = useState(false)

  const openEditor = (template: MessageTemplate) => {
    setEditing(template)
    setDraftBody(template.body)
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await onUpdate(editing.id, { body: draftBody })
      toast.success(t("communications.templateSaved"))
      setEditing(null)
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "communications.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (template: MessageTemplate) => {
    try {
      await onUpdate(template.id, { is_active: !template.is_active })
      toast.success(t("communications.templateSaved"))
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "communications.operationFailed"))
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  // Only SMS bills per segment — see message-composer.
  const showCost = isSmsChannel(ACTIVE_CHANNEL)
  const draftSegments = estimateSegments(draftBody)
  // Losing a placeholder the automation depends on is the one edit that breaks
  // things silently — the message would go out with a blank where a name should be.
  const originalPlaceholders = editing ? extractPlaceholders(editing.body) : []
  const draftPlaceholders = extractPlaceholders(draftBody)
  const missingPlaceholders = originalPlaceholders.filter(n => !draftPlaceholders.includes(n))

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("communications.templatesTitle")}</CardTitle>
          <CardDescription>{t("communications.templatesDesc")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {templates.map(template => (
            <div key={template.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{template.name}</span>
                    <Badge
                      variant="outline"
                      className={
                        template.category === "marketing"
                          ? "border-chart-3/40 bg-chart-3/10 text-chart-3"
                          : "border-chart-1/40 bg-chart-1/10 text-chart-1"
                      }
                    >
                      {t(`communications.category.${template.category}`)}
                    </Badge>
                    {/* An automatic template fires without anyone opening this page,
                        so it's worth flagging which ones those are. */}
                    {template.trigger_event && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Zap className="h-3 w-3" />
                        {template.trigger_event}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {template.body}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={() => handleToggleActive(template)}
                      aria-label={t("communications.templateActive")}
                    />
                    <span className="text-xs text-muted-foreground">
                      {template.is_active
                        ? t("communications.active")
                        : t("communications.inactive")}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEditor(template)}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">{t("common.edit")}</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
            <DialogDescription>{t("communications.editTemplateDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("communications.messageText")}</Label>
              <Textarea
                value={draftBody}
                onChange={e => setDraftBody(e.target.value)}
                rows={5}
                maxLength={1600}
              />
            </div>

            {/* Placeholder legend — which blank means what, in order. */}
            {editing?.variable_labels && editing.variable_labels.length > 0 && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Info className="h-3 w-3" />
                  {t("communications.placeholders")}
                </p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {editing.variable_labels.map((label, i) => (
                    <li key={i}>
                      <code className="rounded bg-background px-1">{`{{${i + 1}}}`}</code>
                      {" — "}
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {missingPlaceholders.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t("communications.missingPlaceholders", {
                  placeholders: missingPlaceholders.map(n => `{{${n}}}`).join(", "),
                })}
              </p>
            )}

            {showCost && (
              <p className="text-xs text-muted-foreground">
                {t("communications.segmentInfo", {
                  count: draftSegments.count,
                  encoding: draftSegments.encoding,
                })}
                {draftSegments.encoding === "UCS-2" && (
                  <span className="ms-1 text-amber-600 dark:text-amber-400">
                    {t("communications.unicodeWarning")}
                  </span>
                )}
              </p>
            )}

            {/* Edits never rewrite messages already sitting in the queue — their
                text was snapshotted when they were drafted. Worth saying, because
                the opposite would be a reasonable assumption. */}
            <p className="text-xs text-muted-foreground">
              {t("communications.templateEditNote")}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || !draftBody.trim()}>
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TemplatesPanel
