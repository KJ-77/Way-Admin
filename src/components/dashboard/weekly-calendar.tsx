import { Fragment, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSchedule } from "@/hooks/use-schedule"

// Mon-Sun (day_of_week 0-6)
const DAY_SHORT_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const

// Representative time rows for the compact dashboard widget
const TIME_SLOTS = ["10:00", "14:00", "16:00"]

/** Capitalize the first letter of each word for display */
function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

/** Check if a slot's start_time matches a given "HH:MM" string */
function startsAt(slotTime: string, target: string): boolean {
  // slotTime may be "HH:MM" or "HH:MM:SS"
  return slotTime.slice(0, 5) === target
}

const WeeklyCalendar = () => {
  const { t } = useTranslation()
  const { slots } = useSchedule()

  // Group slots by day_of_week for O(1) lookup per day
  const slotsByDay = useMemo(() => {
    const map = new Map<number, typeof slots>()
    for (let d = 0; d < 7; d++) map.set(d, [])
    for (const slot of slots) {
      map.get(slot.day_of_week)?.push(slot)
    }
    return map
  }, [slots])

  /** Find a slot for a specific day + time intersection */
  const getSlot = (dayIdx: number, time: string) =>
    (slotsByDay.get(dayIdx) ?? []).find(s => startsAt(s.start_time, time))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("schedule.weeklySchedule")}</CardTitle>
        <CardDescription>{t("schedule.weeklyScheduleDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[2.5rem_repeat(7,1fr)]">
            {/* Day headers */}
            <div className="border-b border-e bg-muted/30 p-1" />
            {DAY_SHORT_KEYS.map((key, i) => (
              <div
                key={key}
                className={`border-b ${i < DAY_SHORT_KEYS.length - 1 ? "border-e" : ""} bg-muted/30 p-1.5 text-center`}
              >
                <span className="text-[10px] font-medium text-muted-foreground">
                  {t(`schedule.${key}`)}
                </span>
              </div>
            ))}

            {/* Time rows */}
            {TIME_SLOTS.map((time, rowIdx) => (
              <Fragment key={time}>
                <div
                  className={`${rowIdx < TIME_SLOTS.length - 1 ? "border-b" : ""} border-e p-1 flex items-center justify-end`}
                >
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {time.slice(0, -3)}
                  </span>
                </div>
                {DAY_SHORT_KEYS.map((_, dayIdx) => {
                  const slot = getSlot(dayIdx, time)
                  return (
                    <div
                      key={`${dayIdx}-${time}`}
                      className={`${rowIdx < TIME_SLOTS.length - 1 ? "border-b" : ""} ${dayIdx < DAY_SHORT_KEYS.length - 1 ? "border-e" : ""} p-0.5 min-h-[2.25rem] flex items-center justify-center`}
                    >
                      {slot && (
                        <div
                          className="w-full h-6 rounded-sm bg-primary/60"
                          title={`${slot.package ? titleCase(slot.package) : "—"}\n${slot.tutor_name ?? t("schedule.noTutor")}\n${time}`}
                        />
                      )}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>

        {/* View Full Schedule */}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to="/schedule">
            {t("schedule.viewFullSchedule")}
            <ArrowRight className="ms-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default WeeklyCalendar
