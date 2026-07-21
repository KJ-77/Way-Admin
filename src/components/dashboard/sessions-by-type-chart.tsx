import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Cell, Pie, PieChart, Label } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { PieChart as PieIcon } from "lucide-react"
import type { Session } from "@/types"

interface SessionsByTypeChartProps {
  sessions: Session[]
  loading: boolean
}

// Rotating palette (all five chart tokens are defined in index.css).
const PALETTE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

const titleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase())

const SessionsByTypeChart = ({ sessions, loading }: SessionsByTypeChartProps) => {
  const { t } = useTranslation()

  // Group sessions by their linked class type. Sessions are Studio-only (PC is
  // walk-in with no sessions, events don't exist yet), so this naturally excludes
  // both. Legacy sessions with no class link are skipped.
  const { data, total, config } = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of sessions) {
      if (!s.class_name) continue
      const key = titleCase(s.class_name)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const data = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, fill: PALETTE[i % PALETTE.length] }))
    const total = data.reduce((sum, d) => sum + d.value, 0)
    const config: ChartConfig = Object.fromEntries(
      data.map(d => [d.name, { label: d.name, color: d.fill }]),
    )
    return { data, total, config }
  }, [sessions])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("dashboard.sessionsByType")}</CardTitle>
        <CardDescription>{t("dashboard.sessionsByTypeDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Skeleton className="h-[180px] w-[180px] rounded-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <PieIcon className="h-8 w-8" />
            <p className="text-sm">{t("dashboard.noSessionData")}</p>
          </div>
        ) : (
          <>
            <ChartContainer config={config} className="mx-auto h-[240px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  strokeWidth={2}
                  stroke="var(--color-background)"
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                              {total}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">
                              {t("dashboard.sessions")}
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {data.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default SessionsByTypeChart
