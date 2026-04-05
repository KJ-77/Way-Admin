import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Plus, Search, MoreHorizontal, Loader2, AlertCircle,
  ChevronRight, Trash2, Pencil,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Item, ItemStage, User } from "@/types"

// ── Stage progression order ──
const STAGES: ItemStage[] = ["drying", "bisque fired", "waiting glaze", "glaze fired", "ready"]

// Returns the next stage or null if already at "ready"
function getNextStage(current: ItemStage): ItemStage | null {
  const idx = STAGES.indexOf(current)
  return idx < STAGES.length - 1 ? STAGES[idx + 1] : null
}

// Badge color per stage
const stageBadgeVariant: Record<ItemStage, string> = {
  "drying": "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  "bisque fired": "bg-orange-500/15 text-orange-500 border-orange-500/30",
  "waiting glaze": "bg-blue-500/15 text-blue-500 border-blue-500/30",
  "glaze fired": "bg-purple-500/15 text-purple-500 border-purple-500/30",
  "ready": "bg-green-500/15 text-green-500 border-green-500/30",
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ── Props ──

interface ItemsTableProps {
  items: Item[]
  users: User[]
  loading: boolean
  error: string | null
  onRefetch: () => void
  onCreateItem: (body: Record<string, unknown>) => Promise<Item>
  onUpdateItem: (id: number, body: Record<string, unknown>) => Promise<Item>
  onDeleteItem: (id: number) => Promise<void>
}

const ItemsTable = ({
  items, users, loading, error,
  onRefetch, onCreateItem, onUpdateItem, onDeleteItem,
}: ItemsTableProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // ── State ──
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("all")

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createUserId, setCreateUserId] = useState("")
  const [saving, setSaving] = useState(false)

  // Advance stage dialog
  const [advanceTarget, setAdvanceTarget] = useState<Item | null>(null)
  const [advancing, setAdvancing] = useState(false)

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Item | null>(null)
  const [editStage, setEditStage] = useState<ItemStage>("drying")
  const [editSaving, setEditSaving] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Filtering ──
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !search ||
        item.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        String(item.id).includes(search)
      const matchesStage = stageFilter === "all" || item.stage === stageFilter
      return matchesSearch && matchesStage
    })
  }, [items, search, stageFilter])

  // ── Handlers ──

  const openCreate = () => {
    setCreateUserId("")
    setIsCreateOpen(true)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      await onCreateItem({ user_id: createUserId })
      toast.success(t("items.createSuccess"))
      setIsCreateOpen(false)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("items.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  const openAdvance = (item: Item) => {
    setAdvanceTarget(item)
  }

  const handleAdvance = async () => {
    if (!advanceTarget) return
    const nextStage = getNextStage(advanceTarget.stage)
    if (!nextStage) return

    setAdvancing(true)
    try {
      await onUpdateItem(advanceTarget.id, { stage: nextStage })
      toast.success(t("items.advanceSuccess"))
      setAdvanceTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("items.operationFailed"))
    } finally {
      setAdvancing(false)
    }
  }

  const openEdit = (item: Item) => {
    setEditTarget(item)
    setEditStage(item.stage)
  }

  const handleEdit = async () => {
    if (!editTarget) return
    setEditSaving(true)
    try {
      await onUpdateItem(editTarget.id, { stage: editStage })
      toast.success(t("items.updateSuccess"))
      setEditTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("items.operationFailed"))
    } finally {
      setEditSaving(false)
    }
  }

  const openDelete = (item: Item) => {
    setDeleteTarget(item)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await onDeleteItem(deleteTarget.id)
      toast.success(t("items.deleteSuccess"))
      setDeleteTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("items.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ──

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">{t("items.title")}</CardTitle>
          <Button onClick={openCreate}>
            <Plus className="me-1 h-4 w-4" />
            {t("items.addItem")}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("items.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("items.allStages")}</SelectItem>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{t(`items.stage_${s.replace(" ", "_")}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-4 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>{t("items.client")}</TableHead>
                    <TableHead>{t("items.stage")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("items.created")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("items.updated")}</TableHead>
                    <TableHead className="w-[140px]">{t("items.advance")}</TableHead>
                    <TableHead className="w-[50px]">{t("items.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t("common.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => {
                      const nextStage = getNextStage(item.stage)
                      return (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/users/${item.user_id}`)}
                        >
                          <TableCell className="font-mono text-xs">{item.id}</TableCell>
                          <TableCell className="font-medium">{item.user_name || item.user_id}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={stageBadgeVariant[item.stage]}>
                              {t(`items.stage_${item.stage.replace(" ", "_")}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {formatDateTime(item.created_at)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {formatDateTime(item.updated_at)}
                          </TableCell>
                          <TableCell>
                            {nextStage ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={(e) => { e.stopPropagation(); openAdvance(item) }}
                              >
                                <ChevronRight className="h-3 w-3" />
                                {t(`items.stage_${nextStage.replace(" ", "_")}`)}
                              </Button>
                            ) : (
                              <Badge variant="outline" className={stageBadgeVariant["ready"]}>
                                {t("items.complete")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(item) }}>
                                  <Pencil className="me-2 h-4 w-4" />
                                  {t("common.edit")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); openDelete(item) }}
                                >
                                  <Trash2 className="me-2 h-4 w-4" />
                                  {t("common.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
              <div className="text-xs text-muted-foreground mt-3">
                {t("common.showing")} {filtered.length} {t("common.of")} {items.length} {t("common.results")}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Create Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("items.addItem")}</DialogTitle>
            <DialogDescription>{t("items.addDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("items.client")}</Label>
              <Select value={createUserId} onValueChange={setCreateUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("items.selectClient")} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("items.createHint")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!createUserId || saving}>
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Advance Stage Confirmation Dialog ── */}
      <Dialog open={!!advanceTarget} onOpenChange={(open) => !open && setAdvanceTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("items.advanceConfirm")}</DialogTitle>
            <DialogDescription>{t("items.advanceWarning")}</DialogDescription>
          </DialogHeader>
          {advanceTarget && (
            <div className="flex items-center gap-3 py-2">
              <Badge variant="outline" className={stageBadgeVariant[advanceTarget.stage]}>
                {t(`items.stage_${advanceTarget.stage.replace(" ", "_")}`)}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className={stageBadgeVariant[getNextStage(advanceTarget.stage)!]}>
                {t(`items.stage_${getNextStage(advanceTarget.stage)!.replace(" ", "_")}`)}
              </Badge>
            </div>
          )}
          {advanceTarget && (
            <p className="text-sm text-muted-foreground">
              {advanceTarget.user_name} — #{advanceTarget.id}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceTarget(null)} disabled={advancing}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAdvance} disabled={advancing}>
              {advancing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("items.editItem")}</DialogTitle>
            <DialogDescription>{t("items.editDescription")}</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <div className="grid gap-4 py-4">
              <div className="text-sm text-muted-foreground">
                {editTarget.user_name} — #{editTarget.id}
              </div>
              <div className="grid gap-2">
                <Label>{t("items.stage")}</Label>
                <Select value={editStage} onValueChange={(v) => setEditStage(v as ItemStage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`items.stage_${s.replace(" ", "_")}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editSaving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEdit} disabled={editSaving}>
              {editSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("items.deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("items.deleteWarning")}</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="text-sm text-muted-foreground">
              {deleteTarget.user_name} — #{deleteTarget.id} ({t(`items.stage_${deleteTarget.stage.replace(" ", "_")}`)})
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ItemsTable
