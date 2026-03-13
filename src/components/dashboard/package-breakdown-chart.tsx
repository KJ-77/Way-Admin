import { useTranslation } from "react-i18next"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { packageDistribution } from "@/data/mock-data"

const chartConfig = {
  count: {
    label: "Packages",
  },
  Basic: { label: "Basic", color: "var(--color-chart-2)" },
  Standard: { label: "Standard", color: "var(--color-chart-4)" },
  Premium: { label: "Premium", color: "var(--color-chart-1)" },
}

const PackageBreakdownChart = () => {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dashboard.packageBreakdown")}</CardTitle>
        <CardDescription>{t("dashboard.packageBreakdownDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={packageDistribution} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} />
            <YAxis dataKey="type" type="category" className="text-xs" tickLine={false} axisLine={false} width={70} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
              {packageDistribution.map((entry, index) => (
                <Bar key={index} dataKey="count" fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default PackageBreakdownChart
