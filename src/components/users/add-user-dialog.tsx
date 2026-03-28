import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import {
  CalendarIcon, Loader2, AlertCircle, Copy, Check, ChevronDown, ChevronUp,
} from "lucide-react"
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
import type { User, Gender, Level, Loyalty, ReferralSource, UserStatus, Section } from "@/types"
import type { CreateUserResponse } from "@/hooks/use-users"

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  onCreateUser: (body: Record<string, unknown>) => Promise<CreateUserResponse>
  onUpdateUser: (id: string, body: Record<string, unknown>) => Promise<User>
  editingUser?: User | null // when set, dialog is in edit mode
}

interface FormData {
  full_name: string
  phone: string
  referral_source: ReferralSource
  email: string
  gender: Gender | ""
  dob: Date | undefined
  level: Level | ""
  loyalty: Loyalty | ""
  first_visit: Date | undefined
  status: UserStatus | ""
  section: Section | ""
  preferred_tutor: string
  notes: string
}

const emptyForm: FormData = {
  full_name: "",
  phone: "",
  referral_source: "Walk-In",
  email: "",
  gender: "",
  dob: undefined,
  level: "",
  loyalty: "",
  first_visit: new Date(),
  status: "",
  section: "",
  preferred_tutor: "",
  notes: "",
}

// Parses a date string into a Date object, returns undefined on failure
const parseDate = (dateStr: string | undefined): Date | undefined => {
  if (!dateStr) return undefined
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? undefined : d
}

// Populates form data from an existing User for edit mode
const userToForm = (user: User): FormData => ({
  full_name: user.full_name,
  phone: user.phone,
  referral_source: user.referral_source,
  email: user.email || "",
  gender: user.gender || "",
  dob: parseDate(user.dob),
  level: user.level || "",
  loyalty: user.loyalty || "",
  first_visit: parseDate(user.first_visit),
  status: user.status || "",
  section: user.section || "",
  preferred_tutor: user.preferred_tutor != null ? String(user.preferred_tutor) : "",
  notes: user.notes || "",
})

// Success dialog shown after creation — shows temp password when email was not provided
const SuccessDialog = ({
  open,
  onClose,
  email,
  phone,
  tempPassword,
}: {
  open: boolean
  onClose: () => void
  email: string
  phone: string
  tempPassword: string | null
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!tempPassword) return
    await navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Client Created</DialogTitle>
          <DialogDescription>
            {tempPassword
              ? "No email provided — share the temporary password with the client."
              : `Temporary password sent to ${email}`}
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Phone: <span className="font-medium text-foreground">{phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono">
                {tempPassword}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The client will be asked to set a new password on first sign-in.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Cognito sent a temporary password to <span className="font-medium text-foreground">{email}</span>.
            The client will be asked to set a new password on first sign-in.
          </p>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const AddUserDialog = ({ open, onOpenChange, onSuccess, onCreateUser, onUpdateUser, editingUser }: AddUserDialogProps) => {
  const { t } = useTranslation()
  const isEditMode = !!editingUser
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // In edit mode, optional fields are always visible
  const [showOptional, setShowOptional] = useState(false)

  // Success state for the temp password dialog (create mode only)
  const [successData, setSuccessData] = useState<{
    email: string
    phone: string
    tempPassword: string | null
  } | null>(null)

  useEffect(() => {
    if (open) {
      setFormData(editingUser ? userToForm(editingUser) : emptyForm)
      setSubmitError(null)
      setShowOptional(!!editingUser)
    }
  }, [open, editingUser])

  const isFormValid =
    formData.full_name.trim() !== "" &&
    formData.phone.trim() !== ""

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // Builds the request body from form state
  const buildBody = (): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      referral_source: formData.referral_source,
    }

    if (formData.email.trim()) body.email = formData.email.trim()
    if (formData.gender) body.gender = formData.gender
    if (formData.dob) body.dob = format(formData.dob, "yyyy-MM-dd")
    if (formData.level) body.level = formData.level
    if (formData.loyalty) body.loyalty = formData.loyalty
    if (formData.first_visit) body.first_visit = format(formData.first_visit, "yyyy-MM-dd")
    if (formData.status) body.status = formData.status
    if (formData.section) body.section = formData.section
    if (formData.preferred_tutor.trim()) {
      const tutorId = parseInt(formData.preferred_tutor, 10)
      if (!isNaN(tutorId)) body.preferred_tutor = tutorId
    }
    if (formData.notes.trim()) body.notes = formData.notes.trim()

    return body
  }

  const handleSubmit = async () => {
    if (!isFormValid) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const body = buildBody()

      if (isEditMode) {
        await onUpdateUser(editingUser!.id, body)
        onOpenChange(false)
        onSuccess()
        toast.success("Client updated successfully")
      } else {
        const result = await onCreateUser(body)
        onOpenChange(false)
        onSuccess()
        setSuccessData({
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          tempPassword: result.tempPassword,
        })
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode
                ? t("users.editUserTitle", "Edit Client")
                : t("users.addUserTitle", "Add New Client")}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? t("users.editUserDescription", "Update client details.")
                : t("users.addUserDescription", "Fill in the details to register a new client.")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            {/* Full Name — required */}
            <div className="space-y-2">
              <Label htmlFor="full_name">{t("users.name")} *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={e => updateField("full_name", e.target.value)}
                placeholder="Full name"
              />
            </div>

            {/* Phone — required, disabled when editing (Cognito username) */}
            <div className="space-y-2">
              <Label htmlFor="phone">{t("users.phone")} *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={e => updateField("phone", e.target.value)}
                placeholder="70 123 456"
                disabled={isEditMode}
              />
              {isEditMode && (
                <p className="text-xs text-muted-foreground">Phone cannot be changed (used as login identifier)</p>
              )}
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
              {!isEditMode && (
                <p className="text-xs text-muted-foreground">
                  {formData.email.trim()
                    ? "Temp password will be emailed to the client"
                    : "No email? You'll get a temp password to share verbally"}
                </p>
              )}
            </div>

            {/* Referral Source — required */}
            <div className="space-y-2">
              <Label>{t("users.referralSource")} *</Label>
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
          </div>

          {/* Collapsible optional fields — always open in edit mode */}
          {!isEditMode && (
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowOptional(!showOptional)}
            >
              {showOptional ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showOptional ? "Hide" : "Show"} optional fields
            </button>
          )}

          {(showOptional || isEditMode) && (
            <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
              {/* Gender */}
              <div className="space-y-2">
                <Label>{t("users.gender")}</Label>
                <Select value={formData.gender} onValueChange={v => updateField("gender", v as Gender)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
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
                    <SelectValue placeholder="Select level" />
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
                    <SelectValue placeholder="Select loyalty" />
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
                    <SelectValue placeholder="Select status" />
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
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Studio">Studio</SelectItem>
                    <SelectItem value="PC">PC</SelectItem>
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
          )}

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
              {isEditMode ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temp password success dialog — create mode only */}
      {successData && (
        <SuccessDialog
          open={!!successData}
          onClose={() => setSuccessData(null)}
          email={successData.email}
          phone={successData.phone}
          tempPassword={successData.tempPassword}
        />
      )}
    </>
  )
}

export default AddUserDialog
