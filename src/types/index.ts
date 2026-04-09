export type Gender = "Male" | "Female"
export type Level = "Beginner" | "Mid" | "Advanced"
export type Loyalty = "Low" | "Mid" | "High"
export type ReferralSource = "Referral" | "SCM" | "Walk-In"
export type UserStatus = "Active" | "Dormant"
export type Section = "Studio" | "PC"
export type PackageStatus = "active" | "expired" | "depleted"
export type ClassType = "pottery" | "glass" | "canvas" | "mixed-media"
export type Attendance = "attended" | "booked" | "cancelled"

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
  user_id: string
  package_id: number
  session_nb: number
  session_weight: number // decimal(10,2)
  attendance: Attendance
  notes?: string
  created_at: string
  // Joined from users + packages
  user_name: string
  package_name: string
}

export interface Tutor {
  id: number
  full_name: string
  email: string
  phone: string
  hourly_rate: number | null
  specialty: string | null
  notes: string | null
}

export interface ActivityItem {
  id: number
  type: "session" | "package" | "user" | "tutor"
  action: string
  subject: string
  timestamp: string
}

export interface ScheduleSlot {
  id: number
  day_of_week: number  // 0=Monday, 6=Sunday
  start_time: string   // "HH:MM:SS" from Postgres
  end_time: string
  title: string
  tutor_id: number | null
  package_id: number | null
  tutor_name: string | null
  package_name: string | null
  created_at: string
  updated_at: string
}

// Item stage progression: drying → bisque fired → waiting glaze → glaze fired → ready
export type ItemStage = "drying" | "bisque fired" | "waiting glaze" | "glaze fired" | "ready"

export type ItemSection = "Studio" | "PC"

export interface Item {
  id: number
  user_id: string
  stage: ItemStage
  section: ItemSection
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
