import { useTranslation } from "react-i18next"
import { Package, CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { UserPackage } from "@/types"

interface SubscriptionsStatsProps {
  subscriptions: UserPackage[]
  loading: boolean
}

const SubscriptionsStats = ({ subscriptions, loading }: SubscriptionsStatsProps) => {
  const { t } = useTranslation()

  const stats = [
    {
      label: t("subscriptions.totalSubscriptions"),
      value: subscriptions.length,
      icon: Package,
      color: "text-chart-1 bg-chart-1/10",
    },
    {
      label: t("subscriptions.activeSubscriptions"),
      value: subscriptions.filter(s => s.status === "active").length,
      icon: CheckCircle,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: t("subscriptions.expiringSoon"),
      value: subscriptions.filter(s => {
        if (s.status !== "active") return false
        const diff = new Date(s.expiry_date).getTime() - Date.now()
        return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
      }).length,
      icon: AlertTriangle,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      label: t("subscriptions.expiredSubscriptions"),
      value: subscriptions.filter(s => s.status === "expired").length,
      icon: XCircle,
      color: "text-destructive bg-destructive/10",
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
              <div className="space-y-2 animate-pulse">
                <div className="h-7 w-8 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
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

export default SubscriptionsStats
