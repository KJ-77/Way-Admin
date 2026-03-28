import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Search, MoreHorizontal, PackagePlus, Filter, Eye, Pencil, Trash2,
} from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { userPackages, getUserName } from "@/data/mock-data"
import type { PackageType, PackageStatus } from "@/types"

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  depleted: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

const typeColors: Record<string, string> = {
  basic: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  standard: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  premium: "bg-purple-500/15 text-purple-400 border-purple-500/30",
}

const SubscriptionsTable = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<PackageType | "all">("all")
  const [statusFilter, setStatusFilter] = useState<PackageStatus | "all">("all")

  const filteredPackages = userPackages.filter(pkg => {
    const clientName = getUserName(pkg.user_id)
    const matchesSearch = clientName.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === "all" || pkg.package_type === typeFilter
    const matchesStatus = statusFilter === "all" || pkg.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("subscriptions.title")}</CardTitle>
            <CardDescription>{t("subscriptions.description")}</CardDescription>
          </div>
          <Button className="gap-2">
            <PackagePlus className="h-4 w-4" />
            {t("subscriptions.addSubscription")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
          <div className="flex gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as PackageType | "all")}>
              <SelectTrigger className="w-[130px]">
                <Filter className="h-3.5 w-3.5 me-1.5" />
                <SelectValue placeholder={t("subscriptions.allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("subscriptions.allTypes")}</SelectItem>
                <SelectItem value="basic">{t("subscriptions.basic")}</SelectItem>
                <SelectItem value="standard">{t("subscriptions.standard")}</SelectItem>
                <SelectItem value="premium">{t("subscriptions.premium")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PackageStatus | "all")}>
              <SelectTrigger className="w-[130px]">
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
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("subscriptions.client")}</TableHead>
                <TableHead>{t("subscriptions.type")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("subscriptions.purchaseDate")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("subscriptions.expiryDate")}</TableHead>
                <TableHead>{t("subscriptions.sessions")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("subscriptions.weight")}</TableHead>
                <TableHead>{t("subscriptions.status")}</TableHead>
                <TableHead className="w-[50px]">{t("subscriptions.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPackages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {t("common.noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPackages.map((pkg) => {
                  const sessionProgress = pkg.sessions_included > 0
                    ? ((pkg.sessions_included - pkg.remaining_sessions) / pkg.sessions_included) * 100
                    : 0

                  return (
                    <TableRow key={pkg.id} className="group">
                      <TableCell className="text-sm font-medium">{getUserName(pkg.user_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeColors[pkg.package_type]}>
                          {pkg.package_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(pkg.purchase_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(pkg.expiry_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={sessionProgress} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {pkg.remaining_sessions}/{pkg.sessions_included}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {pkg.remaining_weight}/{pkg.weight_included} kg
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[pkg.status]}>
                          {pkg.status}
                        </Badge>
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
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pencil className="me-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                              <Trash2 className="me-2 h-4 w-4" />
                              Delete
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
          <span>{t("common.showing")} {filteredPackages.length} {t("common.of")} {userPackages.length} {t("common.results")}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default SubscriptionsTable
