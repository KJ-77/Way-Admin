import PackagesStats from "@/components/packages/packages-stats"
import PackagesTable from "@/components/packages/packages-table"

const PackagesPage = () => {
  return (
    <div className="space-y-6">
      <PackagesStats />
      <PackagesTable />
    </div>
  )
}

export default PackagesPage
