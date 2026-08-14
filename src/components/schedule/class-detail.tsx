import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Loader2, AlertCircle, ArrowLeft, Ban, CalendarPlus, Pencil, Trash2,
  MoreHorizontal, Users, Clock, User as UserIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ConfirmDialog from "@/components/ui/confirm-dialog"
import UserCombobox from "@/components/ui/user-combobox"
import { useClassDetail } from "@/hooks/use-class-detail"
import { useClassTypes } from "@/hooks/use-class-types"
import { apiFetch } from "@/lib/api"
import { friendlyError, throwIfNotOk, ApiError } from "@/lib/errors"
import type {
  ScheduleSlot, Tutor, User, UserPackage, Attendance, Session,
  UpsertOverridePayload,
} from "@/types"

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const

function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number)
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

// Pretty-format YYYY-MM-DD as "Monday, June 8, 2026". Date is interpreted as
// UTC midnight to avoid TZ surprises around date boundaries.
function formatClassDate(yyyyMmDd: string): string {
  return new Date(`${yyyyMmDd}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  })
}

// Badge palette — matches the rest of the app for consistency
const attendanceBadgeClass: Record<Attendance, string> = {
  "attended": "bg-green-500/15 text-green-500 border-green-500/30",
  "booked": "bg-blue-500/15 text-blue-500 border-blue-500/30",
  "cancelled": "bg-red-500/15 text-red-400 border-red-500/30",
  "cancelled - no charge": "bg-gray-500/15 text-gray-400 border-gray-500/30",
}

// --- Form types (mirrors schedule-calendar shape so users see consistent UI) ---

interface SlotFormData {
  day_of_week: string
  start_time: string
  end_time: string
  tutor_id: string
  class_type_id: string  // "" = unset; must be set before submit
  capacity: string  // stored as string for input compatibility; "" = no capacity
}

interface OverrideFormData {
  is_fully_booked: boolean
  is_cancelled: boolean
  cancel_reason: string
}

interface SessionFormData {
  user_id: string
  user_package_id: string
  attendance: Attendance
  notes: string
}

const emptySessionForm: SessionFormData = {
  user_id: "",
  user_package_id: "",
  attendance: "attended",
  notes: "",
}

// ─────────────────────────────────────────────────────────────────────────────

const ClassDetail = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Toast sub-line describing what a cancel/delete/un-cancel did to client
  // balances. Returns undefined when nothing moved, so the toast stays clean
  // for the common case (a class nobody had booked yet).
  const refundDescription = useCallback((refunded: number, restored: number) => {
    if (refunded > 0) return t("schedule.sessionsRefunded", { count: refunded })
    if (restored > 0) return t("schedule.sessionsRestored", { count: restored })
    return undefined
  }, [t])

  const { slotId: slotIdParam, classDate } = useParams<{ slotId: string; classDate: string }>()
  const slotId = Number(slotIdParam)

  // Validation: bail out early if the URL params are obviously malformed —
  // the API will 400 anyway, but a friendly redirect is nicer.
  const paramsValid = !!slotId && !!classDate && /^\d{4}-\d{2}-\d{2}$/.test(classDate)

  const { data, loading, error, refetch } = useClassDetail(
    paramsValid ? slotId : 0,
    paramsValid ? classDate! : "",
  )

  // Class picker options for the edit dialog. Only active classes are offered
  // for edits — retired classes stay valid on the currently-loaded slot but
  // shouldn't be a new choice.
  const { classTypes, loading: classTypesLoading } = useClassTypes()
  const activeClassTypes = classTypes.filter((c) => c.is_active)

  // Inlined slot/override mutations — we don't pull useSchedule here because
  // it would fire an extra week-of-slots fetch on mount that we'd never read.
  const updateSlot = useCallback(async (id: number, body: Record<string, unknown>) => {
    const res = await apiFetch(`/schedule/${id}`, { method: "PUT", body: JSON.stringify(body) })
    await throwIfNotOk(res, "Failed to update slot")
  }, [])
  // Cancelling or deleting a class refunds every client booked into it (and
  // un-cancelling puts those sessions back). The API reports how many were
  // affected so we can tell staff rather than moving balances silently.
  const deleteSlot = useCallback(async (id: number): Promise<{ refunded: number }> => {
    const res = await apiFetch(`/schedule/${id}`, { method: "DELETE" })
    await throwIfNotOk(res, "Failed to delete slot")
    return res.json()
  }, [])
  const upsertOverride = useCallback(async (
    slotId: number,
    payload: UpsertOverridePayload,
  ): Promise<{ refunded: number; restored: number }> => {
    const res = await apiFetch(`/schedule/${slotId}/override`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    await throwIfNotOk(res, "Failed to update override")
    return res.json()
  }, [])
  const clearOverride = useCallback(async (
    slotId: number,
    week: string,
  ): Promise<{ restored: number }> => {
    const res = await apiFetch(`/schedule/${slotId}/override?week=${week}`, { method: "DELETE" })
    // 404 = no override existed → treat as success (idempotent clear)
    if (res.status === 404) return { restored: 0 }
    await throwIfNotOk(res, "Failed to clear override")
    return res.json()
  }, [])

  // Tutors for the edit dialog dropdown. Fetched once on mount.
  const [tutors, setTutors] = useState<Tutor[]>([])
  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const res = await apiFetch("/tutors")
        if (res.ok) setTutors(await res.json())
      } catch {
        // Non-critical
      }
    }
    fetchTutors()
  }, [])

  // ── Edit slot dialog state ──
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [slotForm, setSlotForm] = useState<SlotFormData>({
    day_of_week: "0",
    start_time: "10:00",
    end_time: "12:00",
    tutor_id: "none",
    class_type_id: "",
    capacity: "",
  })
  const [overrideForm, setOverrideForm] = useState<OverrideFormData>({
    is_fully_booked: false,
    is_cancelled: false,
    cancel_reason: "",
  })
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [savingOverride, setSavingOverride] = useState(false)
  const [confirmTemplateOpen, setConfirmTemplateOpen] = useState(false)
  const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false)
  const [confirmClearOverrideOpen, setConfirmClearOverrideOpen] = useState(false)

  // ── Delete slot dialog state ──
  const [isDeleteSlotOpen, setIsDeleteSlotOpen] = useState(false)
  const [deletingSlot, setDeletingSlot] = useState(false)

  // ── Create-session dialog state ──
  const [isSessionOpen, setIsSessionOpen] = useState(false)
  const [sessionForm, setSessionForm] = useState<SessionFormData>(emptySessionForm)
  const [savingSession, setSavingSession] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userSubscriptions, setUserSubscriptions] = useState<UserPackage[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)

  // ── Session delete state (per-card) ──
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<Session | null>(null)
  const [deletingSession, setDeletingSession] = useState(false)

  // Seed the edit forms from the loaded slot whenever it arrives or refetches —
  // this guarantees the dialog opens with the latest state.
  const seedEditForms = useCallback((slot: ScheduleSlot) => {
    setSlotForm({
      day_of_week: String(slot.day_of_week),
      start_time: formatTime(slot.start_time),
      end_time: formatTime(slot.end_time),
      tutor_id: slot.tutor_id != null ? String(slot.tutor_id) : "none",
      class_type_id: slot.class_type_id != null ? String(slot.class_type_id) : "",
      capacity: slot.capacity != null ? String(slot.capacity) : "",
    })
    setOverrideForm({
      is_fully_booked: slot.is_fully_booked,
      is_cancelled: slot.is_cancelled,
      cancel_reason: slot.cancel_reason ?? "",
    })
  }, [])

  const openEdit = useCallback(() => {
    if (!data) return
    seedEditForms(data.slot)
    setIsEditOpen(true)
  }, [data, seedEditForms])

  // ── Save handlers ──

  const handleSaveTemplate = async () => {
    if (!data) return
    setSavingTemplate(true)
    try {
      const body: Record<string, unknown> = {
        day_of_week: Number(slotForm.day_of_week),
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
        tutor_id: slotForm.tutor_id && slotForm.tutor_id !== "none" ? Number(slotForm.tutor_id) : null,
        class_type_id: Number(slotForm.class_type_id),
        capacity: slotForm.capacity.trim() === "" ? null : Number(slotForm.capacity),
      }
      await updateSlot(data.slot.id, body)
      toast.success(t("schedule.updateSuccess"))
      setIsEditOpen(false)
      setConfirmTemplateOpen(false)
      refetch()
    } catch (err) {
      if (err instanceof ApiError && (err.code === "SCHEDULE_CONFLICT" || err.status === 409)) {
        toast.error(t("schedule.conflictError"))
      } else {
        toast.error(friendlyError(err, "schedule.operationFailed"))
      }
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleSaveOverride = async () => {
    if (!data) return
    setSavingOverride(true)
    try {
      const { refunded, restored } = await upsertOverride(data.slot.id, {
        week_start: data.slot.week_start,
        is_fully_booked: overrideForm.is_fully_booked,
        is_cancelled: overrideForm.is_cancelled,
        cancel_reason: overrideForm.cancel_reason.trim() || null,
      })
      const wasCleared = !overrideForm.is_fully_booked && !overrideForm.is_cancelled
      toast.success(wasCleared ? t("schedule.overrideCleared") : t("schedule.overrideSaved"), {
        description: refundDescription(refunded, restored),
      })
      setIsEditOpen(false)
      setConfirmOverrideOpen(false)
      refetch()
    } catch (err) {
      toast.error(friendlyError(err, "schedule.overrideFailed"))
    } finally {
      setSavingOverride(false)
    }
  }

  const handleClearOverride = async () => {
    if (!data) return
    setSavingOverride(true)
    try {
      const { restored } = await clearOverride(data.slot.id, data.slot.week_start)
      toast.success(t("schedule.overrideCleared"), {
        description: refundDescription(0, restored),
      })
      setIsEditOpen(false)
      setConfirmClearOverrideOpen(false)
      refetch()
    } catch (err) {
      toast.error(friendlyError(err, "schedule.overrideFailed"))
    } finally {
      setSavingOverride(false)
    }
  }

  const handleDeleteSlot = async () => {
    if (!data) return
    setDeletingSlot(true)
    try {
      const { refunded } = await deleteSlot(data.slot.id)
      toast.success(t("schedule.deleteSuccess"), {
        description: refundDescription(refunded, 0),
      })
      setIsDeleteSlotOpen(false)
      // Slot is gone — bounce back to the weekly schedule.
      navigate("/schedule")
    } catch (err) {
      toast.error(friendlyError(err, "schedule.deleteFailed"))
    } finally {
      setDeletingSlot(false)
    }
  }

  // ── Create-session handlers ──

  const openCreateSession = () => {
    setSessionForm(emptySessionForm)
    setUserSubscriptions([])
    setIsSessionOpen(true)
  }

  // Lazy-load users when the session dialog opens — soft-deleted users hidden
  // from the picker the same way other pages do it.
  useEffect(() => {
    if (!isSessionOpen) return
    let cancelled = false
    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const res = await apiFetch("/users")
        if (!res.ok) throw new Error()
        const json: User[] = await res.json()
        if (!cancelled) setUsers(json.filter(u => u.is_active))
      } catch {
        if (!cancelled) setUsers([])
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    }
    fetchUsers()
    return () => { cancelled = true }
  }, [isSessionOpen])

  // Refresh the subscription list whenever the selected client changes.
  useEffect(() => {
    if (!sessionForm.user_id) {
      setUserSubscriptions([])
      return
    }
    let cancelled = false
    const fetchSubs = async () => {
      setLoadingSubs(true)
      try {
        const res = await apiFetch(`/user-packages?user_id=${sessionForm.user_id}`)
        if (!res.ok) throw new Error()
        const json: UserPackage[] = await res.json()
        if (!cancelled) setUserSubscriptions(json.filter(s => s.status === "active"))
      } catch {
        if (!cancelled) setUserSubscriptions([])
      } finally {
        if (!cancelled) setLoadingSubs(false)
      }
    }
    fetchSubs()
    return () => { cancelled = true }
  }, [sessionForm.user_id])

  const handleCreateSession = async () => {
    if (!data) return
    setSavingSession(true)
    try {
      const res = await apiFetch("/sessions", {
        method: "POST",
        body: JSON.stringify({
          user_package_id: Number(sessionForm.user_package_id),
          schedule_slot_id: data.slot.id,
          class_date: data.class_date,
          attendance: sessionForm.attendance,
          notes: sessionForm.notes || undefined,
        }),
      })
      await throwIfNotOk(res, "Failed to create session")
      toast.success(t("sessions.createSuccess"))
      setIsSessionOpen(false)
      refetch()
    } catch (err) {
      toast.error(friendlyError(err, "sessions.operationFailed"))
    } finally {
      setSavingSession(false)
    }
  }

  const sessionFormValid =
    sessionForm.user_id && sessionForm.user_package_id && sessionForm.attendance

  // ── Per-session delete ──
  const handleDeleteSession = async () => {
    if (!deleteSessionTarget) return
    setDeletingSession(true)
    try {
      const res = await apiFetch(`/sessions/${deleteSessionTarget.id}`, { method: "DELETE" })
      await throwIfNotOk(res, "Failed to delete session")
      toast.success(t("sessions.deleteSuccess"))
      setDeleteSessionTarget(null)
      refetch()
    } catch (err) {
      toast.error(friendlyError(err, "sessions.deleteFailed"))
    } finally {
      setDeletingSession(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  // Bad URL → punt back to schedule rather than show a broken page
  if (!paramsValid) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/schedule")}>
          <ArrowLeft className="me-1 h-4 w-4" /> {t("schedule.backToSchedule")}
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-destructive gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm font-medium">{t("schedule.invalidClassUrl")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/schedule")}>
          <ArrowLeft className="me-1 h-4 w-4" /> {t("schedule.backToSchedule")}
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-destructive gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm font-medium">{error ?? t("schedule.classNotFound")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { slot, sessions } = data
  const className = slot.class_type_name ? titleCase(slot.class_type_name) : t("schedule.noPackage")
  const capacityLabel = slot.capacity != null
    ? `${slot.attending_count} / ${slot.capacity}`
    : `${slot.attending_count}`

  return (
    <div className="space-y-6">
      {/* ── Back link ── */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/schedule")} className="-ms-2">
        <ArrowLeft className="me-1 h-4 w-4" /> {t("schedule.backToSchedule")}
      </Button>

      {/* ── Header ── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-2 min-w-0">
            <CardTitle className="text-2xl">{className}</CardTitle>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{formatClassDate(data.class_date)}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
              </span>
              <span className="inline-flex items-center gap-1">
                <UserIcon className="h-3.5 w-3.5" />
                {slot.tutor_name ?? t("schedule.noTutor")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {capacityLabel} {t("schedule.attending")}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={openEdit}>
              <Pencil className="me-1 h-4 w-4" />
              {t("schedule.editClass")}
            </Button>
            <Button onClick={openCreateSession} disabled={slot.is_cancelled}>
              <CalendarPlus className="me-1 h-4 w-4" />
              {t("schedule.createSessionAction")}
            </Button>
          </div>
        </CardHeader>

        {/* Cancellation banner — overrides the whole class for THIS week. */}
        {slot.is_cancelled && (
          <CardContent className="pt-0">
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-destructive inline-flex items-center gap-1.5">
                <Ban className="h-4 w-4" /> {t("schedule.classCancelledBanner")}
              </p>
              {slot.cancel_reason && (
                <p className="mt-1 text-muted-foreground">{slot.cancel_reason}</p>
              )}
            </div>
          </CardContent>
        )}
        {!slot.is_cancelled && slot.is_fully_booked && (
          <CardContent className="pt-0">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-500">{t("schedule.fullyBookedBanner")}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Sessions grid ── */}
      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="rounded-full bg-muted p-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium">{t("schedule.noSessionsYet")}</p>
            <p className="text-sm text-muted-foreground">{t("schedule.noSessionsYetHint")}</p>
            <Button onClick={openCreateSession} className="mt-2" disabled={slot.is_cancelled}>
              <CalendarPlus className="me-1 h-4 w-4" />
              {t("schedule.createSessionAction")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessions.map((s) => (
            <Card key={s.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <Link
                    to={`/users/${s.user_id}`}
                    className="font-medium hover:underline truncate block"
                  >
                    {s.user_name}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.package_name} · {t("sessions.sessionNb")}{s.session_nb}
                  </p>
                  {s.notes && (
                    <p className="text-xs text-muted-foreground truncate">{s.notes}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="outline" className={attendanceBadgeClass[s.attendance]}>
                    {t(`sessions.${s.attendance === "cancelled - no charge" ? "cancelledNoCharge" : s.attendance}`)}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/users/${s.user_id}`)}>
                        <UserIcon className="me-2 h-4 w-4" />
                        {t("schedule.viewClient")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteSessionTarget(s)}
                      >
                        <Trash2 className="me-2 h-4 w-4" />
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Edit Slot Dialog (template + override + delete) ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("schedule.editSlot")}</DialogTitle>
            <DialogDescription>{t("schedule.description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* === Recurring template section === */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold">{t("schedule.templateSection")}</h4>
                <p className="text-xs text-muted-foreground">{t("schedule.templateHint")}</p>
              </div>

              <div className="grid gap-2">
                <Label>{t("schedule.classType")}</Label>
                <Select
                  value={slotForm.class_type_id}
                  onValueChange={val => setSlotForm(p => ({ ...p, class_type_id: val }))}
                  disabled={classTypesLoading}
                >
                  <SelectTrigger><SelectValue placeholder={t("schedule.classTypePlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {activeClassTypes.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>{t("schedule.dayOfWeek")}</Label>
                <Select value={slotForm.day_of_week} onValueChange={val => setSlotForm(p => ({ ...p, day_of_week: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_KEYS.map((key, i) => (
                      <SelectItem key={i} value={String(i)}>{t(`schedule.${key}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t("schedule.startTime")}</Label>
                  <Input type="time" value={slotForm.start_time}
                    onChange={e => setSlotForm(p => ({ ...p, start_time: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>{t("schedule.endTime")}</Label>
                  <Input type="time" value={slotForm.end_time}
                    onChange={e => setSlotForm(p => ({ ...p, end_time: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>{t("schedule.tutor")}</Label>
                <Select value={slotForm.tutor_id} onValueChange={val => setSlotForm(p => ({ ...p, tutor_id: val }))}>
                  <SelectTrigger><SelectValue placeholder={t("schedule.noTutor")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("schedule.noTutor")}</SelectItem>
                    {tutors.map(tutor => (
                      <SelectItem key={tutor.id} value={String(tutor.id)}>{tutor.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Capacity — informational headcount cap. Optional; empty = no cap. */}
              <div className="grid gap-2">
                <Label>{t("schedule.capacity")}</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder={t("schedule.capacityPlaceholder")}
                  value={slotForm.capacity}
                  onChange={e => setSlotForm(p => ({ ...p, capacity: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">{t("schedule.capacityHint")}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="destructive" onClick={() => setIsDeleteSlotOpen(true)} disabled={savingTemplate}>
                  {t("schedule.deleteSlot")}
                </Button>
                <Button
                  onClick={() => setConfirmTemplateOpen(true)}
                  disabled={!slotForm.class_type_id || savingTemplate}
                >
                  {savingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("common.save")}
                </Button>
              </div>
            </div>

            <Separator />

            {/* === This-week-only override section === */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold">{t("schedule.overrideTitle")}</h4>
                <p className="text-xs text-muted-foreground">{t("schedule.overrideHint")}</p>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <Label className="text-sm">{t("schedule.fullyBookedForWeek")}</Label>
                <Switch
                  checked={overrideForm.is_fully_booked}
                  onCheckedChange={val => setOverrideForm(p => ({ ...p, is_fully_booked: val }))}
                />
              </div>

              {/* Cancelling moves client balances, so the consequence is stated
                  inline on the toggle rather than only after the fact. */}
              <div className="rounded-md border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t("schedule.cancelForWeek")}</Label>
                  <Switch
                    checked={overrideForm.is_cancelled}
                    onCheckedChange={val => setOverrideForm(p => ({ ...p, is_cancelled: val }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("schedule.cancelRefundHint")}</p>
              </div>

              {overrideForm.is_cancelled && (
                <div className="grid gap-2">
                  <Label>{t("schedule.cancelReason")}</Label>
                  <Textarea
                    rows={2}
                    placeholder={t("schedule.cancelReasonPlaceholder")}
                    value={overrideForm.cancel_reason}
                    onChange={e => setOverrideForm(p => ({ ...p, cancel_reason: e.target.value }))}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {slot.override_id != null && (
                  <Button variant="outline" onClick={() => setConfirmClearOverrideOpen(true)} disabled={savingOverride}>
                    {t("schedule.clearOverride")}
                  </Button>
                )}
                <Button onClick={() => setConfirmOverrideOpen(true)} disabled={savingOverride}>
                  {savingOverride && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("common.save")}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={savingTemplate || savingOverride}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm dialogs ── */}
      <ConfirmDialog
        open={confirmTemplateOpen}
        onOpenChange={setConfirmTemplateOpen}
        title={t("common.confirmSaveTitle")}
        description={t("common.confirmSaveDescription")}
        loading={savingTemplate}
        onConfirm={handleSaveTemplate}
      />
      <ConfirmDialog
        open={confirmOverrideOpen}
        onOpenChange={setConfirmOverrideOpen}
        title={t("common.confirmSaveTitle")}
        description={t("common.confirmSaveDescription")}
        loading={savingOverride}
        onConfirm={handleSaveOverride}
      />
      <ConfirmDialog
        open={confirmClearOverrideOpen}
        onOpenChange={setConfirmClearOverrideOpen}
        title={t("common.confirmSaveTitle")}
        description={t("common.confirmSaveDescription")}
        loading={savingOverride}
        variant="destructive"
        onConfirm={handleClearOverride}
      />

      {/* ── Delete slot confirmation ── */}
      <Dialog open={isDeleteSlotOpen} onOpenChange={setIsDeleteSlotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("schedule.deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("schedule.deleteWarning")}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {className} — {t(`schedule.${DAY_KEYS[slot.day_of_week]}`)} {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteSlotOpen(false)} disabled={deletingSlot}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteSlot} disabled={deletingSlot}>
              {deletingSlot && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create-session dialog (pre-filled with this slot + date) ── */}
      <Dialog open={isSessionOpen} onOpenChange={setIsSessionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("schedule.createSessionTitle")}</DialogTitle>
            <DialogDescription>{t("schedule.createSessionDescription")}</DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/40 p-3 space-y-1">
            <p className="text-sm font-semibold">{className}</p>
            <p className="text-xs text-muted-foreground">
              {formatClassDate(data.class_date)} · {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
            </p>
          </div>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("sessions.client")}</Label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("common.loading", "Loading…")}
                </div>
              ) : (
                <UserCombobox
                  users={users}
                  value={sessionForm.user_id}
                  onValueChange={v => setSessionForm(p => ({ ...p, user_id: v, user_package_id: "" }))}
                  placeholder={t("sessions.selectClient")}
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label>{t("sessions.subscription")}</Label>
              {loadingSubs ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("common.loading", "Loading…")}
                </div>
              ) : !sessionForm.user_id ? (
                <p className="text-sm text-muted-foreground py-1">{t("sessions.selectClient")}</p>
              ) : userSubscriptions.length === 0 ? (
                <p className="text-sm text-destructive py-1">{t("sessions.noActiveSubscriptions")}</p>
              ) : (
                <Select
                  value={sessionForm.user_package_id}
                  onValueChange={v => setSessionForm(p => ({ ...p, user_package_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder={t("sessions.selectSubscription")} /></SelectTrigger>
                  <SelectContent>
                    {userSubscriptions.map(sub => (
                      <SelectItem key={sub.id} value={String(sub.id)}>
                        {sub.package_name} — {sub.remaining_sessions} sessions, {sub.remaining_weight} kg
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <Label>{t("sessions.attendance")}</Label>
              <Select
                value={sessionForm.attendance}
                onValueChange={v => setSessionForm(p => ({ ...p, attendance: v as Attendance }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attended">{t("sessions.attended")}</SelectItem>
                  <SelectItem value="booked">{t("sessions.booked")}</SelectItem>
                  <SelectItem value="cancelled">{t("sessions.cancelled")}</SelectItem>
                  <SelectItem value="cancelled - no charge">{t("sessions.cancelledNoCharge")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t("sessions.notes")}</Label>
              <Textarea
                value={sessionForm.notes}
                onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))}
                placeholder={t("sessions.notesPlaceholder")}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSessionOpen(false)} disabled={savingSession}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateSession} disabled={!sessionFormValid || savingSession}>
              {savingSession && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete session confirmation ── */}
      <Dialog open={!!deleteSessionTarget} onOpenChange={(open) => !open && setDeleteSessionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sessions.deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("sessions.deleteWarning")}</DialogDescription>
          </DialogHeader>
          {deleteSessionTarget && (
            <p className="text-sm text-muted-foreground">
              {deleteSessionTarget.user_name} — {deleteSessionTarget.package_name}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSessionTarget(null)} disabled={deletingSession}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteSession} disabled={deletingSession}>
              {deletingSession && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ClassDetail
