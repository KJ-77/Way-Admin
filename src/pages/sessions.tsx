import { useSessions } from "@/hooks/use-sessions"
import { useUsers } from "@/hooks/use-users"
import SessionsStats from "@/components/sessions/sessions-stats"
import SessionsTable from "@/components/sessions/sessions-table"

const SessionsPage = () => {
  const {
    sessions, loading, error, refetch,
    createSession, updateSession, deleteSession,
  } = useSessions()
  const { users } = useUsers()

  return (
    <div className="space-y-6">
      <SessionsStats sessions={sessions} loading={loading} />
      <SessionsTable
        sessions={sessions}
        users={users}
        loading={loading}
        error={error}
        onRefetch={refetch}
        onCreateSession={createSession}
        onUpdateSession={updateSession}
        onDeleteSession={deleteSession}
      />
    </div>
  )
}

export default SessionsPage
