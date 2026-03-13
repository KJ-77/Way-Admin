import { useTranslation } from "react-i18next"
import { Cell, Pie, PieChart, Label } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { sessionsByClassType } from "@/data/mock-data"

const chartConfig = {
  Pottery: { label: "Pottery", color: "var(--color-chart-1)" },
  Glass: { label: "Glass", color: "var(--color-chart-2)" },
  Canvas: { label: "Canvas", color: "var(--color-chart-3)" },
  "Mixed Media": { label: "Mixed Media", color: "var(--color-chart-4)" },
}

const SessionsByTypeChart = () => {
  const { t } = useTranslation()
  const totalSessions = sessionsByClassType.reduce((sum, s) => sum + s.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dashboard.sessionsByType")}</CardTitle>
        <CardDescription>{t("dashboard.sessionsByTypeDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[260px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={sessionsByClassType}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              strokeWidth={2}
              stroke="var(--color-background)"
            >
              {sessionsByClassType.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                          {totalSessions}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">
                          Sessions
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          {sessionsByClassType.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
              <span className="text-xs text-muted-foreground">
                {item.name} ({item.value})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SessionsByTypeChart
