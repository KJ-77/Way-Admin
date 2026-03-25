import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAccounts, type DbSyncError } from "@/hooks/use-accounts"
import type { AdminAccount, AccountRole } from "@/types"

interface FormData {
  full_name: string
  email: string
  phone: string
  role: AccountRole
}

const emptyForm: FormData = {
  full_name: "",
  email: "",
  phone: "",
  role: "admin",
}

const AccountsTable = () => {
  const { t } = useTranslation()
  const { accounts, loading, error, refetch, createAccount, updateAccount, deleteAccount, syncAccountToDb } = useAccounts()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  // Holds account info from a failed DB sync, so the admin can retry
  const [unsyncedAccount, setUnsyncedAccount] = useState<DbSyncError["account"] | null>(null)

  const filteredAccounts = accounts.filter(a => {
    const matchesSearch =
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || a.role === roleFilter
    return matchesSearch && matchesRole
  })

  const openCreate = () => {
    setEditingAccount(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const openEdit = (account: AdminAccount) => {
    setEditingAccount(account)
    setFormData({
      full_name: account.full_name,
      email: account.email,
      phone: account.phone || "",
      role: account.role,
    })
    setIsFormOpen(true)
  }

  const openDelete = (account: AdminAccount) => {
    setDeleteTarget(account)
    setIsDeleteOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, {
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          role: formData.role,
        })
        toast.success(t("accounts.updateSuccess"))
      } else {
        await createAccount({
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          role: formData.role,
        })
        toast.success(t("accounts.createSuccess"))
      }
      setIsFormOpen(false)
      refetch()
    } catch (err) {
      // Check if this is a partial success (Cognito OK, DB failed)
      if (typeof err === "object" && err !== null && "type" in err && (err as DbSyncError).type === "db_sync_failed") {
        const syncErr = err as DbSyncError
        setUnsyncedAccount(syncErr.account)
        setIsFormOpen(false)
        setIsSyncDialogOpen(true)
      } else {
        toast.error(err instanceof Error ? err.message : t("accounts.operationFailed"))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSyncRetry = async () => {
    if (!unsyncedAccount) return
    setSyncing(true)
    try {
      await syncAccountToDb(unsyncedAccount)
      toast.success(t("accounts.syncSuccess"))
      setIsSyncDialogOpen(false)
      setUnsyncedAccount(null)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("accounts.syncFailed"))
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteAccount(deleteTarget.id)
      setIsDeleteOpen(false)
      setDeleteTarget(null)
      refetch()
      toast.success(t("accounts.deleteSuccess"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("accounts.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  const roleBadgeVariant = (role: AccountRole) => {
    switch (role) {
      case "admin": return "default" as const
      case "studio-manager": return "secondary" as const
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("accounts.search")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="ps-8"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("accounts.allRoles")}</SelectItem>
                  <SelectItem value="admin">{t("accounts.admin")}</SelectItem>
                  <SelectItem value="studio-manager">{t("accounts.studio-manager")}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openCreate}>
                <Plus className="me-1 h-4 w-4" />
                {t("accounts.addAccount")}
              </Button>
            </div>
          </div>

          {/* Content */}
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-destructive gap-2">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-medium">Failed to load accounts</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("accounts.name")}</TableHead>
                    <TableHead>{t("accounts.email")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("accounts.phone")}</TableHead>
                    <TableHead>{t("accounts.role")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("accounts.createdAt")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t("common.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.map(account => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.full_name}</TableCell>
                        <TableCell>{account.email}</TableCell>
                        <TableCell className="hidden md:table-cell" dir="ltr">
                          {account.phone || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariant(account.role)}>
                            {t(`accounts.${account.role}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {new Date(account.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(account)}>
                                <Pencil className="me-2 h-4 w-4" />
                                {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDelete(account)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="me-2 h-4 w-4" />
                                {t("common.delete")}
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
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? t("accounts.editAccount") : t("accounts.addAccount")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("accounts.name")}</Label>
              <Input
                value={formData.full_name}
                onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("accounts.email")}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={!!editingAccount}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("accounts.phone")}</Label>
              <Input
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1234567890"
              />
              <p className="text-xs text-muted-foreground">
                {t("accounts.phoneHint")}
              </p>
            </div>
            <div className="grid gap-2">
              <Label>{t("accounts.role")}</Label>
              <Select
                value={formData.role}
                onValueChange={val => setFormData(prev => ({ ...prev, role: val as AccountRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("accounts.admin")}</SelectItem>
                  <SelectItem value="studio-manager">{t("accounts.studio-manager")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!formData.full_name || !formData.email || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAccount ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DB Sync Failed Dialog — shows when Cognito succeeded but DB insert failed */}
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-5 w-5" />
              {t("accounts.syncFailedTitle")}
            </DialogTitle>
            <DialogDescription>{t("accounts.syncFailedDescription")}</DialogDescription>
          </DialogHeader>
          {unsyncedAccount && (
            <div className="rounded-md border p-3 space-y-1 text-sm bg-muted/50">
              <p><span className="text-muted-foreground">{t("accounts.name")}:</span> {unsyncedAccount.full_name}</p>
              <p><span className="text-muted-foreground">{t("accounts.email")}:</span> {unsyncedAccount.email}</p>
              {unsyncedAccount.phone && (
                <p><span className="text-muted-foreground">{t("accounts.phone")}:</span> {unsyncedAccount.phone}</p>
              )}
              <p><span className="text-muted-foreground">{t("accounts.role")}:</span> {t(`accounts.${unsyncedAccount.role}`)}</p>
              <p className="text-xs text-muted-foreground pt-1">ID: {unsyncedAccount.id}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)} disabled={syncing}>
              {t("common.close")}
            </Button>
            <Button onClick={handleSyncRetry} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t("accounts.syncToDb")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("accounts.deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("accounts.deleteWarning")}</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="text-sm text-muted-foreground">
              {deleteTarget.full_name} ({deleteTarget.email})
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

export default AccountsTable
