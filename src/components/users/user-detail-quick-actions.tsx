import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { CalendarPlus, PackagePlus, Pencil, Loader2, KeyRound, Copy, Check, Trash2 } from "lucide-react"
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
import { throwIfNotOk, friendlyError } from "@/lib/errors"
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
  // user_package_id = which subscription this session anchors to (sub.id, not sub.package_id)
  const [sessionForm, setSessionForm] = useState({ user_package_id: "", attendance: "attended", notes: "" })
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

  // ── Reset-password dialog state — two-phase: confirm, then show temp password ──
  const [resetOpen, setResetOpen] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // ── Soft-delete dialog state — admin/studio-manager triggered ──
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Inline update handler — matches the signature AddUserDialog expects
  const handleUpdateUser = async (id: string, body: Record<string, unknown>): Promise<User> => {
    const response = await apiFetch(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    await throwIfNotOk(response, "Failed to update client")
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
          user_package_id: Number(sessionForm.user_package_id),
          attendance: sessionForm.attendance,
          notes: sessionForm.notes || undefined,
        }),
      })
      await throwIfNotOk(res, "Failed to create session")
      toast.success(t("sessions.createSuccess"))
      setSessionOpen(false)
      onSessionCreated()
    } catch (err) {
      toast.error(friendlyError(err, "sessions.operationFailed"))
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
      await throwIfNotOk(res, "Failed to create subscription")
      toast.success(t("subscriptions.createSuccess"))
      setSubscribeOpen(false)
      onSubscriptionCreated()
    } catch (err) {
      toast.error(friendlyError(err, "subscriptions.operationFailed"))
    } finally {
      setSubscribeSaving(false)
    }
  }

  const sessionValid = sessionForm.user_package_id && sessionForm.attendance

  // Resets the client's Cognito password — backend returns a temp password we surface
  // in the dialog so the admin can read/copy it.
  const handleResetPassword = async () => {
    setResettingPassword(true)
    try {
      const res = await apiFetch(`/users/${user.id}/reset-password`, { method: "POST" })
      await throwIfNotOk(res, "Failed to reset password")
      const data = await res.json() as { tempPassword: string }
      setTempPassword(data.tempPassword)
      toast.success(t("users.resetPasswordSuccess"))
    } catch (err) {
      toast.error(friendlyError(err, "users.resetPasswordFailed"))
    } finally {
      setResettingPassword(false)
    }
  }

  const handleCopyTempPassword = async () => {
    if (!tempPassword) return
    await navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Wipe local state when dialog closes so reopening starts fresh
  const handleResetDialogChange = (open: boolean) => {
    setResetOpen(open)
    if (!open) {
      setTempPassword(null)
      setCopied(false)
    }
  }

  // Soft-delete the client — flips is_active=false and disables their Cognito login.
  // Stays on the page; the profile header detects is_active=false on refetch and
  // renders the Deleted banner with a Restore button (so a misclick is reversible).
  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await apiFetch(`/users/${user.id}`, { method: "DELETE" })
      await throwIfNotOk(res, "Failed to delete client")
      toast.success("Client deleted successfully")
      setDeleteOpen(false)
      onUserUpdated()
    } catch (err) {
      toast.error(friendlyError(err, "users.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

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
            setSessionForm({ user_package_id: "", attendance: "attended", notes: "" })
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
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => handleResetDialogChange(true)}
        >
          <KeyRound className="h-3.5 w-3.5" />
          {t("users.resetPassword")}
        </Button>
        {/* Delete is disabled once the client is already soft-deleted — the profile
            header renders the Restore action in that state, so this button would be a no-op. */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          disabled={!user.is_active}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("users.delete")}
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
                  value={sessionForm.user_package_id}
                  onValueChange={(v) => setSessionForm(prev => ({ ...prev, user_package_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("sessions.selectSubscription")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSubscriptions.map(sub => (
                      <SelectItem key={sub.id} value={String(sub.id)}>
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

      {/* ── Reset Password Dialog — two phases: confirm, then show temp password ── */}
      <Dialog open={resetOpen} onOpenChange={handleResetDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.resetPasswordConfirm")}</DialogTitle>
            <DialogDescription>
              {tempPassword ? t("users.resetPasswordDone") : t("users.resetPasswordWarning")}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {user.full_name} ({user.email || user.phone})
          </p>
          {tempPassword && (
            <div className="rounded-md border bg-muted/50 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">{t("users.tempPasswordLabel")}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono border">
                  {tempPassword}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyTempPassword} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("users.tempPasswordHint")}</p>
            </div>
          )}
          <DialogFooter>
            {tempPassword ? (
              <Button onClick={() => handleResetDialogChange(false)}>
                {t("common.close")}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleResetDialogChange(false)}
                  disabled={resettingPassword}
                >
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleResetPassword} disabled={resettingPassword}>
                  {resettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("users.resetPassword")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog — same copy as the users-table delete flow ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.deleteConfirm", "Delete Client")}</DialogTitle>
            <DialogDescription>
              {t("users.deleteWarning", "This client will be hidden from the clients list and their login will be disabled. Their history (sessions, items, subscriptions) is preserved and the client can be restored later.")}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {user.full_name} ({user.email || user.phone})
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default UserDetailQuickActions
