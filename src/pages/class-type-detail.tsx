import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft, GraduationCap, Loader2, AlertCircle, Package as PackageIcon, CalendarClock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"
import { throwIfNotOk } from "@/lib/errors"
import { getBeirutWeekStart, addDays } from "@/hooks/use-schedule"
import type { ClassType, Package, ScheduleSlot } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Class type detail — read-only summary + child collections.
//
// Shows the class's own metadata, then two sub-lists filtered client-side:
//   1. Packages whose class_type_id points at this class.
//   2. Scheduled slots (current week's template) whose class_type_id matches.
//
// Both lists have quick-add CTAs that pre-fill class_type_id on the target
// form via query params (?class_type=<id>). This makes the class → packages /
// class → slots relationship discoverable from the class side, which is how
// Tarek thinks about the model.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const trimHhMm = (t: string) => (t || "").slice(0, 5)

const ClassTypeDetailPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const classTypeId = Number(id)

  const [classType, setClassType] = useState<ClassType | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!classTypeId) {
      setError("Invalid class type ID")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Three parallel reads. Packages and schedule filter client-side —
      // both endpoints are small and we want a single-cache-miss experience.
      // Schedule fetches the current Beirut week's template (the recurring
      // slots this class runs are captured in that response).
      const weekStart = getBeirutWeekStart()
      const [ctRes, pkgRes, schRes] = await Promise.all([
        apiFetch(`/class-types/${classTypeId}`),
        apiFetch(`/packages`),
        apiFetch(`/schedule?week=${weekStart}`),
      ])
      await throwIfNotOk(ctRes, "Failed to load class")
      await throwIfNotOk(pkgRes, "Failed to load packages")
      await throwIfNotOk(schRes, "Failed to load schedule")
      const ct: ClassType = await ctRes.json()
      const allPackages: Package[] = await pkgRes.json()
      const schData: { slots: ScheduleSlot[] } = await schRes.json()
      setClassType(ct)
      setPackages(allPackages.filter((p) => p.class_type_id === classTypeId))
      setSlots(schData.slots.filter((s) => s.class_type_id === classTypeId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [classTypeId])

  useEffect(() => {
    load()
  }, [load])

  // Sort slots by day-of-week + start_time for readable display. Memoized so
  // sort doesn't re-run on every render when the list is stable.
  const sortedSlots = useMemo(() => {
    return [...slots].sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
      return (a.start_time || "").localeCompare(b.start_time || "")
    })
  }, [slots])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !classType) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/class-types")} className="-ms-2">
          <ArrowLeft className="me-1 h-4 w-4" /> {t("common.back")}
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-2 text-destructive">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm font-medium">{error ?? "Class not found"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/class-types")} className="-ms-2">
        <ArrowLeft className="me-1 h-4 w-4" /> {t("common.back")}
      </Button>

      {/* Header — class metadata */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-md bg-primary/10 p-3 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-2xl">{classType.name}</CardTitle>
              {classType.description && (
                <p className="text-sm text-muted-foreground">{classType.description}</p>
              )}
              <Badge
                variant={classType.is_active ? "outline" : "secondary"}
                className="text-[10px] mt-2"
              >
                {classType.is_active ? t("classTypes.active") : t("classTypes.inactive")}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Packages in this class */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">{t("classTypes.packagesInClass")}</CardTitle>
          <Button asChild size="sm" variant="outline">
            {/* Quick-add — the packages page reads ?class_type=<id> to pre-fill
                the class picker. Wired at a follow-up ticket; today the button
                just links there. */}
            <Link to={`/packages?class_type=${classType.id}`}>
              {t("classTypes.addPackage")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2 text-center">
              <div className="rounded-full bg-muted p-4">
                <PackageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t("classTypes.packagesInClassEmpty")}</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {packages.map((pkg) => (
                <Link
                  key={pkg.id}
                  to="/packages"
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{pkg.package_type}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pkg.sessions_included ?? "—"} {t("packages.sessions").toLowerCase()}
                      {pkg.price != null ? ` · $${pkg.price}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled slots for this class */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">{t("classTypes.slotsForClass")}</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link to={`/schedule?class_type=${classType.id}`}>
              {t("classTypes.addSlot")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {sortedSlots.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2 text-center">
              <div className="rounded-full bg-muted p-4">
                <CalendarClock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t("classTypes.slotsForClassEmpty")}</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sortedSlots.map((slot) => {
                const classDate = addDays(getBeirutWeekStart(), slot.day_of_week)
                return (
                  <Link
                    key={slot.id}
                    to={`/schedule/${slot.id}/${classDate}`}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{DAY_NAMES[slot.day_of_week]}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {trimHhMm(slot.start_time)}–{trimHhMm(slot.end_time)}
                        {slot.tutor_name ? ` · ${slot.tutor_name}` : ""}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ClassTypeDetailPage
