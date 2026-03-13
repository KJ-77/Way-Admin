import { CalendarDays, CheckCircle, Clock, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { sessions } from "@/data/mock-data"

const SessionsStats = () => {
  const statItems = [
    {
      label: "Total Sessions",
      value: sessions.length,
      icon: CalendarDays,
      color: "text-chart-1 bg-chart-1/10",
    },
    {
      label: "Present",
      value: sessions.filter(s => s.attendance === "present").length,
      icon: CheckCircle,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: "Late",
      value: sessions.filter(s => s.attendance === "late").length,
      icon: Clock,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      label: "Cancelled",
      value: sessions.filter(s => s.attendance === "cancelled").length,
      icon: XCircle,
      color: "text-destructive bg-destructive/10",
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

export default SessionsStats
