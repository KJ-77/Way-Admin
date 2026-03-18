import { useTranslation } from "react-i18next"
import { Clock, ArrowRight, CalendarDays } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { sessions, getUserName, getTutorName, scheduleEvents } from "@/data/mock-data"
import { Link } from "react-router-dom"

const classTypeColors: Record<string, string> = {
  pottery: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  glass: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  canvas: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  "mixed-media": "bg-chart-4/15 text-chart-4 border-chart-4/30",
}

const UpcomingSessions = () => {
  const { t } = useTranslation()

  // Today's date (hardcoded to match mock data)
  const today = "2025-03-13"

  const todaySessions = sessions
    .filter(s => s.date === today)
    .sort((a, b) => a.time.localeCompare(b.time))

  const todayEvents = scheduleEvents.filter(e => e.date === today)

  const upcomingSessions = sessions
    .filter(s => s.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 4)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <CardTitle>{t("dashboard.todaySchedule", "Today's Schedule")}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link to="/schedule">
            {t("dashboard.viewAll")}
            <ArrowRight className="ms-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's sessions */}
        {todaySessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("dashboard.noSessionsToday", "No sessions scheduled for today")}
          </p>
        ) : (
          <div className="space-y-2">
            {todaySessions.map((session) => {
              const event = todayEvents.find(
                e => e.startTime === session.time && e.classType === session.class_type
              )
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-[50px]">
                    <Clock className="h-3.5 w-3.5" />
                    {session.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getUserName(session.user_id)}</p>
                    {event && (
                      <p className="text-xs text-muted-foreground truncate">
                        {event.title} &middot; {getTutorName(event.tutorId)}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={classTypeColors[session.class_type]}>
                    {session.class_type.replace("-", " ")}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}

        {/* Upcoming (next few days) */}
        {upcomingSessions.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("dashboard.upcoming", "Coming up")}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-2">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 rounded-lg p-2.5 text-muted-foreground"
                >
                  <div className="flex flex-col items-center min-w-[40px]">
                    <span className="text-[10px] uppercase">
                      {new Date(session.date).toLocaleDateString("en", { weekday: "short" })}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {new Date(session.date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{getUserName(session.user_id)}</p>
                    <p className="text-xs">{session.time}</p>
                  </div>
                  <Badge variant="outline" className={`${classTypeColors[session.class_type]} opacity-70`}>
                    {session.class_type.replace("-", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default UpcomingSessions
