import { useUsers } from "@/hooks/use-users"
import { useTutors } from "@/hooks/use-tutors"
import UsersStats from "@/components/users/users-stats"
import UsersTable from "@/components/users/users-table"

const UsersPage = () => {
  const { users, loading, error, refetch, createUser, updateUser, deleteUser } = useUsers()
  const { tutors } = useTutors()

  return (
    <div className="space-y-6">
      <UsersStats users={users} loading={loading} />
      <UsersTable
        users={users}
        tutors={tutors}
        loading={loading}
        error={error}
        onRefetch={refetch}
        onCreateUser={createUser}
        onUpdateUser={updateUser}
        onDeleteUser={deleteUser}
      />
    </div>
  )
}

export default UsersPage
