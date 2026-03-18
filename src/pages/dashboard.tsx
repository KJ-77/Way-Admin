import { useTranslation } from "react-i18next"
import StatsCards from "@/components/dashboard/stats-cards"
import UpcomingSessions from "@/components/dashboard/upcoming-sessions"
import WeeklyCalendar from "@/components/dashboard/weekly-calendar"
import QuickActions from "@/components/dashboard/quick-actions"

const Dashboard = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-8">
      {/* Header + inline stats — tight grouping */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.welcome")}</h1>
        <StatsCards />
      </div>

      {/* Primary content — today's schedule + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UpcomingSessions />
        </div>
        <QuickActions />
      </div>

      {/* Week at a glance */}
      <WeeklyCalendar />
    </div>
  )
}

export default Dashboard
