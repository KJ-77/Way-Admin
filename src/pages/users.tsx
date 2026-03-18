import { useTranslation } from "react-i18next"
import { useUsers } from "@/hooks/use-users"
import UsersStats from "@/components/users/users-stats"
import UsersTable from "@/components/users/users-table"

const UsersPage = () => {
  const { t } = useTranslation()
  const { users, loading, error, refetch } = useUsers()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("users.title")}</h1>
        <UsersStats users={users} loading={loading} />
      </div>
      <UsersTable users={users} loading={loading} error={error} onRefetch={refetch} />
    </div>
  )
}

export default UsersPage
