import { useTranslation } from "react-i18next"
import { Loader2, Shapes } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Item, ItemStage } from "@/types"

const stageBadgeClass: Record<ItemStage, string> = {
  "drying": "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  "bisque fired": "bg-orange-500/15 text-orange-500 border-orange-500/30",
  "waiting glaze": "bg-blue-500/15 text-blue-500 border-blue-500/30",
  "glaze fired": "bg-purple-500/15 text-purple-500 border-purple-500/30",
  "ready": "bg-green-500/15 text-green-500 border-green-500/30",
  "discarded": "bg-red-500/15 text-red-400 border-red-500/30",
}

interface UserDetailItemsProps {
  items: Item[]
  loading: boolean
}

const UserDetailItems = ({ items, loading }: UserDetailItemsProps) => {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shapes className="h-4 w-4" />
          {t("items.title")}
          {!loading && (
            <Badge variant="secondary" className="ms-auto text-xs">{items.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("common.noResults")}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium font-mono">#{item.id.toString(16).toUpperCase()}</span>
                    <Badge variant="outline" className="text-[10px]">{item.section}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.updated_at).toLocaleDateString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <Badge variant="outline" className={stageBadgeClass[item.stage]}>
                  {t(`items.stage_${item.stage.replace(" ", "_")}`)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UserDetailItems
