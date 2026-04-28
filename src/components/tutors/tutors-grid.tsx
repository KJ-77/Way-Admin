import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Search, UserPlus, Mail, Phone, MoreHorizontal, Pencil, Trash2, Loader2, DollarSign, Sparkles,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { Tutor, TutorSpecialty } from "@/types"

const TUTOR_SPECIALTIES: TutorSpecialty[] = ["handbuilding", "wheelthrowing", "glazing", "sculpting"]

const colors = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
]

interface TutorFormData {
  full_name: string
  email: string
  phone: string
  hourly_rate: string
  specialty: string
  notes: string
}

const emptyForm: TutorFormData = {
  full_name: "", email: "", phone: "", hourly_rate: "", specialty: "", notes: "",
}

interface TutorsGridProps {
  tutors: Tutor[]
  loading: boolean
  error: string | null
  onRefetch: () => void
  onCreateTutor: (body: Record<string, unknown>) => Promise<Tutor>
  onUpdateTutor: (id: number, body: Record<string, unknown>) => Promise<Tutor>
  onDeleteTutor: (id: number) => Promise<void>
}

const TutorsGrid = ({
  tutors, loading, error,
  onRefetch, onCreateTutor, onUpdateTutor, onDeleteTutor,
}: TutorsGridProps) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTutor, setEditingTutor] = useState<Tutor | null>(null)
  const [formData, setFormData] = useState<TutorFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Tutor | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredTutors = tutors.filter(tutor =>
    tutor.full_name.toLowerCase().includes(search.toLowerCase()) ||
    tutor.email.toLowerCase().includes(search.toLowerCase()) ||
    (tutor.specialty?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const openCreate = () => {
    setEditingTutor(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const openEdit = (tutor: Tutor) => {
    setEditingTutor(tutor)
    setFormData({
      full_name: tutor.full_name,
      email: tutor.email,
      phone: tutor.phone,
      hourly_rate: tutor.hourly_rate != null ? String(tutor.hourly_rate) : "",
      specialty: tutor.specialty || "",
      notes: tutor.notes || "",
    })
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
        specialty: formData.specialty || null,
        notes: formData.notes || null,
      }

      if (editingTutor) {
        await onUpdateTutor(editingTutor.id, body)
        toast.success(t("tutors.updateSuccess"))
      } else {
        await onCreateTutor(body)
        toast.success(t("tutors.createSuccess"))
      }
      setIsFormOpen(false)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("tutors.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await onDeleteTutor(deleteTarget.id)
      toast.success(t("tutors.deleteSuccess"))
      setDeleteTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("tutors.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("tutors.title")}</CardTitle>
              <CardDescription>{t("tutors.description")}</CardDescription>
            </div>
            <Button className="gap-2" onClick={openCreate}>
              <UserPlus className="h-4 w-4" />
              {t("tutors.addTutor")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("tutors.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-8 max-w-sm"
            />
          </div>

          {error && (
            <div className="flex items-center justify-center h-32 text-destructive text-sm">{error}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTutors.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              {t("common.noResults")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTutors.map((tutor, index) => (
                <Card key={tutor.id} className="group relative overflow-hidden transition-all hover:shadow-md">
                  <div className={`absolute top-0 start-0 h-1 w-full ${colors[index % colors.length].split(" ")[0]}`} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={`text-sm font-semibold ${colors[index % colors.length]}`}>
                          {tutor.full_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(tutor)}>
                            <Pencil className="me-2 h-4 w-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(tutor)}
                          >
                            <Trash2 className="me-2 h-4 w-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="font-semibold text-sm mb-1">{tutor.full_name}</h3>

                    {tutor.specialty && (
                      <div className="flex items-center gap-1.5 text-xs text-primary/80 mb-2">
                        <Sparkles className="h-3 w-3" />
                        <span>{t(`tutors.specialty_${tutor.specialty}`)}</span>
                      </div>
                    )}

                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{tutor.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{tutor.phone}</span>
                      </div>
                      {tutor.hourly_rate != null && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          <span>${tutor.hourly_rate}/hr</span>
                        </div>
                      )}
                    </div>

                    {tutor.notes && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-2">{tutor.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTutor ? t("tutors.editTutor") : t("tutors.addTutor")}</DialogTitle>
            <DialogDescription>
              {editingTutor ? t("tutors.editDescription") : t("tutors.addDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("tutors.name")}</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="e.g. Sara Khalil"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("tutors.email")}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="tutor@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("tutors.phone")}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+96112345678"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("tutors.specialty")}</Label>
                <Select
                  value={formData.specialty}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, specialty: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("tutors.specialtyPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {TUTOR_SPECIALTIES.map(s => (
                      <SelectItem key={s} value={s}>{t(`tutors.specialty_${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("tutors.hourlyRate")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                  placeholder="e.g. 25.00"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("tutors.notes")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t("tutors.notesPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!formData.full_name || saving}>
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {editingTutor ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tutors.deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("tutors.deleteWarning")}</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="text-sm text-muted-foreground">{deleteTarget.full_name}</p>
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

export default TutorsGrid
