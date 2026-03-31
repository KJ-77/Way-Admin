import { useTranslation } from "react-i18next"
import { Search } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useLocation } from "react-router-dom"

const AppHeader = () => {
  const { t } = useTranslation()
  const location = useLocation()

  const getBreadcrumbs = () => {
    const path = location.pathname
    if (path === "/") return [{ label: t("nav.dashboard"), href: "/" }]

    const segments = path.split("/").filter(Boolean)
    const keyMap: Record<string, string> = {
      users: "nav.users",
      sessions: "nav.sessions",
      schedule: "nav.schedule",
      packages: "nav.packages",
      subscriptions: "nav.subscriptions",
      tutors: "nav.tutors",
      accounts: "nav.accounts",
    }

    return segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/")

      // For numeric segments (like user IDs), show "Client Profile" instead
      if (/^\d+$/.test(segment)) {
        return { label: "Client Profile", href }
      }

      return { label: t(keyMap[segment] ?? segment), href }
    })
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ms-2" />
      <Separator orientation="vertical" className="mx-2 h-4" />

      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <BreadcrumbItem key={crumb.href}>
              {index < breadcrumbs.length - 1 ? (
                <>
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ms-auto flex items-center gap-2">
        <div className="relative hidden md:flex">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("nav.search")}
            className="w-64 ps-8 bg-muted/50 border-transparent focus:border-primary/50 focus:bg-background transition-all"
          />
        </div>

        <LanguageToggle />
        <ModeToggle />
      </div>
    </header>
  )
}

export default AppHeader
