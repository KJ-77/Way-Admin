import { useParams } from "react-router-dom"
import { Loader2, AlertCircle } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { useUserSessions } from "@/hooks/use-sessions"
import { useUserSubscriptions } from "@/hooks/use-subscriptions"
import { useUserItems } from "@/hooks/use-items"
import { useTutors } from "@/hooks/use-tutors"
import UserProfileHeader from "@/components/users/user-profile-header"
import UserInfoCard from "@/components/users/user-info-card"
import UserDetailStats from "@/components/users/user-detail-stats"
import UserDetailSessions from "@/components/users/user-detail-sessions"
import UserDetailSubscriptions from "@/components/users/user-detail-subscriptions"
import UserDetailItems from "@/components/users/user-detail-items"
import UserDetailQuickActions from "@/components/users/user-detail-quick-actions"

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { user, loading, error, refetch: refetchUser } = useUser(id)
  const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useUserSessions(id)
  const { subscriptions, loading: subsLoading, refetch: refetchSubscriptions } = useUserSubscriptions(id)
  const { items, loading: itemsLoading } = useUserItems(id)
  const { tutors } = useTutors()

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

  // Refetch both sessions and subscriptions after a session is created (session creation decrements subscription)
  const handleSessionCreated = () => {
    refetchSessions()
    refetchSubscriptions()
  }

  return (
    <div className="space-y-6">
      <UserProfileHeader user={user}>
        <UserDetailQuickActions
          user={user}
          subscriptions={subscriptions}
          onSessionCreated={handleSessionCreated}
          onSubscriptionCreated={refetchSubscriptions}
          onUserUpdated={refetchUser}
        />
      </UserProfileHeader>
      <UserDetailStats
        sessions={sessions}
        subscriptions={subscriptions}
        loading={sessionsLoading || subsLoading}
      />
      <UserInfoCard user={user} tutors={tutors} />

      {/* Sessions + Subscriptions + Items grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <UserDetailSessions sessions={sessions} loading={sessionsLoading} />
        <UserDetailSubscriptions subscriptions={subscriptions} loading={subsLoading} />
        <UserDetailItems items={items} loading={itemsLoading} />
      </div>
    </div>
  )
}

export default UserDetailPage
