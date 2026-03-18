import { useParams } from "react-router-dom"
import { Loader2, AlertCircle } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import UserProfileHeader from "@/components/users/user-profile-header"
import UserInfoCard from "@/components/users/user-info-card"
import UserPlaceholderWidgets from "@/components/users/user-placeholder-widgets"

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { user, loading, error } = useUser(id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-destructive gap-2">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm font-medium">Failed to load client</p>
        <p className="text-xs text-muted-foreground">{error ?? "Client not found"}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <UserProfileHeader user={user} />
      <UserInfoCard user={user} />
      <UserPlaceholderWidgets />
    </div>
  )
}

export default UserDetailPage
