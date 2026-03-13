import { useTranslation } from "react-i18next"
import { CalendarDays, Package, Users, GraduationCap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { recentActivity } from "@/data/mock-data"

const iconMap = {
  session: CalendarDays,
  package: Package,
  user: Users,
  tutor: GraduationCap,
}

const colorMap = {
  session: "text-chart-2 bg-chart-2/10",
  package: "text-chart-1 bg-chart-1/10",
  user: "text-chart-3 bg-chart-3/10",
  tutor: "text-chart-4 bg-chart-4/10",
}

const actionColorMap: Record<string, string> = {
  completed: "text-green-500",
  purchased: "text-chart-1",
  registered: "text-chart-3",
  cancelled: "text-destructive",
  expired: "text-orange-500",
  updated: "text-chart-2",
}

const RecentActivity = () => {
  const { t } = useTranslation()

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date("2025-03-13T18:00:00")
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dashboard.recentActivity")}</CardTitle>
        <CardDescription>{t("dashboard.recentActivityDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="px-2">
        <ScrollArea className="h-[320px] px-4">
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = iconMap[activity.type]
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-lg p-2 ${colorMap[activity.type]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className={`font-medium capitalize ${actionColorMap[activity.action] ?? ""}`}>
                        {activity.action}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{activity.subject}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default RecentActivity
