import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Users, CalendarDays, Package, Palette } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getBeirutWeekStart, addDays } from "@/hooks/use-schedule"
import type { User, Session, UserPackage, Item } from "@/types"

interface StatsCardsProps {
  users: User[]
  sessions: Session[]
  subscriptions: UserPackage[]
  items: Item[]
  loading: boolean
}

// A session's effective date: the class day when linked, else when it was logged.
const sessionDate = (s: Session) => (s.class_date ? s.class_date.slice(0, 10) : s.created_at.slice(0, 10))

const StatsCards = ({ users, sessions, subscriptions, items, loading }: StatsCardsProps) => {
  const { t } = useTranslation()

  // All KPIs are derived from live API data (no denormalised counters — cheap at this scale).
  const stats = useMemo(() => {
    const weekStart = getBeirutWeekStart()
    const weekEnd = addDays(weekStart, 6)
    const monthPrefix = new Date().toISOString().slice(0, 7) // "YYYY-MM"

    const newClientsThisMonth = users.filter(u => u.created_at?.slice(0, 7) === monthPrefix).length
    const sessionsThisWeek = sessions.filter(s => {
      const d = sessionDate(s)
      return d >= weekStart && d <= weekEnd
    }).length
    const activeSubscriptions = subscriptions.filter(s => s.status === "active").length
    // Items still moving through the studio journey (exclude terminal stages).
    const itemsInProgress = items.filter(i => i.stage !== "picked up" && i.stage !== "discarded").length
    const readyForPickup = items.filter(i => i.stage === "ready").length

    return {
      totalClients: users.length,
      newClientsThisMonth,
      sessionsThisWeek,
      totalSessions: sessions.length,
      activeSubscriptions,
      totalSubscriptions: subscriptions.length,
      itemsInProgress,
      readyForPickup,
    }
  }, [users, sessions, subscriptions, items])

  const cards = [
    {
      title: t("dashboard.totalClients"),
      value: stats.totalClients,
      subtext: t("dashboard.totalRegistered"),
      trend: `+${stats.newClientsThisMonth} ${t("dashboard.thisMonth")}`,
      icon: Users,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      title: t("dashboard.sessionsThisWeek"),
      value: stats.sessionsThisWeek,
      subtext: `${stats.totalSessions} ${t("dashboard.allTime")}`,
      trend: "",
      icon: CalendarDays,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      title: t("dashboard.activeSubscriptions"),
      value: stats.activeSubscriptions,
      subtext: `${stats.totalSubscriptions} ${t("dashboard.allTime")}`,
      trend: "",
      icon: Package,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
    {
      title: t("dashboard.itemsInProgress"),
      value: stats.itemsInProgress,
      subtext: `${stats.readyForPickup} ${t("dashboard.readyForPickup")}`,
      trend: "",
      icon: Palette,
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
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{card.value}</div>
            )}
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{card.subtext}</p>
              {card.trend && <p className={`text-xs font-medium ${card.color}`}>{card.trend}</p>}
            </div>
          </CardContent>
          <div className={`absolute bottom-0 start-0 h-1 w-full ${card.bg}`} />
        </Card>
      ))}
    </div>
  )
}

export default StatsCards
