import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Plus, MoreHorizontal, Pencil, Trash2, Loader2, AlertCircle, Palette,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useClayTypes, type ClayType } from "@/hooks/use-clay-types"
import ConfirmDialog from "@/components/ui/confirm-dialog"

const ClayTypesTable = () => {
  const { t } = useTranslation()
  const { clayTypes, loading, error, refetch, createClayType, renameClayType, deleteClayType } = useClayTypes()

  // Single form covers both create and rename — `editingName` is null in create mode
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ClayType | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmEditOpen, setConfirmEditOpen] = useState(false)

  const openCreate = () => {
    setEditingName(null)
    setFormName("")
    setIsFormOpen(true)
  }

  const openEdit = (clayType: ClayType) => {
    setEditingName(clayType.name)
    setFormName(clayType.name)
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    const trimmed = formName.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      if (editingName) {
        await renameClayType(editingName, trimmed)
        toast.success(t("clayTypes.updateSuccess"))
      } else {
        await createClayType(trimmed)
        toast.success(t("clayTypes.createSuccess"))
      }
      setIsFormOpen(false)
      setConfirmEditOpen(false)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("clayTypes.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (clayType: ClayType) => {
    setDeleteTarget(clayType)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteClayType(deleteTarget.name)
      toast.success(t("clayTypes.deleteSuccess"))
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("clayTypes.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold">{t("clayTypes.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("clayTypes.description")}</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="me-1 h-4 w-4" />
            {t("clayTypes.addClayType")}
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-4 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : clayTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <div className="rounded-full bg-muted p-4">
                <Palette className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">{t("clayTypes.emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("clayTypes.emptyDescription")}</p>
              <Button onClick={openCreate} className="mt-2">
                <Plus className="me-1 h-4 w-4" />
                {t("clayTypes.addClayType")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clayTypes.map((ct) => (
                <div
                  key={ct.name}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Palette className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{ct.name}</p>
                      <Badge variant="outline" className="text-[10px] mt-1">{t("clayTypes.title")}</Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(ct)}>
                        <Pencil className="me-2 h-4 w-4" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => confirmDelete(ct)}
                      >
                        <Trash2 className="me-2 h-4 w-4" />
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create / Rename Dialog ── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingName ? t("clayTypes.editClayType") : t("clayTypes.addClayType")}
            </DialogTitle>
            <DialogDescription>
              {editingName ? t("clayTypes.editDescription") : t("clayTypes.addDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("clayTypes.name")}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("clayTypes.namePlaceholder")}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={editingName ? () => setConfirmEditOpen(true) : handleSave}
              disabled={saving || !formName.trim()}
            >
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {editingName ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmEditOpen}
        onOpenChange={setConfirmEditOpen}
        title={t("common.confirmSaveTitle")}
        description={t("common.confirmSaveDescription")}
        loading={saving}
        onConfirm={handleSave}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clayTypes.deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("clayTypes.deleteWarning")}</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="text-sm text-muted-foreground">{deleteTarget.name}</p>
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

export default ClayTypesTable
