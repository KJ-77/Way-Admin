import { Users, UserCheck, Crown, UserPlus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { users } from "@/data/mock-data"

const UsersStats = () => {
  const statItems = [
    {
      label: "Total Clients",
      value: users.length,
      icon: Users,
      color: "text-chart-1 bg-chart-1/10",
    },
    {
      label: "Active",
      value: users.filter(u => u.status === "active").length,
      icon: UserCheck,
      color: "text-chart-2 bg-chart-2/10",
    },
    {
      label: "VIP",
      value: users.filter(u => u.loyalty === "vip").length,
      icon: Crown,
      color: "text-chart-4 bg-chart-4/10",
    },
    {
      label: "New This Month",
      value: users.filter(u => u.first_visit >= "2025-03-01").length,
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
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default UsersStats
