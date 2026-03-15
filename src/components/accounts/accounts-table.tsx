import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Search, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
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
import { adminAccounts as initialAccounts } from "@/data/mock-data"
import type { AdminAccount, AccountRole, AccountStatus } from "@/types"

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  role: "admin" as AccountRole,
  status: "active" as AccountStatus,
}

const AccountsTable = () => {
  const { t } = useTranslation()
  const [accounts, setAccounts] = useState<AdminAccount[]>(initialAccounts)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null)
  const [formData, setFormData] = useState(emptyForm)

  const filteredAccounts = accounts.filter(a => {
    const matchesSearch =
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || a.role === roleFilter
    const matchesStatus = statusFilter === "all" || a.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
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
      phone: account.phone,
      role: account.role,
      status: account.status,
    })
    setIsFormOpen(true)
  }

  const openDelete = (account: AdminAccount) => {
    setDeleteTarget(account)
    setIsDeleteOpen(true)
  }

  const handleSave = () => {
    if (editingAccount) {
      setAccounts(prev =>
        prev.map(a =>
          a.id === editingAccount.id ? { ...a, ...formData } : a
        )
      )
    } else {
      const newAccount: AdminAccount = {
        id: Math.max(...accounts.map(a => a.id)) + 1,
        ...formData,
        created_at: new Date().toISOString().split("T")[0],
      }
      setAccounts(prev => [...prev, newAccount])
    }
    setIsFormOpen(false)
  }

  const handleDelete = () => {
    if (deleteTarget) {
      setAccounts(prev => prev.filter(a => a.id !== deleteTarget.id))
    }
    setIsDeleteOpen(false)
    setDeleteTarget(null)
  }

  const roleBadgeVariant = (role: AccountRole) => {
    switch (role) {
      case "admin": return "default" as const
      case "tutor": return "secondary" as const
      case "receptionist": return "outline" as const
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
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("accounts.allRoles")}</SelectItem>
                  <SelectItem value="admin">{t("accounts.admin")}</SelectItem>
                  <SelectItem value="tutor">{t("accounts.tutor")}</SelectItem>
                  <SelectItem value="receptionist">{t("accounts.receptionist")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("accounts.allStatuses")}</SelectItem>
                  <SelectItem value="active">{t("accounts.active")}</SelectItem>
                  <SelectItem value="suspended">{t("accounts.suspended")}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openCreate}>
                <Plus className="me-1 h-4 w-4" />
                {t("accounts.addAccount")}
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("accounts.name")}</TableHead>
                  <TableHead>{t("accounts.email")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("accounts.phone")}</TableHead>
                  <TableHead>{t("accounts.role")}</TableHead>
                  <TableHead>{t("accounts.status")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("accounts.createdAt")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("common.noResults")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map(account => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.full_name}</TableCell>
                      <TableCell>{account.email}</TableCell>
                      <TableCell className="hidden md:table-cell" dir="ltr">
                        {account.phone}
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(account.role)}>
                          {t(`accounts.${account.role}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={account.status === "active" ? "default" : "destructive"}
                          className={
                            account.status === "active"
                              ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                              : ""
                          }
                        >
                          {t(`accounts.${account.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {account.created_at}
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
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("accounts.phone")}</Label>
              <Input
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="tutor">{t("accounts.tutor")}</SelectItem>
                    <SelectItem value="receptionist">{t("accounts.receptionist")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("accounts.status")}</Label>
                <Select
                  value={formData.status}
                  onValueChange={val => setFormData(prev => ({ ...prev, status: val as AccountStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("accounts.active")}</SelectItem>
                    <SelectItem value="suspended">{t("accounts.suspended")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!formData.full_name || !formData.email}>
              {editingAccount ? t("common.save") : t("common.create")}
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
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AccountsTable
