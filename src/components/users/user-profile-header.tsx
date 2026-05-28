import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  ArrowLeft, Mail, Phone, Calendar, MapPin, AlertTriangle, Loader2, RotateCcw,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import ConfirmDialog from "@/components/ui/confirm-dialog"
import { apiFetch } from "@/lib/api"
import type { User } from "@/types"

const statusColors: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Dormant: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

const levelColors: Record<string, string> = {
  Beginner: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Mid: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Advanced: "bg-purple-500/15 text-purple-400 border-purple-500/30",
}

const loyaltyColors: Record<string, string> = {
  Low: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Mid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  High: "bg-amber-500/15 text-amber-400 border-amber-500/30",
}

interface UserProfileHeaderProps {
  user: User
  onUserUpdated?: () => void
  children?: React.ReactNode
}

const UserProfileHeader = ({ user, onUserUpdated, children }: UserProfileHeaderProps) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const initials = user.full_name.split(" ").map(n => n[0]).join("")
  const memberSince = user.first_visit
    ? format(new Date(user.first_visit), "MMMM yyyy")
    : null

  // Restore flow — only visible when viewing a soft-deleted client
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const handleRestore = async () => {
    setRestoring(true)
    try {
      const res = await apiFetch(`/users/${user.id}/restore`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || err?.error || `Failed: ${res.status}`)
      }
      toast.success(t("users.restoreSuccess", "Client restored"))
      setConfirmRestoreOpen(false)
      onUserUpdated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("users.restoreFailed", "Failed to restore client"))
    } finally {
      setRestoring(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/users")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Back to Clients</span>
        </div>

        {/* Deleted-client banner with Restore action */}
        {!user.is_active && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/5 p-3 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t("users.deletedBanner", "This client has been deleted. Their data is preserved and their login is disabled.")}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRestoreOpen(true)}
              disabled={restoring}
            >
              {restoring ? <Loader2 className="me-2 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="me-2 h-3.5 w-3.5" />}
              {t("users.restore", "Restore")}
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{user.full_name}</h1>
              <div className="flex gap-2 flex-wrap">
                {user.status && <Badge variant="outline" className={statusColors[user.status]}>{user.status}</Badge>}
                {user.level && <Badge variant="outline" className={levelColors[user.level]}>{user.level}</Badge>}
                {user.loyalty && <Badge variant="outline" className={loyaltyColors[user.loyalty]}>{user.loyalty} Loyalty</Badge>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:gap-4 sm:flex-wrap">
              {user.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {user.phone}
              </span>
              {user.section && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {user.section} Section
                </span>
              )}
              {memberSince && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since {memberSince}
                </span>
              )}
            </div>

            {/* Quick action buttons (passed from parent) */}
            {children && <div className="pt-1">{children}</div>}
          </div>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmRestoreOpen}
        onOpenChange={setConfirmRestoreOpen}
        title={t("users.restoreConfirmTitle", "Restore this client?")}
        description={t("users.restoreConfirmDescription", "This client will reappear in the active clients list and their login will be re-enabled.")}
        loading={restoring}
        onConfirm={handleRestore}
      />
    </Card>
  )
}

export default UserProfileHeader
