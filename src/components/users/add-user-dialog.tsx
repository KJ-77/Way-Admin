import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { CalendarIcon, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import type { Gender, Level, Loyalty, ReferralSource, UserStatus, Section } from "@/types"

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormData {
  full_name: string
  gender: Gender
  dob: Date | undefined
  level: Level
  loyalty: Loyalty
  phone: string
  email: string
  first_visit: Date | undefined
  referral_source: ReferralSource
  status: UserStatus
  section: Section
  preferred_tutor: string
  notes: string
}

const emptyForm: FormData = {
  full_name: "",
  gender: "Male",
  dob: undefined,
  level: "Beginner",
  loyalty: "Low",
  phone: "",
  email: "",
  first_visit: new Date(),
  referral_source: "Walk-In",
  status: "Active",
  section: "Studio",
  preferred_tutor: "",
  notes: "",
}

const AddUserDialog = ({ open, onOpenChange, onSuccess }: AddUserDialogProps) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFormData(emptyForm)
      setSubmitError(null)
    }
  }, [open])

  const isFormValid =
    formData.full_name.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.phone.trim() !== "" &&
    formData.dob !== undefined &&
    formData.first_visit !== undefined

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!isFormValid || !formData.dob || !formData.first_visit) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const body: Record<string, unknown> = {
        full_name: formData.full_name.trim(),
        gender: formData.gender,
        dob: format(formData.dob, "yyyy-MM-dd"),
        level: formData.level,
        loyalty: formData.loyalty,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        first_visit: format(formData.first_visit, "yyyy-MM-dd"),
        referral_source: formData.referral_source,
        status: formData.status,
        section: formData.section,
      }

      if (formData.preferred_tutor.trim()) {
        const tutorId = parseInt(formData.preferred_tutor, 10)
        if (!isNaN(tutorId)) body.preferred_tutor = tutorId
      }

      if (formData.notes.trim()) {
        body.notes = formData.notes.trim()
      }

      const response = await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMsg = errorData?.message
          || errorData?.issues?.map((i: { path: string[], message: string }) => `${i.path.join(".")}: ${i.message}`).join(", ")
          || errorData?.error
          || `Failed to create client: ${response.status}`
        throw new Error(errorMsg)
      }

      onOpenChange(false)
      onSuccess()
      toast.success("Client created successfully")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("users.addUserTitle", "Add New Client")}</DialogTitle>
          <DialogDescription>{t("users.addUserDescription", "Fill in the details to register a new client.")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">{t("users.name")}</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={e => updateField("full_name", e.target.value)}
              placeholder="Full name"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{t("users.email")}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => updateField("email", e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">{t("users.phone")}</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={e => updateField("phone", e.target.value)}
              placeholder="70 123 456"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>{t("users.gender")}</Label>
            <Select value={formData.gender} onValueChange={v => updateField("gender", v as Gender)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label>{t("users.dateOfBirth", "Date of Birth")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.dob && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dob ? format(formData.dob, "PPP") : t("users.pickDate", "Pick a date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="start">
                <Calendar
                  mode="single"
                  selected={formData.dob}
                  onSelect={date => updateField("dob", date)}
                  captionLayout="dropdown"
                  fromYear={1940}
                  toYear={new Date().getFullYear()}
                  defaultMonth={formData.dob}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* First Visit */}
          <div className="space-y-2">
            <Label>{t("users.firstVisit")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.first_visit && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.first_visit ? format(formData.first_visit, "PPP") : t("users.pickDate", "Pick a date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="start">
                <Calendar
                  mode="single"
                  selected={formData.first_visit}
                  onSelect={date => updateField("first_visit", date)}
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={new Date().getFullYear()}
                  defaultMonth={formData.first_visit}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Level */}
          <div className="space-y-2">
            <Label>{t("users.level")}</Label>
            <Select value={formData.level} onValueChange={v => updateField("level", v as Level)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loyalty */}
          <div className="space-y-2">
            <Label>{t("users.loyalty")}</Label>
            <Select value={formData.loyalty} onValueChange={v => updateField("loyalty", v as Loyalty)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>{t("users.status")}</Label>
            <Select value={formData.status} onValueChange={v => updateField("status", v as UserStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Dormant">Dormant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Section */}
          <div className="space-y-2">
            <Label>{t("users.section")}</Label>
            <Select value={formData.section} onValueChange={v => updateField("section", v as Section)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Studio">Studio</SelectItem>
                <SelectItem value="PC">PC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Referral Source */}
          <div className="space-y-2">
            <Label>{t("users.referralSource")}</Label>
            <Select value={formData.referral_source} onValueChange={v => updateField("referral_source", v as ReferralSource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="SCM">SCM</SelectItem>
                <SelectItem value="Walk-In">Walk-In</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preferred Tutor */}
          <div className="space-y-2">
            <Label htmlFor="preferred_tutor">{t("users.preferredTutor")}</Label>
            <Input
              id="preferred_tutor"
              type="number"
              value={formData.preferred_tutor}
              onChange={e => updateField("preferred_tutor", e.target.value)}
              placeholder={t("users.tutorIdPlaceholder", "Tutor ID (optional)")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">{t("users.notes")}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={e => updateField("notes", e.target.value)}
              placeholder={t("users.notesPlaceholder", "Optional notes about this client...")}
              rows={3}
            />
          </div>
        </div>

        {submitError && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{submitError}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !isFormValid}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddUserDialog
