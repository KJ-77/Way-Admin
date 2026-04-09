import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Search, UserPlus, Filter, Eye, Pencil, Trash2, Loader2, AlertCircle, MoreHorizontal,
} from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import AddUserDialog from "@/components/users/add-user-dialog"
import type { User, Tutor, UserStatus, Level, Section } from "@/types"
import type { CreateUserResponse } from "@/hooks/use-users"

interface UsersTableProps {
  users: User[]
  tutors: Tutor[]
  loading: boolean
  error: string | null
  onRefetch: () => void
  onCreateUser: (body: Record<string, unknown>) => Promise<CreateUserResponse>
  onUpdateUser: (id: string, body: Record<string, unknown>) => Promise<User>
  onDeleteUser: (id: string) => Promise<void>
}

const statusColors: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Dormant: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

const levelColors: Record<string, string> = {
  Beginner: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Mid: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Advanced: "bg-purple-500/15 text-purple-400 border-purple-500/30",
}

const loyaltyColors: Record<string, string> = {
  Low: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Mid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  High: "bg-amber-500/15 text-amber-400 border-amber-500/30",
}

const UsersTable = ({ users, tutors, loading, error, onRefetch, onCreateUser, onUpdateUser, onDeleteUser }: UsersTableProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all")
  const [levelFilter, setLevelFilter] = useState<Level | "all">("all")
  const [sectionFilter, setSectionFilter] = useState<Section | "all">("all")

  // Edit mode — when set, the AddUserDialog opens in edit mode
  const [editTarget, setEditTarget] = useState<User | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (user.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      user.phone.includes(search)
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    const matchesLevel = levelFilter === "all" || user.level === levelFilter
    const matchesSection = sectionFilter === "all" || user.section === sectionFilter
    return matchesSearch && matchesStatus && matchesLevel && matchesSection
  })

  const openEdit = (user: User) => {
    setEditTarget(user)
    setIsAddOpen(true)
  }

  const openCreate = () => {
    setEditTarget(null)
    setIsAddOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    try {
      await onDeleteUser(deleteTarget.id)
      setIsDeleteOpen(false)
      setDeleteTarget(null)
      onRefetch()
      toast.success("Client deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete client")
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
            <CardTitle>{t("users.title")}</CardTitle>
            <CardDescription>{t("users.description")}</CardDescription>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            {t("users.addUser")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("users.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-8"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as UserStatus | "all")}>
              <SelectTrigger className="w-[130px]">
                <Filter className="h-3.5 w-3.5 me-1.5" />
                <SelectValue placeholder={t("users.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.allStatuses")}</SelectItem>
                <SelectItem value="Active">{t("users.active")}</SelectItem>
                <SelectItem value="Dormant">{t("users.dormant")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as Level | "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("users.allLevels")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.allLevels")}</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sectionFilter} onValueChange={(v) => setSectionFilter(v as Section | "all")}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t("users.allSections")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.allSections")}</SelectItem>
                <SelectItem value="Studio">Studio</SelectItem>
                <SelectItem value="PC">PC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-destructive gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm font-medium">Failed to load users</p>
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
                    <TableHead>{t("users.name")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("users.email")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("users.section")}</TableHead>
                    <TableHead>{t("users.level")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("users.loyalty")}</TableHead>
                    <TableHead>{t("users.status")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("users.preferredTutor")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        {t("common.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/users/${user.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {user.full_name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground md:hidden">{user.email || user.phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {user.email || "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm">{user.section || "—"}</span>
                        </TableCell>
                        <TableCell>
                          {user.level ? (
                            <Badge variant="outline" className={levelColors[user.level]}>
                              {user.level}
                            </Badge>
                          ) : <span className="text-sm text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {user.loyalty ? (
                            <Badge variant="outline" className={loyaltyColors[user.loyalty]}>
                              {user.loyalty}
                            </Badge>
                          ) : <span className="text-sm text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {user.status ? (
                            <Badge variant="outline" className={statusColors[user.status]}>
                              {user.status}
                            </Badge>
                          ) : <span className="text-sm text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {user.preferred_tutor != null ? (tutors.find(t => t.id === user.preferred_tutor)?.full_name ?? "Unknown") : "—"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/users/${user.id}`)}>
                                <Eye className="me-2 h-4 w-4" />
                                {t("users.view")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(user)}>
                                <Pencil className="me-2 h-4 w-4" />
                                {t("users.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => { setDeleteTarget(user); setIsDeleteOpen(true) }}
                              >
                                <Trash2 className="me-2 h-4 w-4" />
                                {t("users.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>{t("common.showing")} {filteredUsers.length} {t("common.of")} {users.length} {t("common.results")}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    <AddUserDialog
      open={isAddOpen}
      onOpenChange={(open) => {
        setIsAddOpen(open)
        if (!open) setEditTarget(null) // clear edit target when dialog closes
      }}
      onSuccess={onRefetch}
      onCreateUser={onCreateUser}
      onUpdateUser={onUpdateUser}
      editingUser={editTarget}
    />

    {/* Delete Confirmation Dialog */}
    <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("users.deleteConfirm", "Delete Client")}</DialogTitle>
          <DialogDescription>{t("users.deleteWarning", "Are you sure? This will remove the client from both the database and their login account.")}</DialogDescription>
        </DialogHeader>
        {deleteTarget && (
          <p className="text-sm text-muted-foreground">
            {deleteTarget.full_name} ({deleteTarget.email || deleteTarget.phone})
          </p>
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

export default UsersTable
