import { useState, useMemo, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Plus, Loader2, MessageSquarePlus } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import UserCombobox from "@/components/ui/user-combobox"
import { friendlyError } from "@/lib/errors"
import { estimateSegments, renderPreview, extractPlaceholders } from "@/lib/sms"
import { ACTIVE_CHANNEL, isSmsChannel } from "@/lib/channel"
import type { MessageTemplate, User } from "@/types"

interface Props {
  users: User[]
  templates: MessageTemplate[]
  onCreate: (body: Record<string, unknown>) => Promise<unknown>
  onCreated: () => void
}

/**
 * Drafts a message into the approval queue.
 *
 * Two modes, matching the two backend paths:
 *   • Template — pick a pre-written message and fill in its blanks.
 *   • Free-form — type whatever you like. Always allowed on both SMS and
 *     hand-sent WhatsApp. (The 24-hour window and pre-approved-wording rules belong
 *     to the WhatsApp Business API, which isn't in use.) That makes this the more
 *     useful mode day to day.
 *
 * Nothing sends from here. The draft lands in the queue and still needs approval —
 * including when the person drafting it is the same person who'll approve it.
 */
const MessageComposer = ({ users, templates, onCreate, onCreated }: Props) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"template" | "freeform">("template")
  const [userId, setUserId] = useState("")
  const [templateId, setTemplateId] = useState<string>("")
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Only templates that are active and sendable. A disabled template in the picker
  // is a trap — staff fill it in, hit draft, and get a rejection they can't explain.
  const usableTemplates = useMemo(
    () => templates.filter(tpl => tpl.is_active),
    [templates],
  )

  const selectedTemplate = usableTemplates.find(tpl => String(tpl.id) === templateId)
  const selectedUser = users.find(u => u.id === userId)

  // Placeholder {{1}} is the client's name by convention throughout the system, so
  // prefill it the moment a client is picked. Saves retyping a name that's already
  // on screen, and keeps the preview meaningful straight away.
  useEffect(() => {
    if (selectedUser) {
      setVariables(prev => ({ ...prev, "1": prev["1"] || selectedUser.full_name }))
    }
  }, [selectedUser])

  const placeholders = selectedTemplate ? extractPlaceholders(selectedTemplate.body) : []

  // What the client will actually read. Unfilled blanks stay visible as {{n}} rather
  // than collapsing to nothing, so a missing value is obvious before sending.
  const preview = selectedTemplate ? renderPreview(selectedTemplate.body, variables) : body
  // Only SMS bills per segment. On WhatsApp the counter would be meaningless noise.
  const showCost = isSmsChannel(ACTIVE_CHANNEL)
  const segments = estimateSegments(preview)

  const isComplete =
    userId !== "" &&
    (mode === "template"
      ? selectedTemplate !== undefined && placeholders.every(n => variables[String(n)]?.trim())
      : body.trim().length > 0)

  const reset = () => {
    setUserId("")
    setTemplateId("")
    setVariables({})
    setBody("")
    setMode("template")
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onCreate(
        mode === "template"
          ? { user_id: userId, template_id: Number(templateId), variables }
          : { user_id: userId, body: body.trim() },
      )
      toast.success(t("communications.draftSuccess"))
      reset()
      setOpen(false)
      onCreated()
    } catch (err) {
      toast.error(friendlyError(err, "communications.operationFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="me-2 h-4 w-4" />
          {t("communications.compose")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            {t("communications.composeTitle")}
          </DialogTitle>
          <DialogDescription>{t("communications.composeDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("communications.recipient")}</Label>
            <UserCombobox users={users} value={userId} onValueChange={setUserId} />
            {selectedUser?.phone && (
              <p className="text-xs text-muted-foreground" dir="ltr">{selectedUser.phone}</p>
            )}
          </div>

          <Tabs value={mode} onValueChange={value => setMode(value as typeof mode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="template">{t("communications.useTemplate")}</TabsTrigger>
              <TabsTrigger value="freeform">{t("communications.writeYourOwn")}</TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t("communications.template")}</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("communications.selectTemplate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {usableTemplates.map(tpl => (
                      <SelectItem key={tpl.id} value={String(tpl.id)}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* One input per placeholder, labelled with the template's own
                  variable_labels so staff see "client name" rather than "{{1}}". */}
              {placeholders.map(index => (
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
            </TabsContent>

            <TabsContent value="freeform" className="space-y-2 pt-4">
              <Label>{t("communications.messageText")}</Label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={5}
                maxLength={1600}
                placeholder={t("communications.messagePlaceholder")}
              />
            </TabsContent>
          </Tabs>

          {/* Live preview + cost. The segment counter is the point: staff can watch a
              message tip into a second segment, and see instantly when a stray Arabic
              character drops the whole thing to 70-character segments. */}
          {preview.trim() && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("communications.preview")}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{preview}</p>
              {showCost && (
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
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!isComplete || submitting}>
            {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("communications.addToQueue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MessageComposer
