import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { scheduleEvents, getTutorName } from "@/data/mock-data"
import type { ClassType, ScheduleEvent } from "@/types"

const HOUR_HEIGHT = 64
const START_HOUR = 9
const END_HOUR = 18

const classTypeStyles: Record<ClassType, string> = {
  pottery: "bg-chart-1/20 border-chart-1/50 text-chart-1",
  glass: "bg-chart-2/20 border-chart-2/50 text-chart-2",
  canvas: "bg-chart-3/20 border-chart-3/50 text-chart-3",
  "mixed-media": "bg-chart-4/20 border-chart-4/50 text-chart-4",
}

const days = [
  { key: "mon", date: "2025-03-10", label: "10" },
  { key: "tue", date: "2025-03-11", label: "11" },
  { key: "wed", date: "2025-03-12", label: "12" },
  { key: "thu", date: "2025-03-13", label: "13" },
  { key: "fri", date: "2025-03-14", label: "14" },
  { key: "sat", date: "2025-03-15", label: "15" },
]

const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

function getEventPosition(event: ScheduleEvent) {
  const [h, m] = event.startTime.split(":").map(Number)
  const startMinutes = (h - START_HOUR) * 60 + m
  const top = (startMinutes / 60) * HOUR_HEIGHT
  const height = (event.duration / 60) * HOUR_HEIGHT
  return { top, height }
}

function formatEndTime(startTime: string, duration: number): string {
  const [h, m] = startTime.split(":").map(Number)
  const totalMinutes = h * 60 + m + duration
  const endH = Math.floor(totalMinutes / 60)
  const endM = totalMinutes % 60
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`
}

const ScheduleCalendar = () => {
  const { t } = useTranslation()

  const getEventsForDay = (date: string) =>
    scheduleEvents.filter(e => e.date === date)

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-14rem)]">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-[4rem_repeat(6,1fr)] border-b sticky top-0 z-10 bg-background">
              <div className="p-3 border-e" />
              {days.map((day, i) => (
                <div
                  key={day.key}
                  className={`p-3 text-center ${i < days.length - 1 ? "border-e" : ""}`}
                >
                  <div className="text-xs text-muted-foreground">
                    {t(`schedule.${day.key}`)}
                  </div>
                  <div className="text-lg font-semibold">{day.label}</div>
                </div>
              ))}
            </div>

            {/* Calendar body */}
            <div className="grid grid-cols-[4rem_repeat(6,1fr)]">
              {/* Time labels */}
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

              {/* Day columns */}
              {days.map((day, i) => (
                <div
                  key={day.date}
                  className={`relative ${i < days.length - 1 ? "border-e" : ""}`}
                >
                  {/* Hour grid lines */}
                  {hours.map(hour => (
                    <div
                      key={hour}
                      className="border-b"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Events */}
                  {getEventsForDay(day.date).map(event => {
                    const { top, height } = getEventPosition(event)
                    return (
                      <div
                        key={event.id}
                        className={`absolute inset-x-1 z-10 rounded-md border p-1.5 overflow-hidden cursor-default transition-opacity hover:opacity-90 ${classTypeStyles[event.classType]}`}
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <p className="text-xs font-semibold truncate">{event.title}</p>
                        <p className="text-[10px] opacity-80 truncate">
                          {getTutorName(event.tutorId)}
                        </p>
                        <p className="text-[10px] opacity-60">
                          {event.startTime} – {formatEndTime(event.startTime, event.duration)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center gap-4 p-3 border-t">
          {(Object.keys(classTypeStyles) as ClassType[]).map(type => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded-sm border ${classTypeStyles[type]}`} />
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

export default ScheduleCalendar
