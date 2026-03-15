import { useTranslation } from "react-i18next"
import StatsCards from "@/components/dashboard/stats-cards"
import RevenueChart from "@/components/dashboard/revenue-chart"
import SessionsByTypeChart from "@/components/dashboard/sessions-by-type-chart"
import WeeklyActivityChart from "@/components/dashboard/weekly-activity-chart"
import WeeklyCalendar from "@/components/dashboard/weekly-calendar"
import UpcomingSessions from "@/components/dashboard/upcoming-sessions"
import ClientGrowthChart from "@/components/dashboard/client-growth-chart"
import PackageBreakdownChart from "@/components/dashboard/package-breakdown-chart"
import QuickActions from "@/components/dashboard/quick-actions"

const Dashboard = () => {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.welcome")}</h1>
        <p className="text-muted-foreground">{t("dashboard.overview")}</p>
      </div>

      <StatsCards />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <SessionsByTypeChart />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WeeklyActivityChart />
        <WeeklyCalendar />
        <UpcomingSessions />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ClientGrowthChart />
        <PackageBreakdownChart />
        <QuickActions />
      </div>
    </div>
  )
}

export default Dashboard
