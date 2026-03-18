import { Users, UserCheck, Crown, UserPlus, Loader2 } from "lucide-react"
import type { User } from "@/types"

interface UsersStatsProps {
  users: User[]
  loading: boolean
}

const UsersStats = ({ users, loading }: UsersStatsProps) => {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const statItems = [
    { label: "Total Clients", value: users.length, icon: Users },
    { label: "Active", value: users.filter(u => u.status === "Active").length, icon: UserCheck },
    { label: "High Loyalty", value: users.filter(u => u.loyalty === "High").length, icon: Crown },
    { label: "New This Month", value: users.filter(u => u.first_visit >= firstOfMonth).length, icon: UserPlus },
  ]

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading stats...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {statItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <item.icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{item.label}</span>
          <span className="text-sm font-semibold">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export default UsersStats
