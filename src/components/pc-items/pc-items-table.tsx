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
import UserCombobox from "@/components/ui/user-combobox"
import { useAuth } from "@/contexts/auth-context"
import type { Item, ItemStage, User } from "@/types"

type SortOption = "id" | "created_desc" | "created_asc"

// ── PC stage definitions ──
// PC items skip drying / bisque firing / in-progress entirely — they start at "glaze fired"
// because the ceramic is already bisque-fired by employees and the client paints + glazes on site
const PC_PROGRESSION: ItemStage[] = ["glaze fired", "ready", "picked up"]
// All stages a PC item can legally be in (no drying / bisque fired / waiting glaze)
const PC_ALLOWED_STAGES: ItemStage[] = ["glaze fired", "ready", "picked up", "discarded"]

// Stage ranking mirrors backend / Studio table — used to detect rewinds
const STAGE_ORDER: Record<Exclude<ItemStage, "discarded">, number> = {
  "drying": 0,
  "bisque fired": 1,
  "waiting glaze": 2,
  "glaze fired": 3,
  "ready": 4,
  "picked up": 5,
}

function isStageBackward(from: ItemStage, to: ItemStage): boolean {
  if (from === to) return false
  if (from === "discarded") return true
  if (to === "discarded") return false
  return STAGE_ORDER[to] < STAGE_ORDER[from]
}

// Returns the next stage in the PC progression, or null if terminal
function getNextStage(current: ItemStage): ItemStage | null {
  const idx = PC_PROGRESSION.indexOf(current)
  if (idx === -1) return null // discarded or any unexpected stage → no next step
  return idx < PC_PROGRESSION.length - 1 ? PC_PROGRESSION[idx + 1] : null
}

// Badge color per stage — same palette as Studio items for consistency
const stageBadgeVariant: Record<ItemStage, string> = {
  "drying": "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  "bisque fired": "bg-orange-500/15 text-orange-500 border-orange-500/30",
  "waiting glaze": "bg-blue-500/15 text-blue-500 border-blue-500/30",
  "glaze fired": "bg-purple-500/15 text-purple-500 border-purple-500/30",
  "ready": "bg-green-500/15 text-green-500 border-green-500/30",
  "picked up": "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  "discarded": "bg-red-500/15 text-red-400 border-red-500/30",
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ── Props ──

interface PcItemsTableProps {
  items: Item[] // all items — this component filters to PC internally
  users: User[]
  loading: boolean
  error: string | null
  onRefetch: () => void
  onCreateItem: (body: Record<string, unknown>) => Promise<Item>
  onUpdateItem: (id: number, body: Record<string, unknown>) => Promise<Item>
  onDeleteItem: (id: number) => Promise<void>
}

const PcItemsTable = ({
  items, users, loading, error,
  onRefetch, onCreateItem, onUpdateItem, onDeleteItem,
}: PcItemsTableProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.groups.includes("admin") ?? false

  // ── State ──
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("id")

  // Create dialog — minimal form for walk-in PC items
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createUserId, setCreateUserId] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [saving, setSaving] = useState(false)

  // Advance stage dialog
  const [advanceTarget, setAdvanceTarget] = useState<Item | null>(null)
  const [advancing, setAdvancing] = useState(false)

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Item | null>(null)
  const [editStage, setEditStage] = useState<ItemStage>("glaze fired")
  const [editDescription, setEditDescription] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Filtering + sorting ──
  // Filter to PC section first, then apply search/stage/sort filters
  const pcItems = useMemo(() => items.filter((item) => item.section === "PC"), [items])

  const filtered = useMemo(() => {
    const result = pcItems.filter((item) => {
      const matchesSearch = !search ||
        item.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toString(16).toUpperCase().includes(search.toUpperCase())
      const matchesStage = stageFilter === "all" || item.stage === stageFilter
      return matchesSearch && matchesStage
    })
    if (sortBy === "created_desc") result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sortBy === "created_asc") result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    else result.sort((a, b) => a.id - b.id)
    return result
  }, [pcItems, search, stageFilter, sortBy])

  // ── Handlers ──

  const openCreate = () => {
    setCreateUserId("")
    setCreateDescription("")
    setIsCreateOpen(true)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      // PC items: no subscription, no clay, forced to "glaze fired" starting stage
      await onCreateItem({
        user_id: createUserId,
        user_package_id: null,
        section: "PC",
        stage: "glaze fired",
        description: createDescription || null,
        clay_type: null,
      })
      toast.success(t("pcItems.createSuccess"))
      setIsCreateOpen(false)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("pcItems.operationFailed"))
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
      // PC items have no weight tracking — just stage transition
      await onUpdateItem(advanceTarget.id, { stage: nextStage })
      toast.success(t("pcItems.advanceSuccess"))
      setAdvanceTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("pcItems.operationFailed"))
    } finally {
      setAdvancing(false)
    }
  }

  const openEdit = (item: Item) => {
    setEditTarget(item)
    setEditStage(item.stage)
    setEditDescription(item.description ?? "")
  }

  const handleEdit = async () => {
    if (!editTarget) return
    setEditSaving(true)
    try {
      // Block non-admin rewinds in the UI — backend would 403 anyway, but a
      // friendly toast is better than a generic error.
      if (isStageBackward(editTarget.stage, editStage) && !isAdmin) {
        toast.error(t("items.rewindAdminOnly"))
        setEditSaving(false)
        return
      }
      await onUpdateItem(editTarget.id, {
        stage: editStage,
        description: editDescription || null,
      })
      toast.success(t("pcItems.updateSuccess"))
      setEditTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("pcItems.operationFailed"))
    } finally {
      setEditSaving(false)
    }
  }

  // Whether the current edit selection moves the item backward
  const editIsRewind = editTarget ? isStageBackward(editTarget.stage, editStage) : false

  const openDelete = (item: Item) => {
    setDeleteTarget(item)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await onDeleteItem(deleteTarget.id)
      toast.success(t("pcItems.deleteSuccess"))
      setDeleteTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("pcItems.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ──

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">{t("pcItems.title")}</CardTitle>
          <Button onClick={openCreate}>
            <Plus className="me-1 h-4 w-4" />
            {t("pcItems.addItem")}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search + filter bar (no section filter — already PC-only) */}
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
                {PC_ALLOWED_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{t(`items.stage_${s.replace(" ", "_")}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">{t("items.sortById")}</SelectItem>
                <SelectItem value="created_desc">{t("items.sortNewest")}</SelectItem>
                <SelectItem value="created_asc">{t("items.sortOldest")}</SelectItem>
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
                          <TableCell className="font-mono text-xs">{item.id.toString(16).toUpperCase()}</TableCell>
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
                            ) : item.stage === "discarded" ? (
                              <Badge variant="outline" className={stageBadgeVariant["discarded"]}>
                                {t("items.stage_discarded")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={stageBadgeVariant[item.stage]}>
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
                {t("common.showing")} {filtered.length} {t("common.of")} {pcItems.length} {t("common.results")}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Create Dialog (minimal — walk-in painting) ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pcItems.addItem")}</DialogTitle>
            <DialogDescription>{t("pcItems.addDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("items.client")}</Label>
              <UserCombobox
                users={users}
                value={createUserId}
                onValueChange={setCreateUserId}
                placeholder={t("items.selectClient")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("items.description")}</Label>
              <Input
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder={t("pcItems.descriptionPlaceholder")}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("pcItems.createHint")}
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

      {/* ── Advance Stage Confirmation Dialog (no weight input for PC) ── */}
      <Dialog open={!!advanceTarget} onOpenChange={(open) => !open && setAdvanceTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("items.advanceConfirm")}</DialogTitle>
            <DialogDescription>{t("items.advanceWarning")}</DialogDescription>
          </DialogHeader>
          {advanceTarget && (
            <>
              <div className="flex items-center gap-3 py-2">
                <Badge variant="outline" className={stageBadgeVariant[advanceTarget.stage]}>
                  {t(`items.stage_${advanceTarget.stage.replace(" ", "_")}`)}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className={stageBadgeVariant[getNextStage(advanceTarget.stage)!]}>
                  {t(`items.stage_${getNextStage(advanceTarget.stage)!.replace(" ", "_")}`)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {advanceTarget.user_name} — #{advanceTarget.id.toString(16).toUpperCase()}
              </p>
            </>
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

      {/* ── Edit Dialog (PC-allowed stages only, no clay-type) ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pcItems.editItem")}</DialogTitle>
            <DialogDescription>{t("pcItems.editDescription")}</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <div className="grid gap-4 py-4">
              <div className="text-sm text-muted-foreground">
                {editTarget.user_name} — #{editTarget.id.toString(16).toUpperCase()}
              </div>
              <div className="grid gap-2">
                <Label>{t("items.stage")}</Label>
                <Select value={editStage} onValueChange={(v) => setEditStage(v as ItemStage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PC_ALLOWED_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`items.stage_${s.replace(" ", "_")}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* PC items have no weight tracking, but the rewind gate still applies */}
                {editIsRewind && !isAdmin && (
                  <p className="text-xs text-destructive">{t("items.rewindAdminOnly")}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>{t("items.description")}</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t("pcItems.descriptionPlaceholder")}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editSaving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEdit} disabled={editSaving || (editIsRewind && !isAdmin)}>
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
              {deleteTarget.user_name} — #{deleteTarget.id.toString(16).toUpperCase()} ({t(`items.stage_${deleteTarget.stage.replace(" ", "_")}`)})
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

export default PcItemsTable
