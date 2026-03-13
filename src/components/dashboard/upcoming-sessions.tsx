import { useTranslation } from "react-i18next"
import { Clock, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { sessions, getUserName } from "@/data/mock-data"
import { Link } from "react-router-dom"

const classTypeColors: Record<string, string> = {
  pottery: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  glass: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  canvas: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  "mixed-media": "bg-chart-4/15 text-chart-4 border-chart-4/30",
}

const UpcomingSessions = () => {
  const { t } = useTranslation()

  const upcomingSessions = sessions
    .filter(s => s.date >= "2025-03-13")
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 6)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{t("dashboard.upcomingSessions")}</CardTitle>
          <CardDescription>{t("dashboard.upcomingSessionsDesc")}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link to="/sessions">
            {t("dashboard.viewAll")}
            <ArrowRight className="ms-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-2">
        <ScrollArea className="h-[320px] px-4">
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex flex-col items-center justify-center rounded-lg bg-muted px-3 py-1.5 min-w-[60px]">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(session.date).toLocaleDateString("en", { month: "short" })}
                  </span>
                  <span className="text-lg font-bold leading-tight">
                    {new Date(session.date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getUserName(session.user_id)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{session.time}</span>
                  </div>
                </div>
                <Badge variant="outline" className={classTypeColors[session.class_type]}>
                  {session.class_type.replace("-", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default UpcomingSessions
