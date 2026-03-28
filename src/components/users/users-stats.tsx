import { Users, UserCheck, Crown, UserPlus, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { User } from "@/types"

interface UsersStatsProps {
  users: User[]
  loading: boolean
}

const UsersStats = ({ users, loading }: UsersStatsProps) => {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const statItems = [
    {
      label: "Total Clients",
      value: users.length,
      icon: Users,
      color: "text-chart-1 bg-chart-1/10",
    },
    {
      label: "Active",
      value: users.filter(u => u.status === "Active").length,
      icon: UserCheck,
      color: "text-chart-2 bg-chart-2/10",
    },
    {
      label: "High Loyalty",
      value: users.filter(u => u.loyalty === "High").length,
      icon: Crown,
      color: "text-chart-4 bg-chart-4/10",
    },
    {
      label: "New This Month",
      value: users.filter(u => u.first_visit != null && u.first_visit >= firstOfMonth).length,
      icon: UserPlus,
      color: "text-chart-3 bg-chart-3/10",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-lg p-2.5 ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-2xl font-bold">{item.value}</p>
              )}
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default UsersStats
