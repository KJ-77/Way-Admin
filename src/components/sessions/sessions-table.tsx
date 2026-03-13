import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Search, MoreHorizontal, CalendarPlus, Filter, Eye, Pencil, Trash2,
} from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { sessions, getUserName } from "@/data/mock-data"
import type { ClassType, Attendance } from "@/types"

const attendanceColors: Record<string, string> = {
  present: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  absent: "bg-red-500/15 text-red-400 border-red-500/30",
  late: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

const classTypeColors: Record<string, string> = {
  pottery: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  glass: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  canvas: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  "mixed-media": "bg-chart-4/15 text-chart-4 border-chart-4/30",
}

const SessionsTable = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<ClassType | "all">("all")
  const [attendanceFilter, setAttendanceFilter] = useState<Attendance | "all">("all")

  const filteredSessions = sessions.filter(session => {
    const clientName = getUserName(session.user_id)
    const matchesSearch = clientName.toLowerCase().includes(search.toLowerCase()) ||
      session.date.includes(search)
    const matchesType = typeFilter === "all" || session.class_type === typeFilter
    const matchesAttendance = attendanceFilter === "all" || session.attendance === attendanceFilter
    return matchesSearch && matchesType && matchesAttendance
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("sessions.title")}</CardTitle>
            <CardDescription>{t("sessions.description")}</CardDescription>
          </div>
          <Button className="gap-2">
            <CalendarPlus className="h-4 w-4" />
            {t("sessions.addSession")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
          <div className="flex gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ClassType | "all")}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-3.5 w-3.5 me-1.5" />
                <SelectValue placeholder={t("sessions.allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sessions.allTypes")}</SelectItem>
                <SelectItem value="pottery">Pottery</SelectItem>
                <SelectItem value="glass">Glass</SelectItem>
                <SelectItem value="canvas">Canvas</SelectItem>
                <SelectItem value="mixed-media">Mixed Media</SelectItem>
              </SelectContent>
            </Select>
            <Select value={attendanceFilter} onValueChange={(v) => setAttendanceFilter(v as Attendance | "all")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("sessions.allAttendance")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sessions.allAttendance")}</SelectItem>
                <SelectItem value="present">{t("sessions.present")}</SelectItem>
                <SelectItem value="absent">{t("sessions.absent")}</SelectItem>
                <SelectItem value="late">{t("sessions.late")}</SelectItem>
                <SelectItem value="cancelled">{t("sessions.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sessions.date")}</TableHead>
                <TableHead>{t("sessions.time")}</TableHead>
                <TableHead>{t("sessions.client")}</TableHead>
                <TableHead>{t("sessions.classType")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("sessions.sessionNb")}</TableHead>
                <TableHead>{t("sessions.attendance")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("sessions.notes")}</TableHead>
                <TableHead className="w-[50px]">{t("sessions.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {t("common.noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions.map((session) => (
                  <TableRow key={session.id} className="group">
                    <TableCell className="text-sm font-medium">
                      {new Date(session.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{session.time}</TableCell>
                    <TableCell className="text-sm font-medium">{getUserName(session.user_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={classTypeColors[session.class_type]}>
                        {session.class_type.replace("-", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      #{session.session_nb}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={attendanceColors[session.attendance]}>
                        {session.attendance}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {session.notes || "—"}
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
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>{t("common.showing")} {filteredSessions.length} {t("common.of")} {sessions.length} {t("common.results")}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default SessionsTable
