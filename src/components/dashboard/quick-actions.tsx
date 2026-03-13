import { useTranslation } from "react-i18next"
import { UserPlus, CalendarPlus, PackagePlus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

const QuickActions = () => {
  const { t } = useTranslation()

  const actions = [
    {
      label: t("dashboard.newClient"),
      icon: UserPlus,
      href: "/users",
      color: "hover:bg-chart-1/10 hover:text-chart-1 hover:border-chart-1/30",
    },
    {
      label: t("dashboard.newSession"),
      icon: CalendarPlus,
      href: "/sessions",
      color: "hover:bg-chart-2/10 hover:text-chart-2 hover:border-chart-2/30",
    },
    {
      label: t("dashboard.newPackage"),
      icon: PackagePlus,
      href: "/packages",
      color: "hover:bg-chart-4/10 hover:text-chart-4 hover:border-chart-4/30",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dashboard.quickActions")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className={`justify-start gap-3 h-11 transition-all ${action.color}`}
            asChild
          >
            <Link to={action.href}>
              <action.icon className="h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}

export default QuickActions
