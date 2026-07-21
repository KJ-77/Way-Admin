import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { getBeirutWeekStart } from "@/hooks/use-schedule"
import type { Session } from "@/types"

interface WeeklyActivityProps {
  sessions: Session[]
  loading: boolean
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const chartConfig = {
  attended: { label: "Attended", color: "var(--color-chart-4)" },
  booked: { label: "Booked", color: "var(--color-chart-1)" },
}

// A session's effective date: the class day when linked, else when it was logged.
const sessionDate = (s: Session) => (s.class_date ? s.class_date.slice(0, 10) : s.created_at.slice(0, 10))

// Whole-day offset between two YYYY-MM-DD dates (b - a), UTC-anchored.
const ymdDiff = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)

const WeeklyActivity = ({ sessions, loading }: WeeklyActivityProps) => {
  const { t } = useTranslation()

  // Bucket this week's sessions by weekday + attendance state (derived from live data).
  const { data, totals } = useMemo(() => {
    const weekStart = getBeirutWeekStart()
    const rows = DAY_LABELS.map(day => ({ day, attended: 0, booked: 0 }))
    const totals = { total: 0, attended: 0, booked: 0 }

    for (const s of sessions) {
      const idx = ymdDiff(weekStart, sessionDate(s))
      if (idx < 0 || idx > 6) continue
      totals.total++
      if (s.attendance === "attended") { rows[idx].attended++; totals.attended++ }
      else if (s.attendance === "booked") { rows[idx].booked++; totals.booked++ }
    }
    return { data: rows, totals }
  }, [sessions])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("dashboard.weeklyActivity")}</CardTitle>
        <CardDescription>{t("dashboard.weeklyActivityDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary chips */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: t("dashboard.activityTotal"), value: totals.total, color: "text-foreground" },
            { label: t("dashboard.activityAttended"), value: totals.attended, color: "text-chart-4" },
            { label: t("dashboard.activityBooked"), value: totals.booked, color: "text-chart-1" },
          ].map(chip => (
            <div key={chip.label} className="rounded-lg border p-2.5 text-center">
              {loading ? (
                <Skeleton className="mx-auto h-6 w-8" />
              ) : (
                <div className={`text-xl font-bold ${chip.color}`}>{chip.value}</div>
              )}
              <div className="text-[11px] text-muted-foreground">{chip.label}</div>
            </div>
          ))}
        </div>

        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="day" className="text-xs" tickLine={false} axisLine={false} />
            <YAxis className="text-xs" tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="attended" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} barSize={16} />
            <Bar dataKey="booked" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} barSize={16} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default WeeklyActivity
