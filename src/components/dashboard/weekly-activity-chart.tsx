import { useTranslation } from "react-i18next"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { weeklySessionData } from "@/data/mock-data"

const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "var(--color-chart-1)",
  },
  attendance: {
    label: "Attended",
    color: "var(--color-chart-2)",
  },
}

const WeeklyActivityChart = () => {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dashboard.weeklyActivity")}</CardTitle>
        <CardDescription>{t("dashboard.weeklyActivityDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart data={weeklySessionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="day" className="text-xs" tickLine={false} axisLine={false} />
            <YAxis className="text-xs" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="sessions" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="attendance" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default WeeklyActivityChart
