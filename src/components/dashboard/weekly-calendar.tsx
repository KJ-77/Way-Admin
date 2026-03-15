import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { scheduleEvents, getTutorName } from "@/data/mock-data"
import type { ClassType } from "@/types"

const classTypeStyles: Record<ClassType, string> = {
  pottery: "bg-chart-1/80",
  glass: "bg-chart-2/80",
  canvas: "bg-chart-3/80",
  "mixed-media": "bg-chart-4/80",
}

const days = [
  { key: "mon", date: "2025-03-10" },
  { key: "tue", date: "2025-03-11" },
  { key: "wed", date: "2025-03-12" },
  { key: "thu", date: "2025-03-13" },
  { key: "fri", date: "2025-03-14" },
  { key: "sat", date: "2025-03-15" },
]

const timeSlots = ["10:00", "14:00", "16:00"]

const WeeklyCalendar = () => {
  const { t } = useTranslation()

  const getEvent = (date: string, time: string) =>
    scheduleEvents.find(e => e.date === date && e.startTime === time)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("schedule.weeklySchedule")}</CardTitle>
        <CardDescription>{t("schedule.weeklyScheduleDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[2.5rem_repeat(6,1fr)]">
            {/* Day headers */}
            <div className="border-b border-e bg-muted/30 p-1" />
            {days.map((day, i) => (
              <div
                key={day.key}
                className={`border-b ${i < days.length - 1 ? "border-e" : ""} bg-muted/30 p-1.5 text-center`}
              >
                <span className="text-[10px] font-medium text-muted-foreground">
                  {t(`schedule.${day.key}`)}
                </span>
              </div>
            ))}

            {/* Time rows */}
            {timeSlots.map((time, rowIdx) => (
              <Fragment key={time}>
                <div
                  className={`${rowIdx < timeSlots.length - 1 ? "border-b" : ""} border-e p-1 flex items-center justify-end`}
                >
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {time.slice(0, -3)}
                  </span>
                </div>
                {days.map((day, colIdx) => {
                  const event = getEvent(day.date, time)
                  return (
                    <div
                      key={`${day.date}-${time}`}
                      className={`${rowIdx < timeSlots.length - 1 ? "border-b" : ""} ${colIdx < days.length - 1 ? "border-e" : ""} p-0.5 min-h-[2.25rem] flex items-center justify-center`}
                    >
                      {event && (
                        <div
                          className={`w-full h-6 rounded-sm ${classTypeStyles[event.classType]}`}
                          title={`${event.title}\n${getTutorName(event.tutorId)}\n${event.startTime}`}
                        />
                      )}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {(Object.keys(classTypeStyles) as ClassType[]).map(type => (
            <div key={type} className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-sm ${classTypeStyles[type]}`} />
              <span className="text-[10px] text-muted-foreground capitalize">
                {type === "mixed-media" ? "Mixed" : type}
              </span>
            </div>
          ))}
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
