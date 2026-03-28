import SubscriptionsStats from "@/components/subscriptions/subscriptions-stats"
import SubscriptionsTable from "@/components/subscriptions/subscriptions-table"

const SubscriptionsPage = () => {
  return (
    <div className="space-y-6">
      <SubscriptionsStats />
      <SubscriptionsTable />
    </div>
  )
}

export default SubscriptionsPage
