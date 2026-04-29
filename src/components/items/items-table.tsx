import { useState, useEffect, useMemo } from "react"
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
import { apiFetch } from "@/lib/api"
import type { Item, ItemStage, ItemSection, ClayType, User, UserPackage } from "@/types"

const CLAY_TYPES: ClayType[] = ["lf-clb-white", "lf-sio-brown", "hf-prai-white", "lf-pa-white"]

type SortOption = "id" | "created_desc" | "created_asc"

// ── Stage definitions ──
// Normal progression (advance button follows this order)
const PROGRESSION_STAGES: ItemStage[] = ["drying", "bisque fired", "waiting glaze", "glaze fired", "ready"]
// All stages including terminal "discarded" (used in filters + edit dropdown)
const ALL_STAGES: ItemStage[] = [...PROGRESSION_STAGES, "discarded"]
const SECTIONS: ItemSection[] = ["Studio", "PC"]

// Stages that require a weight input when advancing to them
const WEIGHT_STAGES = new Set<ItemStage>(["waiting glaze", "ready"])

// Returns the next stage in the normal progression, or null if terminal/discarded
function getNextStage(current: ItemStage): ItemStage | null {
  const idx = PROGRESSION_STAGES.indexOf(current)
  if (idx === -1) return null // discarded or unknown → no next step
  return idx < PROGRESSION_STAGES.length - 1 ? PROGRESSION_STAGES[idx + 1] : null
}

// Badge color per stage
const stageBadgeVariant: Record<ItemStage, string> = {
  "drying": "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  "bisque fired": "bg-orange-500/15 text-orange-500 border-orange-500/30",
  "waiting glaze": "bg-blue-500/15 text-blue-500 border-blue-500/30",
  "glaze fired": "bg-purple-500/15 text-purple-500 border-purple-500/30",
  "ready": "bg-green-500/15 text-green-500 border-green-500/30",
  "discarded": "bg-red-500/15 text-red-400 border-red-500/30",
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
  const [sectionFilter, setSectionFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("id")

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createUserId, setCreateUserId] = useState("")
  const [createSection, setCreateSection] = useState<ItemSection | "">("")
  const [createDescription, setCreateDescription] = useState("")
  const [createClay, setCreateClay] = useState("")
  const [createPackageId, setCreatePackageId] = useState("")
  const [saving, setSaving] = useState(false)

  // Per-user active subscriptions for the create dialog
  const [userSubscriptions, setUserSubscriptions] = useState<UserPackage[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)

  // Advance stage dialog
  const [advanceTarget, setAdvanceTarget] = useState<Item | null>(null)
  const [advanceWeight, setAdvanceWeight] = useState("")
  const [advancing, setAdvancing] = useState(false)

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Item | null>(null)
  const [editStage, setEditStage] = useState<ItemStage>("drying")
  const [editDescription, setEditDescription] = useState("")
  const [editClay, setEditClay] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch active subscriptions when user changes in create form
  useEffect(() => {
    if (!createUserId) {
      setUserSubscriptions([])
      return
    }
    let cancelled = false
    const fetchSubs = async () => {
      setLoadingSubs(true)
      try {
        const res = await apiFetch(`/user-packages?user_id=${createUserId}`)
        if (!res.ok) throw new Error()
        const data: UserPackage[] = await res.json()
        if (!cancelled) {
          setUserSubscriptions(data.filter(s => s.status === "active"))
        }
      } catch {
        if (!cancelled) setUserSubscriptions([])
      } finally {
        if (!cancelled) setLoadingSubs(false)
      }
    }
    fetchSubs()
    return () => { cancelled = true }
  }, [createUserId])

  // ── Filtering + sorting ──
  const filtered = useMemo(() => {
    const result = items.filter((item) => {
      const matchesSearch = !search ||
        item.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toString(16).toUpperCase().includes(search.toUpperCase())
      const matchesStage = stageFilter === "all" || item.stage === stageFilter
      const matchesSection = sectionFilter === "all" || item.section === sectionFilter
      return matchesSearch && matchesStage && matchesSection
    })
    // Sort: id (default), or by created_at date
    if (sortBy === "created_desc") result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sortBy === "created_asc") result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    else result.sort((a, b) => a.id - b.id)
    return result
  }, [items, search, stageFilter, sectionFilter, sortBy])

  // ── Handlers ──

  const openCreate = () => {
    setCreateUserId("")
    setCreateSection("")
    setCreateDescription("")
    setCreateClay("")
    setCreatePackageId("")
    setUserSubscriptions([])
    setIsCreateOpen(true)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      await onCreateItem({
        user_id: createUserId,
        user_package_id: Number(createPackageId),
        section: createSection,
        description: createDescription || null,
        clay_type: createClay || null,
      })
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
    setAdvanceWeight("")
  }

  const handleAdvance = async () => {
    if (!advanceTarget) return
    const nextStage = getNextStage(advanceTarget.stage)
    if (!nextStage) return

    // Build the update payload — include weight when required
    const body: Record<string, unknown> = { stage: nextStage }
    if (nextStage === "waiting glaze") {
      body.mid_weight = Number(advanceWeight)
    } else if (nextStage === "ready") {
      body.final_weight = Number(advanceWeight)
    }

    setAdvancing(true)
    try {
      await onUpdateItem(advanceTarget.id, body)
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
    setEditDescription(item.description ?? "")
    setEditClay(item.clay_type ?? "")
  }

  const handleEdit = async () => {
    if (!editTarget) return
    setEditSaving(true)
    try {
      await onUpdateItem(editTarget.id, {
        stage: editStage,
        description: editDescription || null,
        clay_type: editClay || null,
      })
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

  // Whether the advance dialog needs a weight input
  const advanceNeedsWeight = advanceTarget
    ? WEIGHT_STAGES.has(getNextStage(advanceTarget.stage)!)
    : false

  // Advance button is disabled if weight is required but not entered
  const advanceValid = !advanceNeedsWeight || (advanceWeight && Number(advanceWeight) > 0)

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
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("items.allSections")}</SelectItem>
                {SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("items.allStages")}</SelectItem>
                {ALL_STAGES.map((s) => (
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
                    <TableHead>{t("items.section")}</TableHead>
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
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                            <Badge variant="outline" className="text-xs">{item.section}</Badge>
                          </TableCell>
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
              <UserCombobox
                users={users}
                value={createUserId}
                onValueChange={(v) => { setCreateUserId(v); setCreatePackageId("") }}
                placeholder={t("items.selectClient")}
              />
            </div>

            {/* Subscription selector — shows after client is picked */}
            <div className="grid gap-2">
              <Label>{t("items.subscription")}</Label>
              {loadingSubs ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("items.loadingSubscriptions")}
                </div>
              ) : !createUserId ? (
                <p className="text-sm text-muted-foreground py-1">{t("items.selectClient")}</p>
              ) : userSubscriptions.length === 0 ? (
                <p className="text-sm text-destructive py-1">{t("items.noActiveSubscriptions")}</p>
              ) : (
                <Select
                  value={createPackageId}
                  onValueChange={setCreatePackageId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("items.selectSubscription")} />
                  </SelectTrigger>
                  <SelectContent>
                    {userSubscriptions.map(sub => (
                      <SelectItem key={sub.id} value={String(sub.id)}>
                        {sub.package_name} — {sub.remaining_sessions} sessions, {sub.remaining_weight} kg left
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <Label>{t("items.section")}</Label>
              <Select value={createSection} onValueChange={(v) => setCreateSection(v as ItemSection)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("items.selectSection")} />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Optional metadata fields */}
            <div className="grid gap-2">
              <Label>{t("items.description")}</Label>
              <Input
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder={t("items.descriptionPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("items.clayType")}</Label>
              <Select value={createClay} onValueChange={setCreateClay}>
                <SelectTrigger>
                  <SelectValue placeholder={t("items.selectClayType")} />
                </SelectTrigger>
                <SelectContent>
                  {CLAY_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>{t(`items.clay_${c.replace(/-/g, "_")}`)}</SelectItem>
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
            <Button onClick={handleCreate} disabled={!createUserId || !createSection || !createPackageId || saving}>
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

              {/* Weight input — only shown when advancing to "waiting glaze" or "ready" */}
              {advanceNeedsWeight && (
                <div className="grid gap-2 pt-2">
                  <Label>{t("items.weight")}</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={advanceWeight}
                    onChange={(e) => setAdvanceWeight(e.target.value)}
                    placeholder={t("items.weightPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("items.advanceWeightPrompt")}
                  </p>
                </div>
              )}
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceTarget(null)} disabled={advancing}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAdvance} disabled={advancing || !advanceValid}>
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
                {editTarget.user_name} — #{editTarget.id.toString(16).toUpperCase()}
              </div>
              <div className="grid gap-2">
                <Label>{t("items.stage")}</Label>
                <Select value={editStage} onValueChange={(v) => setEditStage(v as ItemStage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`items.stage_${s.replace(" ", "_")}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("items.description")}</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t("items.descriptionPlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("items.clayType")}</Label>
                <Select value={editClay} onValueChange={setEditClay}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("items.selectClayType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CLAY_TYPES.map((c) => (
                      <SelectItem key={c} value={c}>{t(`items.clay_${c.replace(/-/g, "_")}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Display recorded weights if they exist */}
              {(editTarget.mid_weight != null || editTarget.final_weight != null) && (
                <div className="flex gap-4 text-sm text-muted-foreground border rounded-md p-3">
                  {editTarget.mid_weight != null && (
                    <span>{t("items.midWeight")}: {editTarget.mid_weight} kg</span>
                  )}
                  {editTarget.final_weight != null && (
                    <span>{t("items.finalWeight")}: {editTarget.final_weight} kg</span>
                  )}
                </div>
              )}
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

export default ItemsTable
