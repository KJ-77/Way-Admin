import { CalendarDays, DollarSign, Package, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Session, UserPackage } from "@/types"

interface UserDetailStatsProps {
  sessions: Session[]
  subscriptions: UserPackage[]
  loading: boolean
}

const UserDetailStats = ({ sessions, subscriptions, loading }: UserDetailStatsProps) => {
  const totalSessions = sessions.length
  const totalSpent = subscriptions.reduce((sum, sub) => sum + sub.price, 0)
  const packagesBought = subscriptions.length
  const attendedCount = sessions.filter(s => s.attendance === "attended").length
  const attendanceRate = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0

  const stats = [
    {
      label: "Total Sessions",
      value: totalSessions,
      icon: CalendarDays,
      color: "text-chart-1 bg-chart-1/10",
    },
    {
      label: "Total Spent",
      value: `$${totalSpent}`,
      icon: DollarSign,
      color: "text-chart-2 bg-chart-2/10",
    },
    {
      label: "Packages Bought",
      value: packagesBought,
      icon: Package,
      color: "text-chart-3 bg-chart-3/10",
    },
    {
      label: "Attendance Rate",
      value: totalSessions > 0 ? `${attendanceRate}%` : "—",
      icon: TrendingUp,
      color: "text-chart-4 bg-chart-4/10",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-lg p-2.5 ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-8" />
                <Skeleton className="h-3 w-20" />
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default UserDetailStats
