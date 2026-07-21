import { useTranslation } from "react-i18next"
import { useUsers } from "@/hooks/use-users"
import { useSessions } from "@/hooks/use-sessions"
import { useSubscriptions } from "@/hooks/use-subscriptions"
import { useItems } from "@/hooks/use-items"
import StatsCards from "@/components/dashboard/stats-cards"
import QuickActions from "@/components/dashboard/quick-actions"
import WeeklySchedule from "@/components/dashboard/weekly-schedule"
import WeeklyActivity from "@/components/dashboard/weekly-activity"
import SessionsByTypeChart from "@/components/dashboard/sessions-by-type-chart"
import CommunicationsPreview from "@/components/dashboard/communications-preview"
import RecentActivity from "@/components/dashboard/recent-activity"

const Dashboard = () => {
  const { t } = useTranslation()

  // Shared data pulled once at the dashboard root and passed down as props, so the
  // widgets stay presentational and we don't double-fetch /sessions etc.
  // (WeeklySchedule owns its own week state via useSchedule.)
  const { users, loading: usersLoading } = useUsers()
  const { sessions, loading: sessionsLoading } = useSessions()
  const { subscriptions, loading: subsLoading } = useSubscriptions()
  const { items, loading: itemsLoading } = useItems()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.welcome")}</h1>
        <p className="text-muted-foreground">{t("dashboard.overview")}</p>
      </div>

      {/* KPI overview — real, live data */}
      <StatsCards
        users={users}
        sessions={sessions}
        subscriptions={subscriptions}
        items={items}
        loading={usersLoading || sessionsLoading || subsLoading || itemsLoading}
      />

      {/* 1 — Quick actions */}
      <QuickActions />

      {/* 2 — Weekly schedule (big + detailed) */}
      <WeeklySchedule />

      {/* 3 — Weekly activity + 5 — Sessions by type */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyActivity sessions={sessions} loading={sessionsLoading} />
        </div>
        <SessionsByTypeChart sessions={sessions} loading={sessionsLoading} />
      </div>

      {/* 6 — Communications (preview) + recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CommunicationsPreview />
        </div>
        <RecentActivity />
      </div>
    </div>
  )
}

export default Dashboard
