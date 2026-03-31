import { Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { UserPackage } from "@/types"

interface UserDetailSubscriptionsProps {
  subscriptions: UserPackage[]
  loading: boolean
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  depleted: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

const UserDetailSubscriptions = ({ subscriptions, loading }: UserDetailSubscriptionsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Subscriptions</CardTitle>
          {!loading && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {subscriptions.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No subscriptions yet</p>
        ) : (
          <div className="space-y-3">
            {subscriptions.map(sub => {
              const sessionProgress = sub.sessions_included > 0
                ? (sub.remaining_sessions / sub.sessions_included) * 100
                : 0

              return (
                <div key={sub.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{sub.package_name}</p>
                    <Badge variant="outline" className={statusColors[sub.status]}>
                      {sub.status}
                    </Badge>
                  </div>

                  {/* Sessions progress */}
                  <div className="flex items-center gap-2">
                    <Progress value={sessionProgress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {sub.remaining_sessions}/{sub.sessions_included}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{sub.remaining_weight}/{sub.weight_included} kg</span>
                    <span>
                      Expires {new Date(sub.expiry_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UserDetailSubscriptions
