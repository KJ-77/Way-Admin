import { useState } from "react"
import { useUsers } from "@/hooks/use-users"
import { useTutors } from "@/hooks/use-tutors"
import UsersStats from "@/components/users/users-stats"
import UsersTable from "@/components/users/users-table"

const UsersPage = () => {
  // Show-deleted toggle controls the API query — when on, the backend returns soft-deleted
  // users too. Refetching when toggled keeps state honest.
  const [showDeleted, setShowDeleted] = useState(false)
  const { users, loading, error, refetch, createUser, updateUser, deleteUser } = useUsers({ includeDeleted: showDeleted })
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
        showDeleted={showDeleted}
        onShowDeletedChange={setShowDeleted}
      />
    </div>
  )
}

export default UsersPage
