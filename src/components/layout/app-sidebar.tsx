import { useLocation, Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/contexts/auth-context"
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarClock,
  Package,
  ScrollText,
  GraduationCap,
  Settings,
  UserCog,
  Palette,
  ChevronUp,
  LogOut,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const AppSidebar = () => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const isAdmin = user?.groups.includes("admin")

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?"

  const displayRole = user?.groups[0]
    ? user.groups[0].replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : ""

  const navItems = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.users"), url: "/users", icon: Users },
    { title: t("nav.sessions"), url: "/sessions", icon: CalendarDays },
    { title: t("nav.schedule"), url: "/schedule", icon: CalendarClock },
    { title: t("nav.packages"), url: "/packages", icon: Package },
    { title: t("nav.subscriptions"), url: "/subscriptions", icon: ScrollText },
    { title: t("nav.tutors"), url: "/tutors", icon: GraduationCap },
  ]

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/"
    return location.pathname.startsWith(url)
  }

  return (
    <Sidebar collapsible="icon" side={i18n.language === "ar" ? "right" : "left"} className="border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Palette className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-wide">{t("app.name")}</span>
            <span className="text-[10px] text-muted-foreground">{t("app.tagline")}</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="transition-all duration-200"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/accounts")}
                    tooltip={t("nav.accounts")}
                    className="transition-all duration-200"
                  >
                    <Link to="/accounts">
                      <UserCog className="h-4 w-4" />
                      <span>{t("nav.accounts")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-medium">{user?.name || "User"}</span>
                    <span className="text-[10px] text-muted-foreground">{displayRole}</span>
                  </div>
                  <ChevronUp className="ms-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                side="top"
                align="start"
                sideOffset={8}
              >
                <DropdownMenuItem>
                  <Settings className="me-2 h-4 w-4" />
                  {t("nav.settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="me-2 h-4 w-4" />
                  {t("auth.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export default AppSidebar
