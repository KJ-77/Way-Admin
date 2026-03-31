import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import {
  ArrowLeft, Mail, Phone, Calendar, MapPin,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { User } from "@/types"

const statusColors: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Dormant: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

const levelColors: Record<string, string> = {
  Beginner: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Mid: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Advanced: "bg-purple-500/15 text-purple-400 border-purple-500/30",
}

const loyaltyColors: Record<string, string> = {
  Low: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Mid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  High: "bg-amber-500/15 text-amber-400 border-amber-500/30",
}

interface UserProfileHeaderProps {
  user: User
  children?: React.ReactNode
}

const UserProfileHeader = ({ user, children }: UserProfileHeaderProps) => {
  const navigate = useNavigate()
  const initials = user.full_name.split(" ").map(n => n[0]).join("")
  const memberSince = user.first_visit
    ? format(new Date(user.first_visit), "MMMM yyyy")
    : null

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/users")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Back to Clients</span>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{user.full_name}</h1>
              <div className="flex gap-2 flex-wrap">
                {user.status && <Badge variant="outline" className={statusColors[user.status]}>{user.status}</Badge>}
                {user.level && <Badge variant="outline" className={levelColors[user.level]}>{user.level}</Badge>}
                {user.loyalty && <Badge variant="outline" className={loyaltyColors[user.loyalty]}>{user.loyalty} Loyalty</Badge>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:gap-4 sm:flex-wrap">
              {user.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {user.phone}
              </span>
              {user.section && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {user.section} Section
                </span>
              )}
              {memberSince && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since {memberSince}
                </span>
              )}
            </div>

            {/* Quick action buttons (passed from parent) */}
            {children && <div className="pt-1">{children}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default UserProfileHeader
