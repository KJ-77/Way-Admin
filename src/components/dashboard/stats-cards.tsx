import { useTranslation } from "react-i18next"
import { Users, CalendarDays, Package, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { stats } from "@/data/mock-data"

const StatsCards = () => {
  const { t } = useTranslation()

  const cards = [
    {
      title: t("dashboard.totalClients"),
      value: stats.totalClients,
      subtext: `${stats.activeClients} ${t("users.active").toLowerCase()}`,
      icon: Users,
      trend: "+2 this month",
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      title: t("dashboard.activeSessions"),
      value: stats.todaySessions,
      subtext: `${stats.totalSessions} total`,
      icon: CalendarDays,
      trend: "4 scheduled",
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      title: t("dashboard.activePackages"),
      value: stats.activePackages,
      subtext: `${stats.vipClients} VIP clients`,
      icon: Package,
      trend: "+3 this month",
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
    {
      title: t("dashboard.attendanceRate"),
      value: `${stats.attendanceRate}%`,
      subtext: `${stats.totalTutors} tutors active`,
      icon: TrendingUp,
      trend: "+5% vs last month",
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{card.subtext}</p>
              <p className={`text-xs font-medium ${card.color}`}>{card.trend}</p>
            </div>
          </CardContent>
          <div className={`absolute bottom-0 start-0 h-1 w-full ${card.bg}`} />
        </Card>
      ))}
    </div>
  )
}

export default StatsCards
