import SessionsStats from "@/components/sessions/sessions-stats"
import SessionsTable from "@/components/sessions/sessions-table"

const SessionsPage = () => {
  return (
    <div className="space-y-6">
      <SessionsStats />
      <SessionsTable />
    </div>
  )
}

export default SessionsPage
