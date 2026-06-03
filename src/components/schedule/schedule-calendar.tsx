import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Plus, Loader2, AlertCircle, CalendarX, ChevronLeft, ChevronRight, Ban,
  Pencil, CalendarPlus,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useSchedule, getBeirutWeekStart, addDays } from "@/hooks/use-schedule"
import { apiFetch } from "@/lib/api"
import { friendlyError, throwIfNotOk, ApiError } from "@/lib/errors"
import ConfirmDialog from "@/components/ui/confirm-dialog"
import UserCombobox from "@/components/ui/user-combobox"
import type { ScheduleSlot, Tutor, User, UserPackage, Attendance } from "@/types"

// Static class type options for the schedule — must match DB enum values exactly
const CLASS_TYPES = [
  "hand building explorer",
  "hand building mastery",
  "wheel throwing explorer",
  "open studio 1h",
  "open studio 2h",
  "open studio 3h",
  "open studio membership",
] as const

function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

// --- Layout constants ---
const HOUR_HEIGHT = 64
const START_HOUR = 9
const END_HOUR = 21
const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const
const DAY_SHORT_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const

// --- Form types ---

// Template-level form (recurring class settings — applies forever)
interface SlotFormData {
  day_of_week: string
  start_time: string
  end_time: string
  tutor_id: string    // "" = no tutor
  package: string     // "" = no package
}

// Override form (this-week-only settings)
interface OverrideFormData {
  is_fully_booked: boolean
  is_cancelled: boolean
  cancel_reason: string
}

// Session form — used by the "Create session from class" dialog. The class
// link (schedule_slot_id + class_date) is pre-filled from the clicked slot and
// rendered as a read-only banner, so only client/sub/attendance/notes are
// editable here. Fields stored as strings to match the broader form-state
// pattern used across the app.
interface SessionFormData {
  user_id: string
  user_package_id: string
  attendance: Attendance
  notes: string
}

const emptySlotForm: SlotFormData = {
  day_of_week: "0",
  start_time: "10:00",
  end_time: "12:00",
  tutor_id: "none",
  package: "none",
}

const emptyOverrideForm: OverrideFormData = {
  is_fully_booked: false,
  is_cancelled: false,
  cancel_reason: "",
}

const emptySessionForm: SessionFormData = {
  user_id: "",
  user_package_id: "",
  attendance: "attended",
  notes: "",
}

// --- Helpers ---

function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number)
  return { hours: h, minutes: m }
}

function formatTime(time: string): string {
  const { hours: h, minutes: m } = parseTime(time)
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

// Format YYYY-MM-DD as a friendly week range header, e.g. "May 25 – 31"
function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
  return `${fmt(start)} – ${fmt(end)}`
}

function getSlotPosition(slot: ScheduleSlot) {
  const start = parseTime(slot.start_time)
  const end = parseTime(slot.end_time)
  const startMinutes = (start.hours - START_HOUR) * 60 + start.minutes
  const endMinutes = (end.hours - START_HOUR) * 60 + end.minutes
  const duration = endMinutes - startMinutes
  return {
    top: (startMinutes / 60) * HOUR_HEIGHT,
    height: (duration / 60) * HOUR_HEIGHT,
  }
}

// === Main Component ===

const ScheduleCalendar = () => {
  const { t } = useTranslation()
  const {
    slots, loading, error, weekStart, refetch,
    goToPreviousWeek, goToNextWeek, goToCurrentWeek,
    createSlot, updateSlot, deleteSlot,
    upsertOverride, clearOverride,
  } = useSchedule()

  // Tutors fetched inline (no dedicated hook for this small lookup)
  const [tutors, setTutors] = useState<Tutor[]>([])
  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const res = await apiFetch("/tutors")
        if (res.ok) setTutors(await res.json())
      } catch {
        // Non-critical — dropdown will just be empty
      }
    }
    fetchTutors()
  }, [])

  // --- Dialog state ---
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScheduleSlot | null>(null)
  const [slotForm, setSlotForm] = useState<SlotFormData>(emptySlotForm)
  const [overrideForm, setOverrideForm] = useState<OverrideFormData>(emptyOverrideForm)
  const [saving, setSaving] = useState(false)
  const [savingOverride, setSavingOverride] = useState(false)
  // Save confirms — only fire when editing an existing slot/override (create flows save direct)
  const [confirmTemplateOpen, setConfirmTemplateOpen] = useState(false)
  const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false)
  const [confirmClearOverrideOpen, setConfirmClearOverrideOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // --- Slot action popover state ---
  // Controlled — only one slot's action menu can be open at a time. Stores the
  // slot id rather than the slot itself so we don't have to mutate a separate
  // "selected" pointer when refetch swaps the slot array.
  const [actionOpenId, setActionOpenId] = useState<number | null>(null)

  // --- Create-session-from-class dialog state ---
  const [isSessionOpen, setIsSessionOpen] = useState(false)
  // The slot the dialog is acting on — drives the read-only class banner +
  // the schedule_slot_id/class_date submitted with the session.
  const [sessionSlot, setSessionSlot] = useState<ScheduleSlot | null>(null)
  const [sessionForm, setSessionForm] = useState<SessionFormData>(emptySessionForm)
  const [savingSession, setSavingSession] = useState(false)
  // Users + active subscriptions are fetched lazily — only when the dialog
  // opens — so the schedule page itself doesn't pay for them on every load.
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userSubscriptions, setUserSubscriptions] = useState<UserPackage[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)

  // Group slots by day_of_week for quick lookup
  const slotsByDay = useMemo(() => {
    const map = new Map<number, ScheduleSlot[]>()
    for (let d = 0; d < 7; d++) map.set(d, [])
    for (const slot of slots) {
      map.get(slot.day_of_week)?.push(slot)
    }
    return map
  }, [slots])

  // --- CRUD handlers ---

  const openCreate = useCallback(() => {
    setEditingSlot(null)
    setSlotForm(emptySlotForm)
    setOverrideForm(emptyOverrideForm)
    setIsFormOpen(true)
  }, [])

  const openEdit = useCallback((slot: ScheduleSlot) => {
    setEditingSlot(slot)
    setSlotForm({
      day_of_week: String(slot.day_of_week),
      start_time: formatTime(slot.start_time),
      end_time: formatTime(slot.end_time),
      tutor_id: slot.tutor_id != null ? String(slot.tutor_id) : "none",
      package: slot.package ?? "none",
    })
    // Seed the override form from the current effective values (which include
    // the existing override, if any). Saving with no changes will be a no-op.
    setOverrideForm({
      is_fully_booked: slot.is_fully_booked,
      is_cancelled: slot.is_cancelled,
      cancel_reason: slot.cancel_reason ?? "",
    })
    setIsFormOpen(true)
  }, [])

  const handleSaveTemplate = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        day_of_week: Number(slotForm.day_of_week),
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
        tutor_id: slotForm.tutor_id && slotForm.tutor_id !== "none" ? Number(slotForm.tutor_id) : null,
        package: slotForm.package && slotForm.package !== "none" ? slotForm.package : null,
      }
      if (editingSlot) {
        await updateSlot(editingSlot.id, body)
        toast.success(t("schedule.updateSuccess"))
      } else {
        await createSlot(body)
        toast.success(t("schedule.createSuccess"))
      }
      setIsFormOpen(false)
      setConfirmTemplateOpen(false)
      refetch()
    } catch (err) {
      // Schedule conflicts have a dedicated code from the backend (SCHEDULE_CONFLICT, status 409).
      // Anything else goes through the generic friendlyError mapping.
      if (err instanceof ApiError && (err.code === "SCHEDULE_CONFLICT" || err.status === 409)) {
        toast.error(t("schedule.conflictError"))
      } else {
        toast.error(friendlyError(err, "schedule.operationFailed"))
      }
    } finally {
      setSaving(false)
    }
  }

  // Save the per-week override. Service decides whether to write or clear
  // based on whether either flag ended up true.
  const handleSaveOverride = async () => {
    if (!editingSlot) return
    setSavingOverride(true)
    try {
      await upsertOverride(editingSlot.id, {
        week_start: weekStart,
        is_fully_booked: overrideForm.is_fully_booked,
        is_cancelled: overrideForm.is_cancelled,
        cancel_reason: overrideForm.cancel_reason.trim() || null,
      })
      const wasCleared = !overrideForm.is_fully_booked && !overrideForm.is_cancelled
      toast.success(wasCleared ? t("schedule.overrideCleared") : t("schedule.overrideSaved"))
      setIsFormOpen(false)
      setConfirmOverrideOpen(false)
      refetch()
    } catch (err) {
      toast.error(friendlyError(err, "schedule.overrideFailed"))
    } finally {
      setSavingOverride(false)
    }
  }

  // Explicit clear button — wipes the override row entirely.
  const handleClearOverride = async () => {
    if (!editingSlot) return
    setSavingOverride(true)
    try {
      await clearOverride(editingSlot.id, weekStart)
      toast.success(t("schedule.overrideCleared"))
      setIsFormOpen(false)
      setConfirmClearOverrideOpen(false)
      refetch()
    } catch (err) {
      toast.error(friendlyError(err, "schedule.overrideFailed"))
    } finally {
      setSavingOverride(false)
    }
  }

  // --- Create-session-from-class handlers ---

  // Compute the actual calendar date a recurring slot lands on for the week
  // currently being viewed. weekStart is always a Monday, day_of_week is 0=Mon.
  const slotClassDate = useCallback(
    (slot: ScheduleSlot) => addDays(weekStart, slot.day_of_week),
    [weekStart],
  )

  // Open the create-session dialog seeded from a slot. Closes the action menu
  // first so the popover doesn't visually overlap the dialog opening.
  const openCreateSession = useCallback((slot: ScheduleSlot) => {
    setActionOpenId(null)
    setSessionSlot(slot)
    setSessionForm(emptySessionForm)
    setUserSubscriptions([])
    setIsSessionOpen(true)
  }, [])

  // Lazy-load users when the session dialog opens. The list is small enough
  // for a single fetch; refetching on every open keeps soft-deleted users
  // out of the picker without a refresh.
  useEffect(() => {
    if (!isSessionOpen) return
    let cancelled = false
    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const res = await apiFetch("/users")
        if (!res.ok) throw new Error()
        const data: User[] = await res.json()
        // Mirror the rest of the app: hide soft-deleted users from pickers.
        if (!cancelled) setUsers(data.filter(u => u.is_active))
      } catch {
        if (!cancelled) setUsers([])
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    }
    fetchUsers()
    return () => { cancelled = true }
  }, [isSessionOpen])

  // When the client changes inside the dialog, refetch their active subs.
  // Same pattern as sessions-table.tsx — keeps the subscription picker in
  // sync without forcing the whole user list to carry sub data.
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
        const data: UserPackage[] = await res.json()
        if (!cancelled) setUserSubscriptions(data.filter(s => s.status === "active"))
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
    if (!sessionSlot) return
    setSavingSession(true)
    try {
      const res = await apiFetch("/sessions", {
        method: "POST",
        body: JSON.stringify({
          user_package_id: Number(sessionForm.user_package_id),
          schedule_slot_id: sessionSlot.id,
          class_date: slotClassDate(sessionSlot),
          attendance: sessionForm.attendance,
          notes: sessionForm.notes || undefined,
        }),
      })
      await throwIfNotOk(res, "Failed to create session")
      toast.success(t("sessions.createSuccess"))
      setIsSessionOpen(false)
    } catch (err) {
      toast.error(friendlyError(err, "sessions.operationFailed"))
    } finally {
      setSavingSession(false)
    }
  }

  const sessionValid =
    sessionForm.user_id && sessionForm.user_package_id && sessionForm.attendance

  // --- Existing handlers ---

  const confirmDelete = (slot: ScheduleSlot) => {
    setDeleteTarget(slot)
    setIsDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteSlot(deleteTarget.id)
      setIsDeleteOpen(false)
      setDeleteTarget(null)
      if (editingSlot?.id === deleteTarget.id) setIsFormOpen(false)
      refetch()
      toast.success(t("schedule.deleteSuccess"))
    } catch (err) {
      toast.error(friendlyError(err, "schedule.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-destructive gap-2">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // Highlight current-week vs. historical/future for the "This week" jump button
  const isCurrentWeek = weekStart === getBeirutWeekStart()

  return (
    <>
      {/* Page header + week navigator */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("schedule.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("schedule.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Week navigator — prev / this-week / next */}
          <div className="flex items-center rounded-md border bg-card">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek} aria-label={t("schedule.previousWeek")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 text-sm tabular-nums min-w-[10rem] text-center">
              <div className="text-xs text-muted-foreground">{t("schedule.weekOf")}</div>
              <div className="font-medium">{formatWeekRange(weekStart)}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label={t("schedule.nextWeek")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              {t("schedule.thisWeek")}
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="me-1 h-4 w-4" />
            {t("schedule.addSlot")}
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      {slots.length === 0 ? (
        <Card className="border-dashed mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="rounded-full bg-muted p-4">
              <CalendarX className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">{t("schedule.noSessions")}</p>
            </div>
            <Button onClick={openCreate} className="mt-2">
              <Plus className="me-1 h-4 w-4" />
              {t("schedule.addSlot")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b sticky top-0 z-10 bg-background">
                  <div className="p-3 border-e" />
                  {DAY_SHORT_KEYS.map((key, i) => (
                    <div key={key} className={`p-3 text-center ${i < 6 ? "border-e" : ""}`}>
                      <div className="text-xs font-medium text-muted-foreground">{t(`schedule.${key}`)}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[4rem_repeat(7,1fr)]">
                  <div className="border-e">
                    {hours.map(hour => (
                      <div key={hour} className="border-b flex items-start justify-end pe-2 pt-1"
                        style={{ height: `${HOUR_HEIGHT}px` }}>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {hour.toString().padStart(2, "0")}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {DAY_SHORT_KEYS.map((_, dayIdx) => (
                    <div key={dayIdx} className={`relative ${dayIdx < 6 ? "border-e" : ""}`}>
                      {hours.map(hour => (
                        <div key={hour} className="border-b" style={{ height: `${HOUR_HEIGHT}px` }} />
                      ))}

                      {(slotsByDay.get(dayIdx) ?? []).map(slot => {
                        const { top, height } = getSlotPosition(slot)

                        // Visual treatment cascades: cancelled > fully-booked > normal.
                        // Cancelled wins because it's the strongest "not happening" signal.
                        let cardClasses: string
                        if (slot.is_cancelled) {
                          cardClasses = "bg-muted border-muted-foreground/30 text-muted-foreground line-through opacity-70"
                        } else if (slot.is_fully_booked) {
                          cardClasses = "bg-destructive/15 border-destructive/40 text-destructive"
                        } else {
                          cardClasses = "bg-primary/15 border-primary/40 text-primary"
                        }

                        // Controlled Popover keyed on slot.id — clicking the card
                        // opens the action menu; picking an action closes it.
                        return (
                          <Popover
                            key={slot.id}
                            open={actionOpenId === slot.id}
                            onOpenChange={(o) => setActionOpenId(o ? slot.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <div
                                className={`absolute inset-x-1 z-10 rounded-md border p-1.5 overflow-hidden cursor-pointer transition-opacity hover:opacity-90 ${cardClasses}`}
                                style={{ top: `${top}px`, height: `${height}px` }}
                                role="button"
                                tabIndex={0}
                              >
                                <p className="text-sm font-semibold truncate">
                                  {slot.package ? titleCase(slot.package) : t("schedule.noPackage")}
                                </p>
                                <p className="text-xs opacity-80 truncate">
                                  {slot.tutor_name ?? t("schedule.noTutor")}
                                </p>
                                <p className="text-xs opacity-60">
                                  {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                                </p>
                                {slot.is_cancelled && (
                                  <p className="text-[10px] font-bold uppercase tracking-wider mt-1 no-underline inline-flex items-center gap-1">
                                    <Ban className="h-3 w-3" /> {t("schedule.cancelledBadge")}
                                  </p>
                                )}
                                {!slot.is_cancelled && slot.is_fully_booked && (
                                  <p className="text-[10px] font-bold uppercase tracking-wider mt-1">
                                    {t("schedule.isFullyBooked")}
                                  </p>
                                )}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-1" align="start">
                              {/* Cancel reason surfaces here instead of a hover tooltip — keeps
                                  the click target unified and reachable on touch devices. */}
                              {slot.is_cancelled && slot.cancel_reason && (
                                <div className="rounded-sm bg-muted/50 px-2 py-1.5 mb-1 text-xs">
                                  <p className="font-semibold">{t("schedule.cancelledBadge")}</p>
                                  <p className="text-muted-foreground mt-0.5">{slot.cancel_reason}</p>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => { setActionOpenId(null); openEdit(slot) }}
                              >
                                <Pencil className="me-2 h-4 w-4" />
                                {t("schedule.editClass")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => openCreateSession(slot)}
                              >
                                <CalendarPlus className="me-2 h-4 w-4" />
                                {t("schedule.createSessionAction")}
                              </Button>
                            </PopoverContent>
                          </Popover>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ---- Create / Edit Dialog ---- */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? t("schedule.editSlot") : t("schedule.addSlot")}
            </DialogTitle>
            <DialogDescription>{t("schedule.description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* === Recurring template section === */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold">{t("schedule.templateSection")}</h4>
                <p className="text-xs text-muted-foreground">{t("schedule.templateHint")}</p>
              </div>

              {/* Class type */}
              <div className="grid gap-2">
                <Label>{t("schedule.package")}</Label>
                <Select value={slotForm.package} onValueChange={val => setSlotForm(p => ({ ...p, package: val }))}>
                  <SelectTrigger><SelectValue placeholder={t("schedule.noPackage")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("schedule.noPackage")}</SelectItem>
                    {CLASS_TYPES.map(ct => (
                      <SelectItem key={ct} value={ct}>{titleCase(ct)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Day */}
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

              {/* Times */}
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

              {/* Tutor */}
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

              <div className="flex justify-end gap-2 pt-2">
                {editingSlot && (
                  <Button variant="destructive" onClick={() => confirmDelete(editingSlot)} disabled={saving}>
                    {t("schedule.deleteSlot")}
                  </Button>
                )}
                <Button
                  onClick={editingSlot ? () => setConfirmTemplateOpen(true) : handleSaveTemplate}
                  disabled={!slotForm.package || slotForm.package === "none" || saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingSlot ? t("common.save") : t("common.create")}
                </Button>
              </div>
            </div>

            {/* === This-week-only overrides section (edit mode only) === */}
            {editingSlot && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold">{t("schedule.overrideTitle")}</h4>
                    <p className="text-xs text-muted-foreground">{t("schedule.overrideHint")}</p>
                    <p className="text-xs font-medium mt-1 text-foreground">
                      {t("schedule.weekOf")} {formatWeekRange(weekStart)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label className="text-sm">{t("schedule.fullyBookedForWeek")}</Label>
                    <Switch
                      checked={overrideForm.is_fully_booked}
                      onCheckedChange={val => setOverrideForm(p => ({ ...p, is_fully_booked: val }))}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label className="text-sm">{t("schedule.cancelForWeek")}</Label>
                    <Switch
                      checked={overrideForm.is_cancelled}
                      onCheckedChange={val => setOverrideForm(p => ({ ...p, is_cancelled: val }))}
                    />
                  </div>

                  {/* Reason field only useful when cancelling; show it conditionally */}
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
                    {editingSlot.override_id != null && (
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
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving || savingOverride}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Save Confirmation Dialogs ---- */}
      <ConfirmDialog
        open={confirmTemplateOpen}
        onOpenChange={setConfirmTemplateOpen}
        title={t("common.confirmSaveTitle")}
        description={t("common.confirmSaveDescription")}
        loading={saving}
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

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("schedule.deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("schedule.deleteWarning")}</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="text-sm text-muted-foreground">
              {deleteTarget.package ? titleCase(deleteTarget.package) : t("schedule.noPackage")} — {t(`schedule.${DAY_KEYS[deleteTarget.day_of_week]}`)} {formatTime(deleteTarget.start_time)}–{formatTime(deleteTarget.end_time)}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Create Session From Class Dialog ----
          Pre-filled with the slot's class link. Only client/sub/attendance/notes
          are editable — the class fields are shown read-only in a banner. */}
      <Dialog open={isSessionOpen} onOpenChange={setIsSessionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("schedule.createSessionTitle")}</DialogTitle>
            <DialogDescription>{t("schedule.createSessionDescription")}</DialogDescription>
          </DialogHeader>

          {sessionSlot && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-1">
              <p className="text-sm font-semibold">
                {sessionSlot.package ? titleCase(sessionSlot.package) : t("schedule.noPackage")}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(`${slotClassDate(sessionSlot)}T00:00:00Z`).toLocaleDateString("en", {
                  weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
                })}
                {" · "}
                {formatTime(sessionSlot.start_time)}–{formatTime(sessionSlot.end_time)}
              </p>
            </div>
          )}

          <div className="grid gap-4 py-2">
            {/* Client */}
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
                  onValueChange={(v) => setSessionForm(prev => ({ ...prev, user_id: v, user_package_id: "" }))}
                  placeholder={t("sessions.selectClient")}
                />
              )}
            </div>

            {/* Subscription */}
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
                  onValueChange={(v) => setSessionForm(prev => ({ ...prev, user_package_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("sessions.selectSubscription")} />
                  </SelectTrigger>
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

            {/* Attendance */}
            <div className="grid gap-2">
              <Label>{t("sessions.attendance")}</Label>
              <Select
                value={sessionForm.attendance}
                onValueChange={(v) => setSessionForm(prev => ({ ...prev, attendance: v as Attendance }))}
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

            {/* Notes */}
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
            <Button variant="outline" onClick={() => setIsSessionOpen(false)} disabled={savingSession}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateSession} disabled={!sessionValid || savingSession}>
              {savingSession && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ScheduleCalendar
