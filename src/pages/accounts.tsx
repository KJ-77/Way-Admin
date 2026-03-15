import { useTranslation } from "react-i18next"
import AccountsTable from "@/components/accounts/accounts-table"

const AccountsPage = () => {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("accounts.title")}</h1>
        <p className="text-muted-foreground">{t("accounts.description")}</p>
      </div>
      <AccountsTable />
    </div>
  )
}

export default AccountsPage
