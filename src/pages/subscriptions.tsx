import { useSubscriptions } from "@/hooks/use-subscriptions"
import { useUsers } from "@/hooks/use-users"
import { usePackages } from "@/hooks/use-packages"
import SubscriptionsStats from "@/components/subscriptions/subscriptions-stats"
import SubscriptionsTable from "@/components/subscriptions/subscriptions-table"

const SubscriptionsPage = () => {
  const {
    subscriptions, loading, error, refetch,
    createSubscription, updateSubscription, deleteSubscription,
  } = useSubscriptions()
  const { users } = useUsers()
  const { packages } = usePackages()

  return (
    <div className="space-y-6">
      <SubscriptionsStats subscriptions={subscriptions} loading={loading} />
      <SubscriptionsTable
        subscriptions={subscriptions}
        users={users}
        packages={packages}
        loading={loading}
        error={error}
        onRefetch={refetch}
        onCreateSubscription={createSubscription}
        onUpdateSubscription={updateSubscription}
        onDeleteSubscription={deleteSubscription}
      />
    </div>
  )
}

export default SubscriptionsPage
