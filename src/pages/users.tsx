import UsersStats from "@/components/users/users-stats"
import UsersTable from "@/components/users/users-table"

const UsersPage = () => {
  return (
    <div className="space-y-6">
      <UsersStats />
      <UsersTable />
    </div>
  )
}

export default UsersPage
