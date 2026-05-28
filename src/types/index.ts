export type Gender = "Male" | "Female"
export type Level = "Beginner" | "Mid" | "Advanced"
export type Loyalty = "Low" | "Mid" | "High"
export type ReferralSource = "Referral" | "SCM" | "Walk-In"
export type UserStatus = "Active" | "Dormant"
export type Section = "Studio" | "PC"
export type PackageStatus = "active" | "expired" | "depleted"
export type ClassType = "pottery" | "glass" | "canvas" | "mixed-media"
export type Attendance = "attended" | "booked" | "cancelled" | "cancelled - no charge"
// Clay types are admin-managed at runtime (see /clay-types API + clay-types page).
// Kept as a free-form string here; the UI fetches the active list dynamically.
export type ClayType = string
export type TutorSpecialty = "handbuilding" | "wheelthrowing" | "glazing" | "sculpting"
export type SessionPackage =
  | "hand building explorer"
  | "hand building mastery"
  | "wheel throwing explorer"
  | "open studio 1h"
  | "open studio 2h"
  | "open studio 3h"
  | "open studio membership"

export interface User {
  id: string // cognito_sub
  full_name: string
  phone: string
  referral_source: ReferralSource
  gender?: Gender
  dob?: string
  level?: Level
  preferred_tutor?: number | null
  loyalty?: Loyalty
  email?: string
  first_visit?: string
  status?: UserStatus
  section?: Section
  notes?: string
  // Soft-delete flag. Inactive clients are hidden from the default clients list
  // (toggle "show deleted" to reveal them). Their Cognito login is disabled.
  is_active: boolean
  created_at: string
  updated_at: string
}

// Product catalog — fixed package definitions offered by the studio
export interface Package {
  id: number
  package_type: string
  sessions_included: number
  weight_included: number
  price: number
  notes?: string | null
}

// Client subscription — API response includes computed status + joined data
export interface UserPackage {
  id: number
  user_id: string
  package_id: number
  purchase_date: string
  remaining_sessions: number
  remaining_weight: number
  expiry_date: string
  notes: string | null
  // Computed by backend (derived from expiry_date + remaining sessions/weight)
  status: PackageStatus
  // Joined from users table
  user_name: string
  // Joined from packages table
  package_name: string
  sessions_included: number
  weight_included: number
  price: number
}

export interface Session {
  id: number
  // The only direct link from sessions — user/package are derived via this FK.
  user_package_id: number
  session_nb: number
  attendance: Attendance
  notes?: string
  created_at: string
  // Joined via user_packages → users / packages
  user_id: string
  package_id: number
  user_name: string
  package_name: string
}

export interface Tutor {
  id: number
  full_name: string
  email: string
  phone: string
  hourly_rate: number | null
  specialty: TutorSpecialty | null
  notes: string | null
}

export interface ActivityItem {
  id: number
  type: "session" | "package" | "user" | "tutor"
  action: string
  subject: string
  timestamp: string
}

// One slot in the active weekly template merged with the override (if any)
// for the week currently being viewed. The backend always merges before
// responding — the frontend never has to think about the join.
export interface ScheduleSlot {
  id: number
  day_of_week: number  // 0=Monday, 6=Sunday
  start_time: string   // "HH:MM:SS" from Postgres
  end_time: string
  tutor_id: number | null
  package: string | null  // class type enum — also serves as the slot's display title
  tutor_name: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // ── Week-scoped fields (merged from schedule_overrides) ──
  week_start: string         // YYYY-MM-DD (Monday, Asia/Beirut)
  is_fully_booked: boolean   // effective value for this week
  is_cancelled: boolean
  cancel_reason: string | null
  override_id: number | null // null when no override exists for (slot, week)
}

// Returned by GET /schedule?week=…
export interface ScheduleWeekResponse {
  week_start: string
  slots: ScheduleSlot[]
}

// Body for PUT /schedule/:id/override
export interface UpsertOverridePayload {
  week_start: string
  is_fully_booked?: boolean
  is_cancelled?: boolean
  cancel_reason?: string | null
}

// Item stage progression: drying → bisque firing → waiting glaze → glaze firing → ready → picked up
// "discarded" is a terminal stage set manually via edit, not part of normal progression
export type ItemStage = "drying" | "bisque fired" | "waiting glaze" | "glaze fired" | "ready" | "picked up" | "discarded"

export type ItemSection = "Studio" | "PC"

export interface Item {
  id: number
  user_id: string
  user_package_id: number | null
  stage: ItemStage
  section: ItemSection
  description?: string | null
  clay_type?: ClayType | null
  glaze_type?: string | null
  mid_weight: number | null
  final_weight: number | null
  created_at: string
  updated_at: string
  // Joined from users table
  user_name: string
}

export type AccountRole = "admin" | "studio-manager"

export interface AdminAccount {
  id: string // cognito_sub
  full_name: string
  email: string
  phone: string | null
  role: AccountRole
  created_at: string
  updated_at: string
}
