import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Search, MoreHorizontal, UserPlus, Filter, Eye, Pencil, Trash2,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { users, getTutorName } from "@/data/mock-data"
import type { UserStatus, Level, Section } from "@/types"

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

const levelColors: Record<string, string> = {
  beginner: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  advanced: "bg-purple-500/15 text-purple-400 border-purple-500/30",
}

const loyaltyColors: Record<string, string> = {
  new: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  regular: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  vip: "bg-amber-500/15 text-amber-400 border-amber-500/30",
}

const UsersTable = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all")
  const [levelFilter, setLevelFilter] = useState<Level | "all">("all")
  const [sectionFilter, setSectionFilter] = useState<Section | "all">("all")

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.phone.includes(search)
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    const matchesLevel = levelFilter === "all" || user.level === levelFilter
    const matchesSection = sectionFilter === "all" || user.section === sectionFilter
    return matchesSearch && matchesStatus && matchesLevel && matchesSection
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("users.title")}</CardTitle>
            <CardDescription>{t("users.description")}</CardDescription>
          </div>
          <Button className="gap-2">
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
                <SelectItem value="active">{t("users.active")}</SelectItem>
                <SelectItem value="inactive">{t("users.inactive")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as Level | "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("users.allLevels")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.allLevels")}</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sectionFilter} onValueChange={(v) => setSectionFilter(v as Section | "all")}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t("users.allSections")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.allSections")}</SelectItem>
                <SelectItem value="pottery">Pottery</SelectItem>
                <SelectItem value="glass">Glass</SelectItem>
                <SelectItem value="canvas">Canvas</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
                <TableHead className="w-[50px]">{t("users.actions")}</TableHead>
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
                  <TableRow key={user.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {user.full_name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm capitalize">{user.section}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={levelColors[user.level]}>
                        {user.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className={loyaltyColors[user.loyalty]}>
                        {user.loyalty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[user.status]}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {getTutorName(user.preferred_tutor)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="me-2 h-4 w-4" />
                            {t("users.view")}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Pencil className="me-2 h-4 w-4" />
                            {t("users.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive">
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
      </CardContent>
    </Card>
  )
}

export default UsersTable
