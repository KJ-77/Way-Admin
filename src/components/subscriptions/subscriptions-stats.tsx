import { Package, CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { userPackages } from "@/data/mock-data"

const SubscriptionsStats = () => {
  const statItems = [
    {
      label: "Total Subscriptions",
      value: userPackages.length,
      icon: Package,
      color: "text-chart-1 bg-chart-1/10",
    },
    {
      label: "Active",
      value: userPackages.filter(p => p.status === "active").length,
      icon: CheckCircle,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: "Expiring Soon",
      value: userPackages.filter(p => {
        const expiry = new Date(p.expiry_date)
        const now = new Date("2025-03-13")
        const diff = expiry.getTime() - now.getTime()
        return p.status === "active" && diff < 30 * 24 * 60 * 60 * 1000 && diff > 0
      }).length,
      icon: AlertTriangle,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      label: "Expired",
      value: userPackages.filter(p => p.status === "expired").length,
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

export default SubscriptionsStats
