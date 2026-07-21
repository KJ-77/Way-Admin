import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { UserPlus, CalendarPlus, PackagePlus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Each action deep-links to the relevant page with ?new=1, which auto-opens that
// page's create dialog (wired in users-table / sessions-table / subscriptions-table).
const QuickActions = () => {
  const { t } = useTranslation()

  const actions = [
    {
      label: t("dashboard.newClient"),
      description: t("dashboard.newClientDesc"),
      icon: UserPlus,
      href: "/users?new=1",
      color: "text-chart-1",
      bg: "bg-chart-1/10",
      ring: "hover:border-chart-1/40 hover:bg-chart-1/5",
    },
    {
      label: t("dashboard.newSession"),
      description: t("dashboard.newSessionDesc"),
      icon: CalendarPlus,
      href: "/sessions?new=1",
      color: "text-chart-2",
      bg: "bg-chart-2/10",
      ring: "hover:border-chart-2/40 hover:bg-chart-2/5",
    },
    {
      label: t("dashboard.newSubscription"),
      description: t("dashboard.newSubscriptionDesc"),
      icon: PackagePlus,
      href: "/subscriptions?new=1",
      color: "text-chart-4",
      bg: "bg-chart-4/10",
      ring: "hover:border-chart-4/40 hover:bg-chart-4/5",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("dashboard.quickActions")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={action.href}
            className={`group flex items-center gap-4 rounded-lg border p-4 transition-all ${action.ring}`}
          >
            <div className={`rounded-xl p-3 ${action.bg} transition-transform group-hover:scale-105`}>
              <action.icon className={`h-6 w-6 ${action.color}`} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

export default QuickActions
