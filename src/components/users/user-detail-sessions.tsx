import { Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Session } from "@/types"

interface UserDetailSessionsProps {
  sessions: Session[]
  loading: boolean
}

const attendanceColors: Record<string, string> = {
  attended: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  booked: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  "cancelled - no charge": "bg-sky-500/15 text-sky-400 border-sky-500/30",
}

const UserDetailSessions = ({ sessions, loading }: UserDetailSessionsProps) => {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Session History</CardTitle>
          {!loading && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {sessions.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No sessions recorded yet</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => {
              const d = new Date(session.created_at)
              const date = d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
              const time = d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })

              return (
                <div
                  key={session.id}
                  className="flex items-center gap-4 rounded-lg border p-3"
                >
                  {/* Session number badge */}
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">#{session.session_nb}</span>
                  </div>

                  {/* Session details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{session.package_name}</span>
                      <span className="text-xs text-muted-foreground">{session.session_weight} kg</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {date} <span className="ms-1">{time}</span>
                    </p>
                  </div>

                  {/* Attendance badge */}
                  <Badge variant="outline" className={`shrink-0 ${attendanceColors[session.attendance]}`}>
                    {session.attendance}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UserDetailSessions
