import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Plus, MoreHorizontal, Pencil, Trash2, Loader2, AlertCircle,
  CalendarDays, Weight, DollarSign, Package as PackageIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Package } from "@/types"

interface PackagesTableProps {
  packages: Package[]
  loading: boolean
  error: string | null
  onRefetch: () => void
  onCreatePackage: (body: Record<string, unknown>) => Promise<Package>
  onUpdatePackage: (id: number, body: Record<string, unknown>) => Promise<Package>
  onDeletePackage: (id: number) => Promise<void>
}

interface FormData {
  package_type: string
  sessions_included: string
  weight_included: string
  price: string
}

const emptyForm: FormData = {
  package_type: "",
  sessions_included: "",
  weight_included: "",
  price: "",
}

const PackagesTable = ({
  packages, loading, error, onRefetch, onCreatePackage, onUpdatePackage, onDeletePackage,
}: PackagesTableProps) => {
  const { t } = useTranslation()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const openCreate = () => {
    setEditingPackage(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const openEdit = (pkg: Package) => {
    setEditingPackage(pkg)
    setFormData({
      package_type: pkg.package_type,
      sessions_included: String(pkg.sessions_included ?? ""),
      weight_included: String(pkg.weight_included ?? ""),
      price: String(pkg.price ?? ""),
    })
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        package_type: formData.package_type,
        sessions_included: formData.sessions_included ? Number(formData.sessions_included) : null,
        weight_included: formData.weight_included ? Number(formData.weight_included) : null,
        price: formData.price ? Number(formData.price) : null,
      }

      if (editingPackage) {
        await onUpdatePackage(editingPackage.id, body)
        toast.success(t("packages.updateSuccess"))
      } else {
        await onCreatePackage(body)
        toast.success(t("packages.createSuccess"))
      }
      setIsFormOpen(false)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("packages.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await onDeletePackage(deleteTarget.id)
      setIsDeleteOpen(false)
      setDeleteTarget(null)
      onRefetch()
      toast.success(t("packages.deleteSuccess"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("packages.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("packages.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("packages.description")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="me-1 h-4 w-4" />
          {t("packages.addPackage")}
        </Button>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-destructive gap-2">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">{t("packages.loadFailed")}</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-muted" />
              <CardContent className="p-5 pt-6 space-y-4 animate-pulse">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-20 rounded-lg bg-muted/50" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : packages.length === 0 ? (
        // Empty state
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="rounded-full bg-muted p-4">
              <PackageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">{t("packages.emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("packages.emptyDescription")}</p>
            </div>
            <Button onClick={openCreate} className="mt-2">
              <Plus className="me-1 h-4 w-4" />
              {t("packages.addPackage")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {packages.map(pkg => (
            <Card key={pkg.id} className="group relative overflow-hidden transition-colors hover:border-primary/30">
              {/* Amber accent bar */}
              <div className="absolute top-0 inset-x-0 h-1 bg-primary/80" />

              <CardContent className="p-5 pt-6">
                {/* Header row — name + actions */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm leading-tight truncate">{pkg.package_type}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(pkg)}>
                        <Pencil className="me-2 h-4 w-4" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => { setDeleteTarget(pkg); setIsDeleteOpen(true) }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="me-2 h-4 w-4" />
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Stat blocks */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Sessions */}
                  <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-center space-y-1.5">
                    <div className="mx-auto w-fit rounded-md bg-blue-500/10 p-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <p className="text-xl font-bold">{pkg.sessions_included ?? "—"}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("packages.sessions")}</p>
                  </div>

                  {/* Weight */}
                  <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-center space-y-1.5">
                    <div className="mx-auto w-fit rounded-md bg-emerald-500/10 p-1.5">
                      <Weight className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <p className="text-xl font-bold">
                      {pkg.weight_included != null ? pkg.weight_included : "—"}
                      {pkg.weight_included != null && <span className="text-xs font-normal text-muted-foreground"> kg</span>}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("packages.material")}</p>
                  </div>

                  {/* Price — amber accent */}
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center space-y-1.5">
                    <div className="mx-auto w-fit rounded-md bg-primary/10 p-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {pkg.price != null ? `$${pkg.price}` : "—"}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("packages.priceLabel")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? t("packages.editPackage") : t("packages.addPackage")}
            </DialogTitle>
            <DialogDescription>
              {editingPackage ? t("packages.editDescription") : t("packages.addDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("packages.packageName")}</Label>
              <Input
                value={formData.package_type}
                onChange={e => setFormData(prev => ({ ...prev, package_type: e.target.value }))}
                placeholder="e.g. Handbuilding Explorer - 4 Sessions"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>{t("packages.sessionsIncluded")}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.sessions_included}
                  onChange={e => setFormData(prev => ({ ...prev, sessions_included: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("packages.weightKg")}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.weight_included}
                  onChange={e => setFormData(prev => ({ ...prev, weight_included: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("packages.price")}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="$"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!formData.package_type || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPackage ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("packages.deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("packages.deleteWarning")}</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="text-sm text-muted-foreground">{deleteTarget.package_type}</p>
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

export default PackagesTable
