export type Gender = "Male" | "Female"
export type Level = "Beginner" | "Mid" | "Advanced"
export type Loyalty = "Low" | "Mid" | "High"
export type ReferralSource = "Referral" | "SCM" | "Walk-In"
export type UserStatus = "Active" | "Dormant"
export type Section = "Studio" | "PC"
export type PackageStatus = "active" | "expired" | "depleted"
export type ClassType = "pottery" | "glass" | "canvas" | "mixed-media"
export type Attendance = "present" | "absent" | "late" | "cancelled"

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
  date: string
  time: string
  user_id: string
  class_type: ClassType
  package_id: number
  session_nb: number
  deduct_group: number
  session_weight: number
  attendance: Attendance
  notes?: string
}

export interface Tutor {
  id: number
  full_name: string
  email: string
  phone: string
}

export interface ActivityItem {
  id: number
  type: "session" | "package" | "user" | "tutor"
  action: string
  subject: string
  timestamp: string
}

export interface ScheduleEvent {
  id: number
  date: string
  startTime: string
  duration: number
  title: string
  tutorId: number
  classType: ClassType
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
