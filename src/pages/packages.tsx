import { usePackages } from "@/hooks/use-packages"
import PackagesTable from "@/components/packages/packages-table"

const PackagesPage = () => {
  const { packages, loading, error, refetch, createPackage, updatePackage, deletePackage } = usePackages()

  return (
    <div className="space-y-6">
      <PackagesTable
        packages={packages}
        loading={loading}
        error={error}
        onRefetch={refetch}
        onCreatePackage={createPackage}
        onUpdatePackage={updatePackage}
        onDeletePackage={deletePackage}
      />
    </div>
  )
}

export default PackagesPage
