import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Search, MoreHorizontal, PackagePlus, Pencil, Trash2,
  Loader2, AlertCircle, AlertTriangle, Package as PackageIcon,
} from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { UserPackage, User, Package, PackageStatus } from "@/types"

// ── Props ──

interface SubscriptionsTableProps {
  subscriptions: UserPackage[]
  users: User[]
  packages: Package[]
  loading: boolean
  error: string | null
  onRefetch: () => void
  onCreateSubscription: (body: Record<string, unknown>) => Promise<UserPackage>
  onUpdateSubscription: (id: number, body: Record<string, unknown>) => Promise<UserPackage>
  onDeleteSubscription: (id: number) => Promise<void>
}

// ── Form data shapes ──

interface CreateFormData {
  user_id: string
  package_id: string
  notes: string
}

interface EditFormData {
  remaining_sessions: string
  remaining_weight: string
  expiry_date: string
  notes: string
}

const emptyCreateForm: CreateFormData = { user_id: "", package_id: "", notes: "" }
const emptyEditForm: EditFormData = { remaining_sessions: "", remaining_weight: "", expiry_date: "", notes: "" }

// ── Status badge colors ──

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  depleted: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

// ── Component ──

const SubscriptionsTable = ({
  subscriptions, users, packages, loading, error,
  onRefetch, onCreateSubscription, onUpdateSubscription, onDeleteSubscription,
}: SubscriptionsTableProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<PackageStatus | "all">("all")

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<UserPackage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserPackage | null>(null)

  // Form state
  const [createForm, setCreateForm] = useState<CreateFormData>(emptyCreateForm)
  const [editForm, setEditForm] = useState<EditFormData>(emptyEditForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Filtering ──

  const filtered = subscriptions.filter(sub => {
    const matchesSearch = sub.user_name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // ── Dialog openers ──

  const openCreate = () => {
    setCreateForm(emptyCreateForm)
    setIsCreateOpen(true)
  }

  const openEdit = (sub: UserPackage) => {
    setEditingSubscription(sub)
    setEditForm({
      remaining_sessions: String(sub.remaining_sessions),
      remaining_weight: String(sub.remaining_weight),
      expiry_date: sub.expiry_date.split("T")[0], // ensure YYYY-MM-DD for date input
      notes: sub.notes ?? "",
    })
    setIsEditOpen(true)
  }

  const openDelete = (sub: UserPackage) => {
    setDeleteTarget(sub)
    setIsDeleteOpen(true)
  }

  // ── Handlers ──

  const handleCreate = async () => {
    setSaving(true)
    try {
      await onCreateSubscription({
        user_id: createForm.user_id,
        package_id: Number(createForm.package_id),
        notes: createForm.notes || undefined,
      })
      toast.success(t("subscriptions.createSuccess"))
      setIsCreateOpen(false)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("subscriptions.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editingSubscription) return
    setSaving(true)
    try {
      await onUpdateSubscription(editingSubscription.id, {
        remaining_sessions: Number(editForm.remaining_sessions),
        remaining_weight: Number(editForm.remaining_weight),
        expiry_date: editForm.expiry_date,
        notes: editForm.notes || null,
      })
      toast.success(t("subscriptions.updateSuccess"))
      setIsEditOpen(false)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("subscriptions.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await onDeleteSubscription(deleteTarget.id)
      toast.success(t("subscriptions.deleteSuccess"))
      setIsDeleteOpen(false)
      setDeleteTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("subscriptions.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ──

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("subscriptions.title")}</CardTitle>
              <CardDescription>{t("subscriptions.description")}</CardDescription>
            </div>
            <Button className="gap-2" onClick={openCreate}>
              <PackagePlus className="h-4 w-4" />
              {t("subscriptions.addSubscription")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search + filter bar */}
          <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("subscriptions.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PackageStatus | "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("subscriptions.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("subscriptions.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("subscriptions.active")}</SelectItem>
                <SelectItem value="expired">{t("subscriptions.expired")}</SelectItem>
                <SelectItem value="depleted">{t("subscriptions.depleted")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content: error / loading / empty / table */}
          {error ? (
            <div className="flex flex-col items-center justify-center py-20 text-destructive gap-2">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-medium">{t("subscriptions.loadFailed")}</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 rounded bg-muted/50" />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="rounded-full bg-muted p-4">
                <PackageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">{t("subscriptions.emptyTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("subscriptions.emptyDescription")}</p>
              </div>
              <Button onClick={openCreate} className="mt-2">
                <PackagePlus className="me-1 h-4 w-4" />
                {t("subscriptions.addSubscription")}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("subscriptions.client")}</TableHead>
                      <TableHead>{t("subscriptions.package")}</TableHead>
                      <TableHead className="hidden md:table-cell">{t("subscriptions.purchaseDate")}</TableHead>
                      <TableHead className="hidden md:table-cell">{t("subscriptions.expiryDate")}</TableHead>
                      <TableHead>{t("subscriptions.sessions")}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t("subscriptions.weight")}</TableHead>
                      <TableHead>{t("subscriptions.status")}</TableHead>
                      <TableHead className="w-[50px]">{t("subscriptions.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          {t("common.noResults")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((sub) => {
                        // Remaining sessions as a percentage (full bar = all sessions left, depletes as sessions are used)
                        const sessionProgress = sub.sessions_included > 0
                          ? (sub.remaining_sessions / sub.sessions_included) * 100
                          : 0

                        return (
                          <TableRow
                            key={sub.id}
                            className="group cursor-pointer"
                            onClick={() => navigate(`/users/${sub.user_id}`)}
                          >
                            <TableCell className="text-sm font-medium">{sub.user_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {sub.package_name}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {new Date(sub.purchase_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {new Date(sub.expiry_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress value={sessionProgress} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {sub.remaining_sessions}/{sub.sessions_included}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {sub.remaining_weight}/{sub.weight_included} kg
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusColors[sub.status]}>
                                {t(`subscriptions.${sub.status}`)}
                              </Badge>
                            </TableCell>
                            {/* stopPropagation prevents row click from firing when using the action menu */}
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(sub)}>
                                    <Pencil className="me-2 h-4 w-4" />
                                    {t("common.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDelete(sub)}
                                    className="text-destructive focus:text-destructive"
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
              </div>

              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>
                  {t("common.showing")} {filtered.length} {t("common.of")} {subscriptions.length} {t("common.results")}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Create Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("subscriptions.addSubscription")}</DialogTitle>
            <DialogDescription>{t("subscriptions.addDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Client selector */}
            <div className="grid gap-2">
              <Label>{t("subscriptions.client")}</Label>
              <Select
                value={createForm.user_id}
                onValueChange={(v) => setCreateForm(prev => ({ ...prev, user_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("subscriptions.selectClient")} />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Package selector */}
            <div className="grid gap-2">
              <Label>{t("subscriptions.package")}</Label>
              <Select
                value={createForm.package_id}
                onValueChange={(v) => setCreateForm(prev => ({ ...prev, package_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("subscriptions.selectPackage")} />
                </SelectTrigger>
                <SelectContent>
                  {packages.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.package_type} — ${p.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label>{t("subscriptions.notes")}</Label>
              <Input
                value={createForm.notes}
                onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t("subscriptions.notesPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!createForm.user_id || !createForm.package_id || saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("subscriptions.editSubscription")}</DialogTitle>
            <DialogDescription>{t("subscriptions.editDescription")}</DialogDescription>
          </DialogHeader>
          {editingSubscription && (
            <p className="text-sm text-muted-foreground">
              {editingSubscription.user_name} — {editingSubscription.package_name}
            </p>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("subscriptions.remainingSessions")}</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.remaining_sessions}
                  onChange={(e) => setEditForm(prev => ({ ...prev, remaining_sessions: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("subscriptions.remainingWeight")}</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.remaining_weight}
                  onChange={(e) => setEditForm(prev => ({ ...prev, remaining_weight: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("subscriptions.expiryDate")}</Label>
              <Input
                type="date"
                value={editForm.expiry_date}
                onChange={(e) => setEditForm(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("subscriptions.notes")}</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t("subscriptions.notesPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog — strong warning + recommendation ── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("subscriptions.deleteConfirm")}</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {deleteTarget.user_name} — {deleteTarget.package_name}
              </p>

              {/* Warning */}
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{t("subscriptions.deleteWarning")}</p>
              </div>

              {/* Recommendation to expire instead */}
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-400">{t("subscriptions.deleteRecommendation")}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SubscriptionsTable
