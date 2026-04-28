import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Plus, Loader2, AlertCircle, CalendarX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useSchedule } from "@/hooks/use-schedule"
import { apiFetch } from "@/lib/api"
import type { ScheduleSlot, Tutor } from "@/types"

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

/** Capitalize the first letter of each word for display */
function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

// --- Layout constants ---
const HOUR_HEIGHT = 64
const START_HOUR = 9
const END_HOUR = 21

const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

// day_of_week 0=Monday .. 6=Sunday
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const
const DAY_SHORT_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const

// --- Form types ---
interface SlotFormData {
  day_of_week: string
  start_time: string
  end_time: string
  tutor_id: string    // "" = no tutor
  package: string     // "" = no package — also serves as the slot's display title
}

const emptyForm: SlotFormData = {
  day_of_week: "0",
  start_time: "10:00",
  end_time: "12:00",
  tutor_id: "none",
  package: "none",
}

// --- Helpers ---

/** Parse "HH:MM" or "HH:MM:SS" into { hours, minutes } */
function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number)
  return { hours: h, minutes: m }
}

/** Format "HH:MM:SS" or "HH:MM" into display-friendly "HH:MM" */
function formatTime(time: string): string {
  const { hours: h, minutes: m } = parseTime(time)
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

/** Calculate top offset and height for positioning a slot on the grid */
function getSlotPosition(slot: ScheduleSlot) {
  const start = parseTime(slot.start_time)
  const end = parseTime(slot.end_time)

  const startMinutes = (start.hours - START_HOUR) * 60 + start.minutes
  const endMinutes = (end.hours - START_HOUR) * 60 + end.minutes
  const duration = endMinutes - startMinutes

  const top = (startMinutes / 60) * HOUR_HEIGHT
  const height = (duration / 60) * HOUR_HEIGHT

  return { top, height }
}

// === Main Component ===

const ScheduleCalendar = () => {
  const { t } = useTranslation()
  const { slots, loading, error, refetch, createSlot, updateSlot, deleteSlot } = useSchedule()

  // Tutor list fetched inline (no dedicated hook)
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
  const [formData, setFormData] = useState<SlotFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // --- Group slots by day_of_week for quick lookup ---
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
    setFormData(emptyForm)
    setIsFormOpen(true)
  }, [])

  const openEdit = useCallback((slot: ScheduleSlot) => {
    setEditingSlot(slot)
    setFormData({
      day_of_week: String(slot.day_of_week),
      start_time: formatTime(slot.start_time),
      end_time: formatTime(slot.end_time),
      tutor_id: slot.tutor_id != null ? String(slot.tutor_id) : "none",
      package: slot.package != null ? String(slot.package) : "none",
    })
    setIsFormOpen(true)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        day_of_week: Number(formData.day_of_week),
        start_time: formData.start_time, // "HH:MM"
        end_time: formData.end_time,
        // "none" sentinel or empty string both map to null
        tutor_id: formData.tutor_id && formData.tutor_id !== "none" ? Number(formData.tutor_id) : null,
        package: formData.package && formData.package !== "none" ? formData.package : null,
      }

      if (editingSlot) {
        await updateSlot(editingSlot.id, body)
        toast.success(t("schedule.updateSuccess"))
      } else {
        await createSlot(body)
        toast.success(t("schedule.createSuccess"))
      }
      setIsFormOpen(false)
      refetch()
    } catch (err) {
      // Handle 409 conflict specifically
      const message = err instanceof Error ? err.message : t("schedule.operationFailed")
      if (message.includes("409") || message.toLowerCase().includes("conflict")) {
        toast.error(t("schedule.conflictError"))
      } else {
        toast.error(message)
      }
    } finally {
      setSaving(false)
    }
  }

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
      // Close the edit form too if it's open for the same slot
      if (editingSlot?.id === deleteTarget.id) setIsFormOpen(false)
      refetch()
      toast.success(t("schedule.deleteSuccess"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("schedule.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  // --- Render ---

  // Loading skeleton
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Error state
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

  return (
    <>
      {/* Page header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("schedule.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("schedule.description")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="me-1 h-4 w-4" />
          {t("schedule.addSlot")}
        </Button>
      </div>

      {/* Calendar grid */}
      {slots.length === 0 ? (
        // Empty state
        <Card className="border-dashed">
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
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-14rem)]">
              <div className="min-w-[800px]">
                {/* Day headers — 7 columns */}
                <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b sticky top-0 z-10 bg-background">
                  <div className="p-3 border-e" />
                  {DAY_SHORT_KEYS.map((key, i) => (
                    <div
                      key={key}
                      className={`p-3 text-center ${i < 6 ? "border-e" : ""}`}
                    >
                      <div className="text-xs font-medium text-muted-foreground">
                        {t(`schedule.${key}`)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calendar body */}
                <div className="grid grid-cols-[4rem_repeat(7,1fr)]">
                  {/* Time labels column */}
                  <div className="border-e">
                    {hours.map(hour => (
                      <div
                        key={hour}
                        className="border-b flex items-start justify-end pe-2 pt-1"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {hour.toString().padStart(2, "0")}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns — one per day_of_week */}
                  {DAY_SHORT_KEYS.map((_, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`relative ${dayIdx < 6 ? "border-e" : ""}`}
                    >
                      {/* Hour grid lines */}
                      {hours.map(hour => (
                        <div
                          key={hour}
                          className="border-b"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                        />
                      ))}

                      {/* Slot cards for this day */}
                      {(slotsByDay.get(dayIdx) ?? []).map(slot => {
                        const { top, height } = getSlotPosition(slot)
                        return (
                          <div
                            key={slot.id}
                            className="absolute inset-x-1 z-10 rounded-md border p-1.5 overflow-hidden cursor-pointer transition-opacity hover:opacity-90 bg-primary/15 border-primary/40 text-primary"
                            style={{ top: `${top}px`, height: `${height}px` }}
                            onClick={() => openEdit(slot)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => { if (e.key === "Enter") openEdit(slot) }}
                          >
                            <p className="text-sm font-semibold truncate">{slot.package ? titleCase(slot.package) : t("schedule.noPackage")}</p>
                            <p className="text-xs opacity-80 truncate">
                              {slot.tutor_name ?? t("schedule.noTutor")}
                            </p>
                            <p className="text-xs opacity-60">
                              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                            </p>
                          </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? t("schedule.editSlot") : t("schedule.addSlot")}
            </DialogTitle>
            <DialogDescription>
              {t("schedule.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Class type dropdown — serves as the slot title */}
            <div className="grid gap-2">
              <Label>{t("schedule.package")}</Label>
              <Select
                value={formData.package}
                onValueChange={val => setFormData(prev => ({ ...prev, package: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("schedule.noPackage")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("schedule.noPackage")}</SelectItem>
                  {CLASS_TYPES.map(ct => (
                    <SelectItem key={ct} value={ct}>{titleCase(ct)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Day of Week */}
            <div className="grid gap-2">
              <Label>{t("schedule.dayOfWeek")}</Label>
              <Select
                value={formData.day_of_week}
                onValueChange={val => setFormData(prev => ({ ...prev, day_of_week: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_KEYS.map((key, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {t(`schedule.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start / End time side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("schedule.startTime")}</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("schedule.endTime")}</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            {/* Tutor dropdown */}
            <div className="grid gap-2">
              <Label>{t("schedule.tutor")}</Label>
              <Select
                value={formData.tutor_id}
                onValueChange={val => setFormData(prev => ({ ...prev, tutor_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("schedule.noTutor")} />
                </SelectTrigger>
                <SelectContent>
                  {/* "None" option — uses special sentinel value */}
                  <SelectItem value="none">{t("schedule.noTutor")}</SelectItem>
                  {tutors.map(tutor => (
                    <SelectItem key={tutor.id} value={String(tutor.id)}>
                      {tutor.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {/* Delete button only in edit mode, pushed to the start */}
            {editingSlot && (
              <Button
                variant="destructive"
                onClick={() => confirmDelete(editingSlot)}
                className="me-auto"
                disabled={saving}
              >
                {t("schedule.deleteSlot")}
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!formData.package || formData.package === "none" || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSlot ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  )
}

export default ScheduleCalendar
