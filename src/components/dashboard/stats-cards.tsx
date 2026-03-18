import { useTranslation } from "react-i18next"
import { Users, CalendarDays, Package, TrendingUp } from "lucide-react"
import { stats } from "@/data/mock-data"

const StatsCards = () => {
  const { t } = useTranslation()

  const items = [
    { label: t("dashboard.totalClients"), value: stats.totalClients, icon: Users },
    { label: t("dashboard.activeSessions"), value: stats.todaySessions, icon: CalendarDays },
    { label: t("dashboard.activePackages"), value: stats.activePackages, icon: Package },
    { label: t("dashboard.attendanceRate"), value: `${stats.attendanceRate}%`, icon: TrendingUp },
  ]

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <item.icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{item.label}</span>
          <span className="text-sm font-semibold">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export default StatsCards
