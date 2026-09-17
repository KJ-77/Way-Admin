import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import UserCombobox from "@/components/ui/user-combobox"
import { apiFetch } from "@/lib/api"
import { friendlyError } from "@/lib/errors"
import { useClayTypes } from "@/hooks/use-clay-types"
import type { Item, User, UserPackage } from "@/types"

interface CreateItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (body: Record<string, unknown>) => Promise<Item>
  // Called after a successful create, so the host can refresh its list.
  onCreated: () => void
  // Client picker options. Unused when `fixedUser` is set.
  users?: User[]
  // When opened from a client's own profile the client is already known — the
  // picker is replaced by their name, and their subscriptions load straight away.
  fixedUser?: User
}

/**
 * Registers a new Studio item (a client's piece).
 *
 * Extracted from the Items page so the client profile can offer the same action
 * without a second copy of the form drifting out of sync with the first.
 *
 * Studio items only: they must be linked to an active subscription, start at
 * "drying", and take an optional description and clay type. Glaze type is captured
 * later, when the piece reaches "glaze fired". PC (walk-in painting) items have
 * their own flow on /pc-items.
 */
const CreateItemDialog = ({
  open, onOpenChange, onCreate, onCreated, users = [], fixedUser,
}: CreateItemDialogProps) => {
  const { t } = useTranslation()
  // Admin-managed catalog (/clay-types), so the list matches what's actually in stock.
  const { clayTypes } = useClayTypes()

  const [userId, setUserId] = useState("")
  const [description, setDescription] = useState("")
  const [clay, setClay] = useState("")
  const [packageId, setPackageId] = useState("")
  const [saving, setSaving] = useState(false)

  const [subscriptions, setSubscriptions] = useState<UserPackage[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)

  // A fixed client always wins over whatever was picked.
  const effectiveUserId = fixedUser?.id ?? userId

  // Start clean every time the dialog opens, so a half-filled form from last time
  // (possibly for a different client) never leaks into the next one.
  useEffect(() => {
    if (!open) return
    setUserId("")
    setDescription("")
    setClay("")
    setPackageId("")
  }, [open])

  // Load the chosen client's ACTIVE subscriptions — a Studio item must hang off one.
  useEffect(() => {
    if (!open || !effectiveUserId) {
      setSubscriptions([])
      return
    }
    let cancelled = false // ignore a response that lands after the client changed
    const fetchSubs = async () => {
      setLoadingSubs(true)
      try {
        const res = await apiFetch(`/user-packages?user_id=${effectiveUserId}`)
        if (!res.ok) throw new Error()
        const data: UserPackage[] = await res.json()
        if (!cancelled) setSubscriptions(data.filter(s => s.status === "active"))
      } catch {
        if (!cancelled) setSubscriptions([])
      } finally {
        if (!cancelled) setLoadingSubs(false)
      }
    }
    fetchSubs()
    return () => { cancelled = true }
  }, [open, effectiveUserId])

  const handleCreate = async () => {
    setSaving(true)
    try {
      await onCreate({
        user_id: effectiveUserId,
        user_package_id: Number(packageId),
        section: "Studio",
        description: description || null,
        clay_type: clay || null,
      })
      toast.success(t("items.createSuccess"))
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error(friendlyError(err, "items.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("items.addItem")}</DialogTitle>
          <DialogDescription>
            {fixedUser ? fixedUser.full_name : t("items.addDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!fixedUser && (
            <div className="grid gap-2">
              <Label>{t("items.client")}</Label>
              <UserCombobox
                users={users}
                value={userId}
                // A subscription belongs to one client, so changing client clears it.
                onValueChange={(v) => { setUserId(v); setPackageId("") }}
                placeholder={t("items.selectClient")}
              />
            </div>
          )}

          {/* Studio items require a linked subscription */}
          <div className="grid gap-2">
            <Label>{t("items.subscription")}</Label>
            {loadingSubs ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("items.loadingSubscriptions")}
              </div>
            ) : !effectiveUserId ? (
              <p className="py-1 text-sm text-muted-foreground">{t("items.selectClient")}</p>
            ) : subscriptions.length === 0 ? (
              <p className="py-1 text-sm text-destructive">{t("items.noActiveSubscriptions")}</p>
            ) : (
              <Select value={packageId} onValueChange={setPackageId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("items.selectSubscription")} />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions.map(sub => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      {sub.package_name} — {sub.remaining_sessions} sessions, {sub.remaining_weight} kg left
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-2">
            <Label>{t("items.description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("items.descriptionPlaceholder")}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t("items.clayType")}</Label>
            <Select value={clay} onValueChange={setClay}>
              <SelectTrigger>
                <SelectValue placeholder={t("items.selectClayType")} />
              </SelectTrigger>
              <SelectContent>
                {clayTypes.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">{t("items.createHint")}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={!effectiveUserId || !packageId || saving}>
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateItemDialog
