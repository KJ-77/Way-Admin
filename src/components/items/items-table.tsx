import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
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
import ConfirmDialog from "@/components/ui/confirm-dialog"
import { apiFetch } from "@/lib/api"
import { friendlyError } from "@/lib/errors"
import { useClayTypes } from "@/hooks/use-clay-types"
import { useAuth } from "@/contexts/auth-context"
import type { Item, ItemStage, ItemSection, User, UserPackage } from "@/types"

type SortOption = "id" | "created_desc" | "created_asc"

// ── Stage definitions ──
// Studio flow: full 6-stage progression with 2 firings (advance button follows this order)
const STUDIO_PROGRESSION: ItemStage[] = ["drying", "bisque fired", "waiting glaze", "glaze fired", "ready", "picked up"]
// PC flow: walk-in painting — starts at "glaze fired", hops through "ready" → "picked up"
const PC_PROGRESSION: ItemStage[] = ["glaze fired", "ready", "picked up"]
// PC items only ever live in these stages — used to constrain the edit dialog
const PC_ALLOWED_STAGES: ItemStage[] = ["glaze fired", "ready", "picked up", "discarded"]
// All stages including terminal "discarded" (used in Studio filters + edit dropdown)
const ALL_STAGES: ItemStage[] = [...STUDIO_PROGRESSION, "discarded"]

// Stages that require a weight input when advancing to them — Studio only.
// Only "ready" captures a final_weight that gets deducted from the subscription.
const STUDIO_WEIGHT_STAGES = new Set<ItemStage>(["ready"])

// Ranking used to detect backward stage transitions (mirror of backend logic)
const STAGE_ORDER: Record<Exclude<ItemStage, "discarded">, number> = {
  "drying": 0,
  "bisque fired": 1,
  "waiting glaze": 2,
  "glaze fired": 3,
  "ready": 4,
  "picked up": 5,
}

// Mirror of backend `isStageBackward` — discarded is treated as a terminal sink,
// so any transition OUT of it counts as a rewind (admin-gated).
function isStageBackward(from: ItemStage, to: ItemStage): boolean {
  if (from === to) return false
  if (from === "discarded") return true
  if (to === "discarded") return false
  return STAGE_ORDER[to] < STAGE_ORDER[from]
}

// Returns true if a forward stage change from `from` to `to` crosses past `threshold`.
// Used to detect when an edit-dialog stage jump skips one or more weigh-in stages
// (e.g. drying → ready crosses both "waiting glaze" and "ready"), so the UI can
// prompt for every weight the new stage implies — not just the target's weight.
function crossesStageForward(from: ItemStage, to: ItemStage, threshold: ItemStage): boolean {
  if (from === "discarded" || to === "discarded" || threshold === "discarded") return false
  const fromRank = STAGE_ORDER[from]
  const toRank = STAGE_ORDER[to]
  const thresholdRank = STAGE_ORDER[threshold]
  return fromRank < thresholdRank && toRank >= thresholdRank
}

// Returns the next stage in the progression for this section, or null if terminal/discarded
function getNextStage(current: ItemStage, section: ItemSection): ItemStage | null {
  const progression = section === "PC" ? PC_PROGRESSION : STUDIO_PROGRESSION
  const idx = progression.indexOf(current)
  if (idx === -1) return null // discarded, or stage doesn't apply to this section
  return idx < progression.length - 1 ? progression[idx + 1] : null
}

// Whether the upcoming stage transition needs a weight input (PC items skip weight entirely)
function stageNeedsWeight(nextStage: ItemStage, section: ItemSection): boolean {
  if (section === "PC") return false
  return STUDIO_WEIGHT_STAGES.has(nextStage)
}

// Whether the upcoming stage transition needs a glaze type input (Studio only, into "glaze fired")
function stageNeedsGlazeType(nextStage: ItemStage, section: ItemSection): boolean {
  if (section === "PC") return false
  return nextStage === "glaze fired"
}

// Badge color per stage
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
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const isAdmin = user?.groups.includes("admin") ?? false

  // Dynamic clay-type catalog (admin-managed list — see /clay-types)
  const { clayTypes } = useClayTypes()

  // ── State ──
  // This page is Studio-only — PC items have their own page (/pc-items).
  // Search is seeded from `?search=` so deep-links from the user-detail items
  // widget land with a specific item pre-filtered.
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("id")

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createUserId, setCreateUserId] = useState("")
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
  const [advanceGlaze, setAdvanceGlaze] = useState("")
  const [advancing, setAdvancing] = useState(false)

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Item | null>(null)
  const [editStage, setEditStage] = useState<ItemStage>("drying")
  const [editDescription, setEditDescription] = useState("")
  const [editClay, setEditClay] = useState("")
  const [editGlaze, setEditGlaze] = useState("")
  // Weight input for forward stage jumps that skip past "ready" (the Advance
  // dialog only handles one stage at a time, so we collect it here too).
  const [editFinalWeight, setEditFinalWeight] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  // Confirmation step before the actual API call fires
  const [confirmEditOpen, setConfirmEditOpen] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch active subscriptions when user changes in create form (Studio items only)
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
  // Studio-only — PC items live on the /pc-items page
  const studioItems = useMemo(() => items.filter((item) => item.section === "Studio"), [items])

  const filtered = useMemo(() => {
    const result = studioItems.filter((item) => {
      const matchesSearch = !search ||
        item.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toString(16).toUpperCase().includes(search.toUpperCase())
      const matchesStage = stageFilter === "all" || item.stage === stageFilter
      return matchesSearch && matchesStage
    })
    // Sort: id (default), or by created_at date
    if (sortBy === "created_desc") result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sortBy === "created_asc") result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    else result.sort((a, b) => a.id - b.id)
    return result
  }, [studioItems, search, stageFilter, sortBy])

  // ── Handlers ──

  const openCreate = () => {
    setCreateUserId("")
    setCreateDescription("")
    setCreateClay("")
    setCreatePackageId("")
    setUserSubscriptions([])
    setIsCreateOpen(true)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      // Studio items only on this page — linked subscription required, default stage "drying",
      // optional clay type. glaze_type is captured later when the item advances to "glaze fired".
      await onCreateItem({
        user_id: createUserId,
        user_package_id: Number(createPackageId),
        section: "Studio",
        description: createDescription || null,
        clay_type: createClay || null,
      })
      toast.success(t("items.createSuccess"))
      setIsCreateOpen(false)
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "items.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  const openAdvance = (item: Item) => {
    setAdvanceTarget(item)
    setAdvanceWeight("")
    setAdvanceGlaze("")
  }

  const handleAdvance = async () => {
    if (!advanceTarget) return
    const nextStage = getNextStage(advanceTarget.stage, advanceTarget.section)
    if (!nextStage) return

    // Build the update payload — include final_weight only when advancing to
    // "ready" (Studio), and glaze_type when advancing into "glaze fired" (Studio).
    const body: Record<string, unknown> = { stage: nextStage }
    if (advanceTarget.section === "Studio") {
      if (nextStage === "ready") {
        body.final_weight = Number(advanceWeight)
      } else if (nextStage === "glaze fired" && advanceGlaze) {
        body.glaze_type = advanceGlaze
      }
    }

    setAdvancing(true)
    try {
      await onUpdateItem(advanceTarget.id, body)
      toast.success(t("items.advanceSuccess"))
      setAdvanceTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "items.operationFailed"))
    } finally {
      setAdvancing(false)
    }
  }

  const openEdit = (item: Item) => {
    setEditTarget(item)
    setEditStage(item.stage)
    setEditDescription(item.description ?? "")
    setEditClay(item.clay_type ?? "")
    setEditGlaze(item.glaze_type ?? "")
    setEditFinalWeight("")
  }

  const handleEdit = async () => {
    if (!editTarget) return
    setEditSaving(true)
    try {
      // Rewinds are gated server-side, but we also block in the UI so non-admins
      // get an immediate, friendly error rather than a 403 from the API.
      if (isStageBackward(editTarget.stage, editStage) && !isAdmin) {
        toast.error(t("items.rewindAdminOnly"))
        setEditSaving(false)
        return
      }
      const body: Record<string, unknown> = {
        stage: editStage,
        description: editDescription || null,
        clay_type: editClay || null,
        glaze_type: editGlaze || null,
      }
      // Include final_weight if this forward stage jump crosses "ready" OR
      // un-discards into a weighed stage with no preserved weight — the backend
      // deducts it from the subscription in the same transaction.
      if (editCrossesReady || editUndiscardNeedsWeight) body.final_weight = Number(editFinalWeight)
      await onUpdateItem(editTarget.id, body)
      toast.success(t("items.updateSuccess"))
      setEditTarget(null)
      setConfirmEditOpen(false)
      onRefetch()
    } catch (err) {
      toast.error(friendlyError(err, "items.operationFailed"))
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
      toast.error(friendlyError(err, "items.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  // Whether the advance dialog needs a weight or glaze-type input (Studio-only; PC skips both)
  const advanceNextStage = advanceTarget ? getNextStage(advanceTarget.stage, advanceTarget.section) : null
  const advanceNeedsWeight = advanceTarget && advanceNextStage
    ? stageNeedsWeight(advanceNextStage, advanceTarget.section)
    : false
  const advanceNeedsGlazeType = advanceTarget && advanceNextStage
    ? stageNeedsGlazeType(advanceNextStage, advanceTarget.section)
    : false

  // Advance button validation
  const advanceValid =
    (!advanceNeedsWeight || (advanceWeight && Number(advanceWeight) > 0)) &&
    (!advanceNeedsGlazeType || !!advanceGlaze)

  // Edit-dialog rewind warning + refund preview (Studio only)
  const editIsRewind = editTarget ? isStageBackward(editTarget.stage, editStage) : false
  const editRefundPreview = useMemo(() => {
    if (!editTarget || !editIsRewind || editTarget.section !== "Studio") return 0
    // Coming out of "discarded" is a "rewind" by the gating function but the
    // refund already happened — discard refunds are previewed below.
    if (editTarget.stage === "discarded") return 0
    const currentRank = STAGE_ORDER[editTarget.stage as Exclude<ItemStage, "discarded">] ?? -1
    const newRank = editStage === "discarded" ? -1 : STAGE_ORDER[editStage]
    if (editTarget.final_weight != null && currentRank >= STAGE_ORDER["ready"] && newRank < STAGE_ORDER["ready"]) {
      return Number(editTarget.final_weight)
    }
    return 0
  }, [editTarget, editIsRewind, editStage])

  // ── Discard / un-discard previews (Studio only) ──
  // Going TO "discarded" with weight still deducted → refund preview
  const editIsDiscarding = !!editTarget && editStage === "discarded" && editTarget.stage !== "discarded"
  const editDiscardRefundPreview = useMemo(() => {
    if (!editTarget || !editIsDiscarding || editTarget.section !== "Studio") return 0
    if (editTarget.final_weight == null) return 0
    const currentRank = STAGE_ORDER[editTarget.stage as Exclude<ItemStage, "discarded">] ?? -1
    if (currentRank < STAGE_ORDER["ready"]) return 0
    return Number(editTarget.final_weight)
  }, [editTarget, editIsDiscarding])

  // Coming OUT of "discarded" with a preserved weight → re-deduct or clear preview
  const editIsUndiscarding = !!editTarget && editTarget.stage === "discarded" && editStage !== "discarded"
  const editUndiscardRededuct = useMemo(() => {
    if (!editTarget || !editIsUndiscarding || editTarget.section !== "Studio") return 0
    if (editTarget.final_weight == null) return 0
    // editIsUndiscarding already narrows editStage away from "discarded", so
    // the lookup into STAGE_ORDER (which excludes "discarded") is safe.
    const newRank = STAGE_ORDER[editStage as Exclude<ItemStage, "discarded">]
    if (newRank < STAGE_ORDER["ready"]) return 0
    return Number(editTarget.final_weight)
  }, [editTarget, editIsUndiscarding, editStage])
  const editUndiscardClears = !!editTarget && editIsUndiscarding && editTarget.section === "Studio"
    && editTarget.final_weight != null && editUndiscardRededuct === 0

  // Un-discarding into a weighed stage with NO preserved weight → caller must
  // supply a fresh final_weight, just like a regular forward cross of "ready".
  // Mirrors backend `requiresFreshWeightOnUndiscard`.
  // editIsUndiscarding already narrows editStage away from "discarded".
  const editUndiscardNeedsWeight = !!editTarget && editIsUndiscarding
    && editTarget.section === "Studio"
    && editTarget.final_weight == null
    && STAGE_ORDER[editStage as Exclude<ItemStage, "discarded">] >= STAGE_ORDER["ready"]

  // Delete-dialog refund preview — mirror of backend `shouldRefund` logic.
  // Discarded items already had their weight refunded, so no further refund on delete.
  const deleteRefundPreview = useMemo(() => {
    if (!deleteTarget || deleteTarget.section !== "Studio") return 0
    if (deleteTarget.stage === "discarded") return 0
    if (deleteTarget.final_weight == null) return 0
    if (deleteTarget.user_package_id == null) return 0
    return Number(deleteTarget.final_weight)
  }, [deleteTarget])

  // Forward stage jumps in the edit dialog may skip past "glaze fired" and/or
  // "ready". We need to prompt for the glaze type and/or final_weight the new
  // stage implies — mirrors the backend's threshold-crossing check. Each flag
  // is suppressed when the value is already recorded on the item (e.g. an admin
  // who rewound and re-advanced — the existing weight is still on the row).
  const editIsForwardJump = !!editTarget && !editIsRewind && editStage !== editTarget.stage
  const editIsStudio = editTarget?.section === "Studio"
  const editCrossesGlazeFired = !!editTarget && editIsForwardJump && editIsStudio
    && crossesStageForward(editTarget.stage, editStage, "glaze fired")
    && !editTarget.glaze_type
  const editCrossesReady = !!editTarget && editIsForwardJump && editIsStudio
    && crossesStageForward(editTarget.stage, editStage, "ready")
    && editTarget.final_weight == null

  // All required-by-crossing inputs must be filled before save is allowed.
  // `editUndiscardNeedsWeight` is treated the same as `editCrossesReady` for
  // the purposes of UI validation — both demand a fresh final_weight before
  // the API will accept the change.
  const editValid =
    (!editCrossesReady || (!!editFinalWeight && Number(editFinalWeight) > 0)) &&
    (!editCrossesGlazeFired || !!editGlaze) &&
    (!editUndiscardNeedsWeight || (!!editFinalWeight && Number(editFinalWeight) > 0))

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
                    <TableHead>{t("items.stage")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("items.clayType")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("items.glazeType")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("items.created")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("items.updated")}</TableHead>
                    <TableHead className="w-[140px]">{t("items.advance")}</TableHead>
                    <TableHead className="w-[50px]">{t("items.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {t("common.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => {
                      const nextStage = getNextStage(item.stage, item.section)
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
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                            {item.clay_type || "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                            {item.glaze_type || "—"}
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
                {t("common.showing")} {filtered.length} {t("common.of")} {studioItems.length} {t("common.results")}
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

            {/* Subscription selector — Studio items require a linked subscription */}
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

            {/* Optional metadata fields */}
            <div className="grid gap-2">
              <Label>{t("items.description")}</Label>
              <Input
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder={t("items.descriptionPlaceholder")}
              />
            </div>

            {/* Clay type — driven by the admin-managed /clay-types catalog so adding/removing
                types here reflects what the studio actually keeps in stock. */}
            <div className="grid gap-2">
              <Label>{t("items.clayType")}</Label>
              <Select value={createClay} onValueChange={setCreateClay}>
                <SelectTrigger>
                  <SelectValue placeholder={t("items.selectClayType")} />
                </SelectTrigger>
                <SelectContent>
                  {clayTypes.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">{t("items.createHint")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!createUserId || !createPackageId || saving}
            >
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
          {advanceTarget && advanceNextStage && (
            <>
              <div className="flex items-center gap-3 py-2">
                <Badge variant="outline" className={stageBadgeVariant[advanceTarget.stage]}>
                  {t(`items.stage_${advanceTarget.stage.replace(" ", "_")}`)}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className={stageBadgeVariant[advanceNextStage]}>
                  {t(`items.stage_${advanceNextStage.replace(" ", "_")}`)}
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

              {/* Glaze type — only shown when advancing into "glaze fired" (Studio) */}
              {advanceNeedsGlazeType && (
                <div className="grid gap-2 pt-2">
                  <Label>{t("items.glazeType")}</Label>
                  <Input
                    value={advanceGlaze}
                    onChange={(e) => setAdvanceGlaze(e.target.value)}
                    placeholder={t("items.glazeTypePlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("items.advanceGlazePrompt")}
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
                    {/* PC items live in a smaller stage subset (no drying / bisque / in-progress).
                        We list ALL valid stages here; rewind validation kicks in on save. */}
                    {(editTarget.section === "PC" ? PC_ALLOWED_STAGES : ALL_STAGES).map((s) => (
                      <SelectItem key={s} value={s}>{t(`items.stage_${s.replace(" ", "_")}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Rewind warning — only Studio items can have refunds; non-admins can't rewind at all */}
                {editIsRewind && !isAdmin && (
                  <p className="text-xs text-destructive">{t("items.rewindAdminOnly")}</p>
                )}
                {editIsRewind && isAdmin && !editIsUndiscarding && (
                  <div className="text-xs text-amber-500 space-y-1">
                    <p>{t("items.rewindWarning")}</p>
                    {editRefundPreview > 0 && (
                      <p className="font-medium">
                        {t("items.rewindRefundNote", { amount: editRefundPreview })}
                      </p>
                    )}
                  </div>
                )}
                {/* Discard preview — going TO "discarded" refunds the deducted weight
                    and keeps it saved on the item for replay if un-discarded later. */}
                {editIsDiscarding && editDiscardRefundPreview > 0 && (
                  <p className="text-xs font-medium text-amber-500">
                    {t("items.discardRefundNote", { amount: editDiscardRefundPreview })}
                  </p>
                )}
                {/* Un-discard previews — coming OUT of "discarded" either re-deducts the
                    saved weight (back into a weighed stage) or just clears it (pre-weighed stage). */}
                {editIsUndiscarding && isAdmin && editUndiscardRededuct > 0 && (
                  <p className="text-xs font-medium text-amber-500">
                    {t("items.undiscardRedeductWarning", { amount: editUndiscardRededuct })}
                  </p>
                )}
                {editIsUndiscarding && isAdmin && editUndiscardClears && (
                  <p className="text-xs text-amber-500">{t("items.undiscardClearNote")}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>{t("items.description")}</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t("items.descriptionPlaceholder")}
                />
              </div>
              {/* Clay type — only for Studio items, pulled from /clay-types catalog */}
              {editTarget.section === "Studio" && (
                <div className="grid gap-2">
                  <Label>{t("items.clayType")}</Label>
                  <Select value={editClay} onValueChange={setEditClay}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("items.selectClayType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {clayTypes.map((c) => (
                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                      ))}
                      {/* If the item already has a clay_type no longer in the catalog,
                          keep it in the dropdown so it isn't accidentally cleared on save. */}
                      {editClay && !clayTypes.some(c => c.name === editClay) && (
                        <SelectItem key={editClay} value={editClay}>{editClay}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Glaze type — Studio only; free-form because we don't manage a catalog.
                  When the stage jump crosses into "glaze fired" for the first time we
                  surface a helper so the user knows it's now required. */}
              {editTarget.section === "Studio" && (
                <div className="grid gap-2">
                  <Label>{t("items.glazeType")}</Label>
                  <Input
                    value={editGlaze}
                    onChange={(e) => setEditGlaze(e.target.value)}
                    placeholder={t("items.glazeTypePlaceholder")}
                  />
                  {editCrossesGlazeFired && (
                    <p className="text-xs text-muted-foreground">{t("items.editGlazeTypePrompt")}</p>
                  )}
                </div>
              )}
              {/* Final-weight prompt — shown when the new stage skips past
                  "ready" for the first time OR when un-discarding back into a
                  weighed stage on an item that never had a weight recorded.
                  Backend deducts this from the linked subscription in the same
                  transaction as the update. */}
              {(editCrossesReady || editUndiscardNeedsWeight) && (
                <div className="grid gap-2">
                  <Label>{t("items.finalWeight")} ({t("items.weight")})</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editFinalWeight}
                    onChange={(e) => setEditFinalWeight(e.target.value)}
                    placeholder={t("items.weightPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editUndiscardNeedsWeight
                      ? t("items.undiscardWeightPrompt")
                      : t("items.editFinalWeightPrompt")}
                  </p>
                </div>
              )}
              {/* Display the recorded final_weight if set (Studio only — PC has no weight tracking) */}
              {editTarget.section === "Studio" && editTarget.final_weight != null && (
                <div className="flex gap-4 text-sm text-muted-foreground border rounded-md p-3">
                  <span>{t("items.finalWeight")}: {editTarget.final_weight} kg</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editSaving}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => setConfirmEditOpen(true)}
              disabled={editSaving || (editIsRewind && !isAdmin) || !editValid}
            >
              {editSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save Confirmation Dialog ── */}
      <ConfirmDialog
        open={confirmEditOpen}
        onOpenChange={setConfirmEditOpen}
        title={t("common.confirmSaveTitle")}
        description={t("common.confirmSaveDescription")}
        loading={editSaving}
        onConfirm={handleEdit}
      />

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("items.deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("items.deleteWarning")}</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <>
              <p className="text-sm text-muted-foreground">
                {deleteTarget.user_name} — #{deleteTarget.id.toString(16).toUpperCase()} ({t(`items.stage_${deleteTarget.stage.replace(" ", "_")}`)})
              </p>
              {/* Refund preview — only when delete will actually credit the subscription */}
              {deleteRefundPreview > 0 && (
                <p className="text-sm font-medium text-amber-500">
                  {t("items.deleteRefundNote", { amount: deleteRefundPreview })}
                </p>
              )}
            </>
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
