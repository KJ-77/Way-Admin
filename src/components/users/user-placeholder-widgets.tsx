import {
  CalendarDays, DollarSign, Package, TrendingUp,
  Clock, BarChart3, Award,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const PlaceholderItem = ({ className }: { className?: string }) => (
  <div className={`h-3 rounded-full bg-muted animate-pulse ${className ?? "w-full"}`} />
)

const UserPlaceholderWidgets = () => {
  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg p-2.5 text-chart-1 bg-chart-1/10">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground/40">--</p>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg p-2.5 text-chart-2 bg-chart-2/10">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground/40">--</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg p-2.5 text-chart-3 bg-chart-3/10">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground/40">--</p>
              <p className="text-xs text-muted-foreground">Packages Bought</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg p-2.5 text-chart-4 bg-chart-4/10">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground/40">--</p>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Session History - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Session History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <PlaceholderItem className={i % 2 === 0 ? "w-3/4" : "w-1/2"} />
                    <PlaceholderItem className="w-1/3" />
                  </div>
                  <PlaceholderItem className="w-16 shrink-0" />
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <p className="text-xs text-center text-muted-foreground">
              Session history will appear here once connected
            </p>
          </CardContent>
        </Card>

        {/* Right Column - Packages & Achievements */}
        <div className="space-y-6">
          {/* Active Packages */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Active Packages</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <PlaceholderItem className="w-24" />
                      <PlaceholderItem className="w-12" />
                    </div>
                    <PlaceholderItem className="w-full" />
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-muted-foreground/20"
                        style={{ width: `${i === 1 ? 65 : 30}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Package details coming soon
              </p>
            </CardContent>
          </Card>

          {/* Spending Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Spending Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-24 mb-3">
                {[40, 65, 30, 80, 55, 45, 70, 50, 60, 35, 75, 90].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-muted animate-pulse"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Spending data coming soon
              </p>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Milestones</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["First Session", "5 Sessions Completed", "First Package"].map((label) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground/50">{label}</p>
                      <PlaceholderItem className="w-20 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Milestone tracking coming soon
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default UserPlaceholderWidgets
