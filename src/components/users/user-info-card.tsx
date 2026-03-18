import { format } from "date-fns"
import {
  User as UserIcon, Heart, GraduationCap, Briefcase, Calendar, Clock,
  MessageSquare, Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getTutorName } from "@/data/mock-data"
import type { User } from "@/types"

interface UserInfoCardProps {
  user: User
}

interface InfoRowProps {
  icon: React.ElementType
  label: string
  value: string
}

const InfoRow = ({ icon: Icon, label, value }: InfoRowProps) => (
  <div className="flex items-start gap-3 py-2">
    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value}</p>
    </div>
  </div>
)

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), "MMM d, yyyy")
  } catch {
    return dateStr
  }
}

const UserInfoCard = ({ user }: UserInfoCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Client Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Personal */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personal</p>
            <InfoRow icon={UserIcon} label="Gender" value={user.gender} />
            <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(user.dob)} />
            <InfoRow icon={GraduationCap} label="Level" value={user.level} />
          </div>

          {/* Membership */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Membership</p>
            <InfoRow icon={Heart} label="Loyalty" value={user.loyalty} />
            <InfoRow icon={Briefcase} label="Section" value={user.section} />
            <InfoRow icon={Users} label="Referral Source" value={user.referral_source} />
          </div>

          {/* System */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">System</p>
            <InfoRow icon={Calendar} label="First Visit" value={formatDate(user.first_visit)} />
            <InfoRow icon={UserIcon} label="Preferred Tutor" value={getTutorName(user.preferred_tutor)} />
            <InfoRow icon={Clock} label="Last Updated" value={formatDate(user.updated_at)} />
          </div>
        </div>

        {user.notes && (
          <>
            <Separator className="!mt-4" />
            <div className="flex items-start gap-3 pt-3">
              <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm mt-0.5">{user.notes}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default UserInfoCard
