import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { CalendarPlus, PackagePlus, Pencil, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import AddUserDialog from "@/components/users/add-user-dialog"
import type { User, UserPackage, Package } from "@/types"
import type { CreateUserResponse } from "@/hooks/use-users"

interface UserDetailQuickActionsProps {
  user: User
  subscriptions: UserPackage[]
  onSessionCreated: () => void
  onSubscriptionCreated: () => void
  onUserUpdated: () => void
}

const UserDetailQuickActions = ({
  user, subscriptions, onSessionCreated, onSubscriptionCreated, onUserUpdated,
}: UserDetailQuickActionsProps) => {
  const { t } = useTranslation()

  // ── Session dialog state ──
  const [sessionOpen, setSessionOpen] = useState(false)
  const [sessionForm, setSessionForm] = useState({ package_id: "", attendance: "attended", notes: "" })
  const [sessionSaving, setSessionSaving] = useState(false)

  // Active subscriptions for the session dialog
  const activeSubscriptions = subscriptions.filter(s => s.status === "active")

  // ── Subscribe dialog state ──
  const [subscribeOpen, setSubscribeOpen] = useState(false)
  const [subscribeForm, setSubscribeForm] = useState({ package_id: "", notes: "" })
  const [subscribeSaving, setSubscribeSaving] = useState(false)
  const [packages, setPackages] = useState<Package[]>([])
  const [loadingPkgs, setLoadingPkgs] = useState(false)

  // ── Edit user dialog state ──
  const [editOpen, setEditOpen] = useState(false)

  // Inline update handler — matches the signature AddUserDialog expects
  const handleUpdateUser = async (id: string, body: Record<string, unknown>): Promise<User> => {
    const response = await apiFetch(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      const errorMsg = errorData?.message || errorData?.error || `Failed to update client: ${response.status}`
      throw new Error(errorMsg)
    }
    return response.json()
  }

  // Stub — never called since dialog opens in edit mode only
  const stubCreateUser = (() => Promise.reject(new Error("Not supported"))) as () => Promise<CreateUserResponse>

  // Fetch packages when subscribe dialog opens
  useEffect(() => {
    if (!subscribeOpen) return
    let cancelled = false
    const fetchPackages = async () => {
      setLoadingPkgs(true)
      try {
        const res = await apiFetch("/packages")
        if (!res.ok) throw new Error()
        if (!cancelled) setPackages(await res.json())
      } catch {
        if (!cancelled) setPackages([])
      } finally {
        if (!cancelled) setLoadingPkgs(false)
      }
    }
    fetchPackages()
    return () => { cancelled = true }
  }, [subscribeOpen])

  // ── Handlers ──

  const handleCreateSession = async () => {
    setSessionSaving(true)
    try {
      const res = await apiFetch("/sessions", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          package_id: Number(sessionForm.package_id),
          attendance: sessionForm.attendance,
          notes: sessionForm.notes || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || err?.message || "Failed to create session")
      }
      toast.success(t("sessions.createSuccess"))
      setSessionOpen(false)
      onSessionCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sessions.operationFailed"))
    } finally {
      setSessionSaving(false)
    }
  }

  const handleSubscribe = async () => {
    setSubscribeSaving(true)
    try {
      const res = await apiFetch("/user-packages", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          package_id: Number(subscribeForm.package_id),
          notes: subscribeForm.notes || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || err?.message || "Failed to create subscription")
      }
      toast.success(t("subscriptions.createSuccess"))
      setSubscribeOpen(false)
      onSubscriptionCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("subscriptions.operationFailed"))
    } finally {
      setSubscribeSaving(false)
    }
  }

  const sessionValid = sessionForm.package_id && sessionForm.attendance

  return (
    <>
      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
          {t("users.edit")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setSessionForm({ package_id: "", attendance: "attended", notes: "" })
            setSessionOpen(true)
          }}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          {t("sessions.addSession")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setSubscribeForm({ package_id: "", notes: "" })
            setSubscribeOpen(true)
          }}
        >
          <PackagePlus className="h-3.5 w-3.5" />
          {t("subscriptions.addSubscription")}
        </Button>
      </div>

      {/* ── Create Session Dialog ── */}
      <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sessions.addSession")}</DialogTitle>
            <DialogDescription>
              {user.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Subscription selector */}
            <div className="grid gap-2">
              <Label>{t("sessions.subscription")}</Label>
              {activeSubscriptions.length === 0 ? (
                <p className="text-sm text-destructive py-1">{t("sessions.noActiveSubscriptions")}</p>
              ) : (
                <Select
                  value={sessionForm.package_id}
                  onValueChange={(v) => setSessionForm(prev => ({ ...prev, package_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("sessions.selectSubscription")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSubscriptions.map(sub => (
                      <SelectItem key={sub.id} value={String(sub.package_id)}>
                        {sub.package_name} — {sub.remaining_sessions} sessions, {sub.remaining_weight} kg left
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>{t("sessions.attendance")}</Label>
                <Select
                  value={sessionForm.attendance}
                  onValueChange={(v) => setSessionForm(prev => ({ ...prev, attendance: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attended">{t("sessions.attended")}</SelectItem>
                    <SelectItem value="booked">{t("sessions.booked")}</SelectItem>
                    <SelectItem value="cancelled">{t("sessions.cancelled")}</SelectItem>
                    <SelectItem value="cancelled - no charge">{t("sessions.cancelledNoCharge")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t("sessions.notes")}</Label>
              <Textarea
                value={sessionForm.notes}
                onChange={(e) => setSessionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t("sessions.notesPlaceholder")}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionOpen(false)} disabled={sessionSaving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateSession} disabled={!sessionValid || sessionSaving}>
              {sessionSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Subscribe to Package Dialog ── */}
      <Dialog open={subscribeOpen} onOpenChange={setSubscribeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("subscriptions.addSubscription")}</DialogTitle>
            <DialogDescription>
              {user.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("subscriptions.package")}</Label>
              {loadingPkgs ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading packages...
                </div>
              ) : (
                <Select
                  value={subscribeForm.package_id}
                  onValueChange={(v) => setSubscribeForm(prev => ({ ...prev, package_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("subscriptions.selectPackage")} />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.package_type} — ${p.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <Label>{t("subscriptions.notes")}</Label>
              <Input
                value={subscribeForm.notes}
                onChange={(e) => setSubscribeForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t("subscriptions.notesPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscribeOpen(false)} disabled={subscribeSaving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubscribe} disabled={!subscribeForm.package_id || subscribeSaving}>
              {subscribeSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ── */}
      <AddUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onUserUpdated}
        onCreateUser={stubCreateUser}
        onUpdateUser={handleUpdateUser}
        editingUser={user}
      />
    </>
  )
}

export default UserDetailQuickActions
