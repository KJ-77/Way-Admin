import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { getBeirutWeekStart, getBeirutDayOfWeek } from "@/hooks/use-schedule"
import type { ScheduleSlot, ScheduleWeekResponse } from "@/types"

// Convert a YYYY-MM-DD string into a Date the Calendar component can render.
// Use noon local time so the resulting Date never drifts across DST boundaries
// (a 00:00 anchor + a 1-hour DST jump back can fall onto the previous day).
function parseDateInput(yyyyMmDd: string): Date | undefined {
  if (!yyyyMmDd) return undefined
  return new Date(`${yyyyMmDd}T12:00:00`)
}

// Format a Date back to YYYY-MM-DD using LOCAL components (not UTC) so the
// calendar's visible date is exactly what gets stored — no off-by-one from
// timezone conversion when the admin's TZ differs from UTC.
function formatDateValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Format "10:00:00" → "10:00" for display in the dropdown.
function trimSeconds(time: string): string {
  return time.length > 5 ? time.slice(0, 5) : time
}

// Title-case the schedule.package enum value (e.g. "wheel throwing explorer"
// → "Wheel Throwing Explorer") for readability in the select.
function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

interface ClassPickerProps {
  // Both values are kept as strings so they integrate with the form state pattern
  // used across the existing dialogs (everything in form state is a string).
  classDate: string         // "" or "YYYY-MM-DD"
  scheduleSlotId: string    // "" or stringified slot id
  onChange: (next: { class_date: string; schedule_slot_id: string }) => void
}

/**
 * Two-step picker for linking a session to a class occurrence.
 *
 * Flow:
 *  1. Admin picks a date — we compute its week_start and fetch the schedule
 *     for that week.
 *  2. Admin picks a class — we show only slots that occur on the chosen
 *     date's day-of-week and aren't cancelled for that week.
 *
 * The fetch is keyed on weekStart, so changing the day within the same week
 * doesn't re-fetch. Changing the date always resets the chosen slot to "" to
 * avoid silently keeping a now-invalid slot when DOW changes.
 */
const ClassPicker = ({ classDate, scheduleSlotId, onChange }: ClassPickerProps) => {
  const { t } = useTranslation()

  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Compute the week_start that holds the picked date. Only meaningful when
  // classDate is set; otherwise we don't fetch anything.
  const weekStart = classDate ? getBeirutWeekStart(new Date(`${classDate}T00:00:00Z`)) : ""

  // Fetch the schedule for the current week. Skips if no date is picked.
  useEffect(() => {
    if (!weekStart) {
      setSlots([])
      return
    }
    let cancelled = false
    const fetchSlots = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/schedule?week=${weekStart}`)
        if (!res.ok) throw new Error("Failed to load schedule")
        const data: ScheduleWeekResponse = await res.json()
        if (!cancelled) setSlots(data.slots)
      } catch (err) {
        if (!cancelled) {
          setSlots([])
          setError(err instanceof Error ? err.message : "Failed to load schedule")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSlots()
    return () => { cancelled = true }
  }, [weekStart])

  // Filter to slots that actually occur on the picked date's DOW + aren't
  // cancelled for this week. Cancelled-for-this-week slots are excluded
  // because the backend will reject "booked"/"attended" against them — and
  // the cancelled-no-charge case is so niche we'd rather route through the
  // schedule UI than expose it in this picker.
  const dow = classDate ? getBeirutDayOfWeek(classDate) : -1
  const availableSlots = slots.filter(s => s.day_of_week === dow && !s.is_cancelled)

  const handleDateChange = (next: string) => {
    // Reset the chosen slot whenever the date changes — its DOW may no longer
    // be valid, and silently keeping the old id would lead to a backend
    // DOW_MISMATCH on submit.
    onChange({ class_date: next, schedule_slot_id: "" })
  }

  const handleSlotChange = (next: string) => {
    onChange({ class_date: classDate, schedule_slot_id: next })
  }

  return (
    <>
      <div className="grid gap-2">
        <Label>{t("sessions.classDate")}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !classDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {classDate
                ? format(parseDateInput(classDate)!, "PPP")
                : t("sessions.pickClassDate")}
            </Button>
          </PopoverTrigger>
          {/* z-[60] so the popover floats above the surrounding Dialog (z-50) */}
          <PopoverContent className="w-auto p-0 z-[60]" align="start">
            <Calendar
              mode="single"
              selected={parseDateInput(classDate)}
              onSelect={(date) => date && handleDateChange(formatDateValue(date))}
              captionLayout="dropdown"
              defaultMonth={parseDateInput(classDate) ?? new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-2">
        <Label>{t("sessions.class")}</Label>
        {!classDate ? (
          <p className="text-sm text-muted-foreground py-1">
            {t("sessions.selectClassDateFirst")}
          </p>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("sessions.loadingClasses")}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-1">{error}</p>
        ) : availableSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground py-1">
            {t("sessions.noClassesOnDate")}
          </p>
        ) : (
          <Select value={scheduleSlotId} onValueChange={handleSlotChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("sessions.selectClass")} />
            </SelectTrigger>
            <SelectContent>
              {availableSlots.map(slot => {
                // Display "Wheel Throwing Explorer • 10:00–12:00" — package can
                // be null for slots configured without a class type, in which
                // case we fall back to the tutor name or "Open Slot."
                const name = slot.package
                  ? titleCase(slot.package)
                  : slot.tutor_name ?? "Open Slot"
                const time = `${trimSeconds(slot.start_time)}–${trimSeconds(slot.end_time)}`
                return (
                  <SelectItem key={slot.id} value={String(slot.id)}>
                    {name} • {time}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}
      </div>
    </>
  )
}

export default ClassPicker
