import { useUsers } from "@/hooks/use-users"
import UsersStats from "@/components/users/users-stats"
import UsersTable from "@/components/users/users-table"

const UsersPage = () => {
  const { users, loading, error, refetch } = useUsers()

  return (
    <div className="space-y-6">
      <UsersStats users={users} loading={loading} />
      <UsersTable users={users} loading={loading} error={error} onRefetch={refetch} />
    </div>
  )
}

export default UsersPage
