import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Search, MoreHorizontal, CalendarPlus, Pencil, Trash2,
  Loader2, AlertCircle,
} from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import UserCombobox from "@/components/ui/user-combobox"
import type { Session, User, UserPackage, Attendance } from "@/types"

// Maps attendance enum values to translation keys (handles the "cancelled - no charge" key)
const attendanceKey: Record<string, string> = {
  attended: "sessions.attended",
  booked: "sessions.booked",
  cancelled: "sessions.cancelled",
  "cancelled - no charge": "sessions.cancelledNoCharge",
}

// ── Props ──

interface SessionsTableProps {
  sessions: Session[]
  users: User[]
  loading: boolean
  error: string | null
  onRefetch: () => void
  onCreateSession: (body: Record<string, unknown>) => Promise<Session>
  onUpdateSession: (id: number, body: Record<string, unknown>) => Promise<Session>
  onDeleteSession: (id: number) => Promise<void>
}

// ── Form data shapes ──

interface CreateFormData {
  user_id: string
  package_id: string
  attendance: string
  notes: string
}

interface EditFormData {
  session_nb: string
  attendance: string
  notes: string
}

const emptyCreateForm: CreateFormData = {
  user_id: "", package_id: "",
  attendance: "attended", notes: "",
}

const emptyEditForm: EditFormData = {
  session_nb: "", attendance: "", notes: "",
}

// ── Badge colors ──

const attendanceColors: Record<string, string> = {
  attended: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  booked: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  "cancelled - no charge": "bg-sky-500/15 text-sky-400 border-sky-500/30",
}

// ── Helpers ──

// Format timestamp as "Apr 1, 2:30 PM"
const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  const date = d.toLocaleDateString("en", { month: "short", day: "numeric" })
  const time = d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })
  return { date, time }
}

// ── Component ──

const SessionsTable = ({
  sessions, users, loading, error,
  onRefetch, onCreateSession, onUpdateSession, onDeleteSession,
}: SessionsTableProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Filters
  const [search, setSearch] = useState("")
  const [attendanceFilter, setAttendanceFilter] = useState<Attendance | "all">("all")

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null)

  // Form state
  const [createForm, setCreateForm] = useState<CreateFormData>(emptyCreateForm)
  const [editForm, setEditForm] = useState<EditFormData>(emptyEditForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Per-user active subscriptions for the create dialog
  const [userSubscriptions, setUserSubscriptions] = useState<UserPackage[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)

  // Fetch active subscriptions when user changes in create form
  useEffect(() => {
    if (!createForm.user_id) {
      setUserSubscriptions([])
      return
    }
    let cancelled = false
    const fetchSubs = async () => {
      setLoadingSubs(true)
      try {
        const res = await apiFetch(`/user-packages?user_id=${createForm.user_id}`)
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
  }, [createForm.user_id])

  // ── Filtering ──

  const filtered = sessions.filter(session => {
    const matchesSearch =
      session.user_name.toLowerCase().includes(search.toLowerCase()) ||
      session.package_name.toLowerCase().includes(search.toLowerCase())
    const matchesAttendance = attendanceFilter === "all" || session.attendance === attendanceFilter
    return matchesSearch && matchesAttendance
  })

  // ── Dialog openers ──

  const openCreate = () => {
    setCreateForm(emptyCreateForm)
    setUserSubscriptions([])
    setIsCreateOpen(true)
  }

  const openEdit = (session: Session) => {
    setEditingSession(session)
    setEditForm({
      session_nb: String(session.session_nb),
      attendance: session.attendance,
      notes: session.notes ?? "",
    })
    setIsEditOpen(true)
  }

  const openDelete = (session: Session) => {
    setDeleteTarget(session)
    setIsDeleteOpen(true)
  }

  // ── Handlers ──

  const handleCreate = async () => {
    setSaving(true)
    try {
      // session_nb is auto-calculated by the backend
      await onCreateSession({
        user_id: createForm.user_id,
        package_id: Number(createForm.package_id),
        attendance: createForm.attendance,
        notes: createForm.notes || undefined,
      })
      toast.success(t("sessions.createSuccess"))
      setIsCreateOpen(false)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sessions.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editingSession) return
    setSaving(true)
    try {
      await onUpdateSession(editingSession.id, {
        session_nb: Number(editForm.session_nb),
        attendance: editForm.attendance,
        notes: editForm.notes || null,
      })
      toast.success(t("sessions.updateSuccess"))
      setIsEditOpen(false)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sessions.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await onDeleteSession(deleteTarget.id)
      toast.success(t("sessions.deleteSuccess"))
      setIsDeleteOpen(false)
      setDeleteTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sessions.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  // Check if create form is valid
  const isCreateValid =
    createForm.user_id && createForm.package_id && createForm.attendance

  // ── Render ──

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("sessions.title")}</CardTitle>
              <CardDescription>{t("sessions.description")}</CardDescription>
            </div>
            <Button className="gap-2" onClick={openCreate}>
              <CalendarPlus className="h-4 w-4" />
              {t("sessions.addSession")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search + filter bar */}
          <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("sessions.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-8"
              />
            </div>
            <Select value={attendanceFilter} onValueChange={(v) => setAttendanceFilter(v as Attendance | "all")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("sessions.allAttendance")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sessions.allAttendance")}</SelectItem>
                <SelectItem value="attended">{t("sessions.attended")}</SelectItem>
                <SelectItem value="booked">{t("sessions.booked")}</SelectItem>
                <SelectItem value="cancelled">{t("sessions.cancelled")}</SelectItem>
                <SelectItem value="cancelled - no charge">{t("sessions.cancelledNoCharge")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content: error / loading / table */}
          {error ? (
            <div className="flex flex-col items-center justify-center py-20 text-destructive gap-2">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-medium">{t("sessions.loadFailed")}</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sessions.client")}</TableHead>
                      <TableHead>{t("sessions.date")}</TableHead>
                      <TableHead className="hidden md:table-cell">{t("sessions.package")}</TableHead>
                      <TableHead className="hidden md:table-cell">{t("sessions.sessionNb")}</TableHead>
                      <TableHead>{t("sessions.attendance")}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t("sessions.notes")}</TableHead>
                      <TableHead className="w-[50px]">{t("sessions.actions")}</TableHead>
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
                      filtered.map((session) => {
                        const { date, time } = formatDateTime(session.created_at)
                        return (
                          <TableRow
                            key={session.id}
                            className="group cursor-pointer"
                            onClick={() => navigate(`/users/${session.user_id}`)}
                          >
                            <TableCell className="text-sm font-medium">{session.user_name}</TableCell>
                            <TableCell className="text-sm">
                              <span className="text-foreground">{date}</span>
                              <span className="text-muted-foreground ms-1.5 text-xs">{time}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[180px] truncate">
                              {session.package_name}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              #{session.session_nb}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={attendanceColors[session.attendance]}>
                                {t(attendanceKey[session.attendance])}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                              {session.notes || "—"}
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
                                  <DropdownMenuItem onClick={() => openEdit(session)}>
                                    <Pencil className="me-2 h-4 w-4" />
                                    {t("common.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDelete(session)}
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
                  {t("common.showing")} {filtered.length} {t("common.of")} {sessions.length} {t("common.results")}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Create Session Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("sessions.addSession")}</DialogTitle>
            <DialogDescription>{t("sessions.addDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Client selector */}
            <div className="grid gap-2">
              <Label>{t("sessions.client")}</Label>
              <UserCombobox
                users={users}
                value={createForm.user_id}
                onValueChange={(v) => setCreateForm(prev => ({ ...prev, user_id: v, package_id: "" }))}
                placeholder={t("sessions.selectClient")}
              />
            </div>

            {/* Subscription selector — shows after client is picked */}
            <div className="grid gap-2">
              <Label>{t("sessions.subscription")}</Label>
              {loadingSubs ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading subscriptions...
                </div>
              ) : !createForm.user_id ? (
                <p className="text-sm text-muted-foreground py-1">{t("sessions.selectClient")}</p>
              ) : userSubscriptions.length === 0 ? (
                <p className="text-sm text-destructive py-1">{t("sessions.noActiveSubscriptions")}</p>
              ) : (
                <Select
                  value={createForm.package_id}
                  onValueChange={(v) => setCreateForm(prev => ({ ...prev, package_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("sessions.selectSubscription")} />
                  </SelectTrigger>
                  <SelectContent>
                    {userSubscriptions.map(sub => (
                      <SelectItem key={sub.id} value={String(sub.package_id)}>
                        {sub.package_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-4">
              {/* Attendance */}
              <div className="grid gap-2">
                <Label>{t("sessions.attendance")}</Label>
                <Select
                  value={createForm.attendance}
                  onValueChange={(v) => setCreateForm(prev => ({ ...prev, attendance: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("sessions.selectAttendance")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attended">{t("sessions.attended")}</SelectItem>
                    <SelectItem value="booked">{t("sessions.booked")}</SelectItem>
                    <SelectItem value="cancelled">{t("sessions.cancelled")}</SelectItem>
                    <SelectItem value="cancelled - no charge">{t("sessions.cancelledNoCharge")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label>{t("sessions.notes")}</Label>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t("sessions.notesPlaceholder")}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!isCreateValid || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Session Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sessions.editSession")}</DialogTitle>
            <DialogDescription>{t("sessions.editDescription")}</DialogDescription>
          </DialogHeader>
          {editingSession && (
            <p className="text-sm text-muted-foreground">
              {editingSession.user_name} — {editingSession.package_name}
            </p>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("sessions.attendance")}</Label>
                <Select
                  value={editForm.attendance}
                  onValueChange={(v) => setEditForm(prev => ({ ...prev, attendance: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attended">{t("sessions.attended")}</SelectItem>
                    <SelectItem value="booked">{t("sessions.booked")}</SelectItem>
                    <SelectItem value="cancelled">{t("sessions.cancelled")}</SelectItem>
                    <SelectItem value="cancelled - no charge">{t("sessions.cancelledNoCharge")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("sessions.sessionNb")}</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.session_nb}
                  onChange={(e) => setEditForm(prev => ({ ...prev, session_nb: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("sessions.notes")}</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t("sessions.notesPlaceholder")}
                rows={2}
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

      {/* ── Delete Session Dialog ── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sessions.deleteConfirm")}</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {deleteTarget.user_name} — {deleteTarget.package_name} (#{deleteTarget.session_nb})
              </p>
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{t("sessions.deleteWarning")}</p>
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

export default SessionsTable
