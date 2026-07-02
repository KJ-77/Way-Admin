import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Plus, MoreHorizontal, Pencil, Trash2, Loader2, AlertCircle, GraduationCap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useClassTypes, type ClassType } from "@/hooks/use-class-types"
import { friendlyError } from "@/lib/errors"
import ConfirmDialog from "@/components/ui/confirm-dialog"

// Full class_types CRUD. Mirrors clay-types-table's shape but with an extra
// description field and an is_active toggle (class_types is a first-class
// entity, not just a lookup label).
const ClassTypesTable = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { classTypes, loading, error, refetch, createClassType, updateClassType, deleteClassType } = useClassTypes()

  // One form covers create + edit. `editing` is the row being edited, or null.
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<ClassType | null>(null)
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formIsActive, setFormIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ClassType | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmEditOpen, setConfirmEditOpen] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setFormName("")
    setFormDescription("")
    setFormIsActive(true)
    setIsFormOpen(true)
  }

  const openEdit = (row: ClassType) => {
    setEditing(row)
    setFormName(row.name)
    setFormDescription(row.description ?? "")
    setFormIsActive(row.is_active)
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    const name = formName.trim()
    if (!name) return
    setSaving(true)
    try {
      if (editing) {
        await updateClassType(editing.id, {
          name,
          description: formDescription.trim() || null,
          is_active: formIsActive,
        })
        toast.success(t("classTypes.updateSuccess"))
      } else {
        await createClassType({
          name,
          description: formDescription.trim() || null,
          is_active: formIsActive,
        })
        toast.success(t("classTypes.createSuccess"))
      }
      setIsFormOpen(false)
      setConfirmEditOpen(false)
      refetch()
    } catch (err) {
      toast.error(friendlyError(err, t("classTypes.operationFailed")))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteClassType(deleteTarget.id)
      toast.success(t("classTypes.deleteSuccess"))
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      // Backend returns CLASS_TYPE_IN_USE (409) when packages/slots still
      // reference this row. friendlyError surfaces the backend message.
      toast.error(friendlyError(err, t("classTypes.deleteFailed")))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold">{t("classTypes.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("classTypes.description")}</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="me-1 h-4 w-4" />
            {t("classTypes.addClassType")}
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
          ) : classTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <div className="rounded-full bg-muted p-4">
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">{t("classTypes.emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("classTypes.emptyDescription")}</p>
              <Button onClick={openCreate} className="mt-2">
                <Plus className="me-1 h-4 w-4" />
                {t("classTypes.addClassType")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classTypes.map((row) => (
                <div
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/class-types/${row.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      navigate(`/class-types/${row.id}`)
                    }
                  }}
                  className={`flex items-start justify-between rounded-lg border p-4 transition-colors cursor-pointer ${
                    row.is_active ? "hover:bg-muted/40" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="rounded-md bg-primary/10 p-2 text-primary mt-0.5">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{row.name}</p>
                      {row.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {row.description}
                        </p>
                      )}
                      <Badge
                        variant={row.is_active ? "outline" : "secondary"}
                        className="text-[10px] mt-2"
                      >
                        {row.is_active ? t("classTypes.active") : t("classTypes.inactive")}
                      </Badge>
                    </div>
                  </div>
                  {/* Prevent card click from firing when interacting with the menu. */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(row)}>
                          <Pencil className="me-2 h-4 w-4" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="me-2 h-4 w-4" />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t("classTypes.editClassType") : t("classTypes.addClassType")}
            </DialogTitle>
            <DialogDescription>
              {editing ? t("classTypes.editDescription") : t("classTypes.addDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("classTypes.name")}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("classTypes.namePlaceholder")}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("classTypes.descriptionLabel")}</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t("classTypes.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Label>{t("classTypes.isActive")}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("classTypes.isActiveHelp")}
                </p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={editing ? () => setConfirmEditOpen(true) : handleSave}
              disabled={saving || !formName.trim()}
            >
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {editing ? t("common.save") : t("common.create")}
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
            <DialogTitle>{t("classTypes.deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("classTypes.deleteWarning")}</DialogDescription>
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

export default ClassTypesTable
