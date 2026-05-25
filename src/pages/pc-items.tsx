import { useItems } from "@/hooks/use-items"
import { useUsers } from "@/hooks/use-users"
import PcItemsTable from "@/components/pc-items/pc-items-table"

// PC Items page — walk-in painting on pre-made ceramics
// Shares the same /items API endpoint as Studio items; PcItemsTable filters by section internally
const PcItemsPage = () => {
  const {
    items, loading, error, refetch,
    createItem, updateItem, deleteItem,
  } = useItems()
  const { users } = useUsers()

  return (
    <div className="space-y-6">
      <PcItemsTable
        items={items}
        users={users}
        loading={loading}
        error={error}
        onRefetch={refetch}
        onCreateItem={createItem}
        onUpdateItem={updateItem}
        onDeleteItem={deleteItem}
      />
    </div>
  )
}

export default PcItemsPage
