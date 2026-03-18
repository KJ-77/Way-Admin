import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { scheduleEvents, getTutorName } from "@/data/mock-data"
import type { ClassType } from "@/types"

const classTypeStyles: Record<ClassType, { bg: string; text: string }> = {
  pottery: { bg: "bg-chart-1/20", text: "text-chart-1" },
  glass: { bg: "bg-chart-2/20", text: "text-chart-2" },
  canvas: { bg: "bg-chart-3/20", text: "text-chart-3" },
  "mixed-media": { bg: "bg-chart-4/20", text: "text-chart-4" },
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
  const today = "2025-03-13"

  const getEvent = (date: string, time: string) =>
    scheduleEvents.find(e => e.date === date && e.startTime === time)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{t("schedule.weeklySchedule")}</CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link to="/schedule">
            {t("schedule.viewFullSchedule")}
            <ArrowRight className="ms-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[3rem_repeat(6,1fr)]">
            {/* Day headers */}
            <div className="border-b border-e bg-muted/30 p-2" />
            {days.map((day, i) => (
              <div
                key={day.key}
                className={`border-b ${i < days.length - 1 ? "border-e" : ""} bg-muted/30 p-2 text-center ${day.date === today ? "bg-primary/5" : ""}`}
              >
                <span className={`text-xs font-medium ${day.date === today ? "text-primary" : "text-muted-foreground"}`}>
                  {t(`schedule.${day.key}`)}
                </span>
              </div>
            ))}

            {/* Time rows */}
            {timeSlots.map((time, rowIdx) => (
              <Fragment key={time}>
                <div
                  className={`${rowIdx < timeSlots.length - 1 ? "border-b" : ""} border-e p-2 flex items-center justify-end`}
                >
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {time}
                  </span>
                </div>
                {days.map((day, colIdx) => {
                  const event = getEvent(day.date, time)
                  const style = event ? classTypeStyles[event.classType] : null
                  return (
                    <div
                      key={`${day.date}-${time}`}
                      className={`${rowIdx < timeSlots.length - 1 ? "border-b" : ""} ${colIdx < days.length - 1 ? "border-e" : ""} p-1 min-h-[3.5rem] flex items-stretch ${day.date === today ? "bg-primary/[0.02]" : ""}`}
                    >
                      {event && style && (
                        <div
                          className={`w-full rounded ${style.bg} px-1.5 py-1 flex flex-col justify-center overflow-hidden`}
                        >
                          <span className={`text-[10px] font-medium ${style.text} truncate leading-tight`}>
                            {event.title}
                          </span>
                          <span className="text-[9px] text-muted-foreground truncate leading-tight hidden sm:block">
                            {getTutorName(event.tutorId)}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {(Object.keys(classTypeStyles) as ClassType[]).map(type => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-sm ${classTypeStyles[type].bg}`} />
              <span className="text-xs text-muted-foreground capitalize">
                {type === "mixed-media" ? "Mixed Media" : type}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default WeeklyCalendar
