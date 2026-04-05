import { useItems } from "@/hooks/use-items"
import { useUsers } from "@/hooks/use-users"
import ItemsTable from "@/components/items/items-table"

const ItemsPage = () => {
  const {
    items, loading, error, refetch,
    createItem, updateItem, deleteItem,
  } = useItems()
  const { users } = useUsers()

  return (
    <div className="space-y-6">
      <ItemsTable
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

export default ItemsPage
