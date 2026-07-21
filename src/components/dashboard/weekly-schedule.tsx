import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, Link } from "react-router-dom"
import {
  ChevronLeft, ChevronRight, ArrowRight, Download, Users, Ban, Loader2, CalendarX,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSchedule, getBeirutWeekStart, addDays } from "@/hooks/use-schedule"
import { exportScheduleToPdf } from "@/lib/schedule-pdf"
import { toast } from "sonner"
import type { ScheduleSlot } from "@/types"

// schedule.day_of_week: 0 = Monday … 6 = Sunday
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const titleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase())
const hm = (time: string) => (time.length > 5 ? time.slice(0, 5) : time)

// Beirut "today" as YYYY-MM-DD (en-CA formats as ISO) — used to highlight today's column.
const beirutToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut" }).format(new Date())

// The date number under each day header, e.g. "21".
const dayNumber = (weekStart: string, dayIndex: number) => {
  const d = new Date(`${addDays(weekStart, dayIndex)}T00:00:00Z`)
  return d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" })
}

const WeeklySchedule = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    slots, loading, weekStart,
    goToPreviousWeek, goToNextWeek, goToCurrentWeek,
  } = useSchedule()

  // Group slots by day for O(1) per-column lookup, each sorted by start time.
  const slotsByDay = useMemo(() => {
    const map = new Map<number, ScheduleSlot[]>()
    for (let d = 0; d < 7; d++) map.set(d, [])
    for (const slot of slots) map.get(slot.day_of_week)?.push(slot)
    for (const list of map.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time))
    return map
  }, [slots])

  const isCurrentWeek = weekStart === getBeirutWeekStart()
  const today = beirutToday()

  const handleExport = () => {
    const ok = exportScheduleToPdf(weekStart, slots)
    if (!ok) toast.error(t("schedule.exportBlocked"))
  }

  const openClass = (slot: ScheduleSlot) => {
    navigate(`/schedule/${slot.id}/${addDays(weekStart, slot.day_of_week)}`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-base">{t("schedule.weeklySchedule")}</CardTitle>
          <CardDescription>{t("schedule.weeklyScheduleDesc")}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border bg-card">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousWeek} aria-label={t("schedule.previousWeek")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-1 text-xs tabular-nums text-muted-foreground">{t("schedule.weekOf")}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek} aria-label={t("schedule.nextWeek")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>{t("schedule.thisWeek")}</Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            {t("schedule.exportPdf")}
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to="/schedule">
              {t("schedule.viewFullSchedule")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <CalendarX className="h-8 w-8" />
            <p className="text-sm">{t("schedule.noSessions")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[780px] grid-cols-7 gap-2">
              {DAY_SHORT.map((dayName, dayIdx) => {
                const columnDate = addDays(weekStart, dayIdx)
                const isToday = columnDate === today
                const daySlots = slotsByDay.get(dayIdx) ?? []
                return (
                  <div key={dayName} className="flex flex-col gap-2">
                    {/* Day header */}
                    <div className={`rounded-md px-2 py-1.5 text-center ${isToday ? "bg-primary/15 text-primary" : "bg-muted/40"}`}>
                      <div className="text-[11px] font-semibold uppercase tracking-wide">{dayName}</div>
                      <div className="text-[10px] opacity-70 tabular-nums">{dayNumber(weekStart, dayIdx)}</div>
                    </div>

                    {/* Class cards for this day */}
                    {daySlots.length === 0 ? (
                      <div className="flex-1 rounded-md border border-dashed border-muted/60 py-4 text-center text-[11px] text-muted-foreground/50">
                        —
                      </div>
                    ) : (
                      daySlots.map(slot => {
                          let cardClasses: string
                          if (slot.is_cancelled) {
                            cardClasses = "bg-muted border-muted-foreground/30 text-muted-foreground"
                          } else if (slot.is_fully_booked) {
                            cardClasses = "bg-destructive/10 border-destructive/40 text-destructive"
                          } else {
                            cardClasses = "bg-primary/10 border-primary/30 hover:bg-primary/15"
                          }

                          const showCount = slot.capacity != null || slot.attending_count > 0
                          const countLabel = slot.capacity != null
                            ? `${slot.attending_count}/${slot.capacity}`
                            : `${slot.attending_count}`

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => openClass(slot)}
                              className={`rounded-md border p-2 text-left transition-colors ${cardClasses}`}
                            >
                              <div className={`text-[11px] font-bold tabular-nums ${slot.is_cancelled ? "line-through" : ""}`}>
                                {hm(slot.start_time)}
                              </div>
                              <div className={`text-xs font-medium leading-tight ${slot.is_cancelled ? "line-through" : ""}`}>
                                {slot.class_type_name ? titleCase(slot.class_type_name) : t("schedule.noPackage")}
                              </div>
                              <div className="mt-0.5 truncate text-[10px] opacity-70">
                                {slot.tutor_name ?? t("schedule.noTutor")}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-[10px] opacity-70">
                                {showCount && (
                                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                                    <Users className="h-2.5 w-2.5" /> {countLabel}
                                  </span>
                                )}
                                {slot.is_cancelled && (
                                  <span className="inline-flex items-center gap-0.5 font-bold uppercase">
                                    <Ban className="h-2.5 w-2.5" /> {t("schedule.cancelledBadge")}
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })
                      )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WeeklySchedule
