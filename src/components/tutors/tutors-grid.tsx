import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Search, UserPlus, Mail, Phone, MoreHorizontal, Pencil, Trash2, Users, CalendarDays,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { tutors, users, sessions } from "@/data/mock-data"

const TutorsGrid = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const filteredTutors = tutors.filter(tutor =>
    tutor.full_name.toLowerCase().includes(search.toLowerCase()) ||
    tutor.email.toLowerCase().includes(search.toLowerCase())
  )

  const getTutorStats = (tutorId: number) => {
    const assignedClients = users.filter(u => u.preferred_tutor === tutorId).length
    const tutorSessions = sessions.filter(s => {
      const user = users.find(u => u.id === s.user_id)
      return user?.preferred_tutor === tutorId
    }).length
    return { assignedClients, tutorSessions }
  }

  const colors = [
    "bg-chart-1/15 text-chart-1",
    "bg-chart-2/15 text-chart-2",
    "bg-chart-3/15 text-chart-3",
    "bg-chart-4/15 text-chart-4",
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("tutors.title")}</CardTitle>
            <CardDescription>{t("tutors.description")}</CardDescription>
          </div>
          <Button className="gap-2">
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

        {filteredTutors.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            {t("common.noResults")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTutors.map((tutor, index) => {
              const stats = getTutorStats(tutor.id)
              return (
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
                    </div>

                    <h3 className="font-semibold text-sm mb-1">{tutor.full_name}</h3>

                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{tutor.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{tutor.phone}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Users className="h-3 w-3" />
                        {stats.assignedClients} {t("tutors.assignedClients").toLowerCase()}
                      </Badge>
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <CalendarDays className="h-3 w-3" />
                        {stats.tutorSessions}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TutorsGrid
