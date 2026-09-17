import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ChevronDown, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch } from "@/lib/api"
import { friendlyError, throwIfNotOk } from "@/lib/errors"
import { getBeirutToday } from "@/hooks/use-schedule"
import type { Attendance, Session } from "@/types"

const ATTENDANCE_OPTIONS: Attendance[] = ["attended", "booked", "cancelled", "cancelled - no charge"]

// i18n keys can't contain " - ", so the no-charge status has its own key.
const labelKey = (a: Attendance) =>
  `sessions.${a === "cancelled - no charge" ? "cancelledNoCharge" : a}`

interface AttendanceQuickSwapProps {
  session: Session
  // Colour classes for the badge — callers keep their own palette.
  badgeClassName?: string
  // The class occurrence's date (YYYY-MM-DD), used to decide whether "booked" is
  // still a sensible choice. Falls back to the session's own class_date.
  classDate?: string | null
  onChanged: () => void
}

/**
 * The attendance badge, but clickable: tap it and pick a new status.
 *
 * ⚠️ Changing attendance can MOVE MONEY. Switching into "cancelled - no charge"
 * credits a session back to the client's subscription, and switching out of it
 * takes that credit away again (sessionService.attendanceRefundDelta). The backend
 * does this in one transaction with the status change, so the two never disagree.
 *
 * There's deliberately no confirmation step — the ask was a QUICK swap, and every
 * change is reversible by picking the previous status, which reverses the credit
 * exactly. The toast names what changed so a mis-tap is noticed immediately.
 */
const AttendanceQuickSwap = ({
  session, badgeClassName, classDate, onChanged,
}: AttendanceQuickSwapProps) => {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)

  // "booked" means "coming to a future class". Creating a booking for a past date
  // is refused by the backend (PAST_BOOKING), but UPDATING to booked isn't checked
  // there — so the menu enforces it instead. A session that's already booked on a
  // past date still shows as selected; it just can't be chosen fresh.
  const date = classDate ?? session.class_date
  const isPastClass = !!date && date.slice(0, 10) < getBeirutToday()

  const handleChange = async (value: string) => {
    const next = value as Attendance
    if (next === session.attendance) return
    setSaving(true)
    try {
      const res = await apiFetch(`/sessions/${session.id}`, {
        method: "PUT",
        body: JSON.stringify({ attendance: next }),
      })
      await throwIfNotOk(res, "Failed to update attendance")
      toast.success(
        t("sessions.attendanceUpdated", { name: session.user_name, status: t(labelKey(next)) }),
      )
      // The subscription balance may have moved too, so the host should refetch
      // rather than patch the one row locally.
      onChanged()
    } catch (err) {
      // e.g. taking a no-charge credit back from a subscription that's run out.
      toast.error(friendlyError(err, "sessions.operationFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={saving}>
        <button
          type="button"
          aria-label={t("sessions.changeAttendance")}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          <Badge variant="outline" className={`cursor-pointer gap-1 ${badgeClassName ?? ""}`}>
            {t(labelKey(session.attendance))}
            {saving
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <ChevronDown className="h-3 w-3 opacity-70" />}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("sessions.changeAttendance")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={session.attendance} onValueChange={handleChange}>
          {ATTENDANCE_OPTIONS.map(option => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              disabled={option === "booked" && isPastClass && session.attendance !== "booked"}
            >
              {t(labelKey(option))}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default AttendanceQuickSwap
