export type Gender = "Male" | "Female"
export type Level = "Beginner" | "Mid" | "Advanced"
export type Loyalty = "Low" | "Mid" | "High"
export type ReferralSource = "Referral" | "SCM" | "Walk-In"
export type UserStatus = "Active" | "Dormant"
export type Section = "Studio" | "PC"
export type PackageType = "basic" | "standard" | "premium" // used by mock subscription data
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

// Client subscription to a package (mock data only for now — API TBD)
export interface UserPackage {
  id: number
  purchase_date: string
  user_id: string
  package_type: PackageType
  sessions_included: number
  weight_included: number
  remaining_sessions: number
  remaining_weight: number
  expiry_date: string
  status: PackageStatus
  notes?: string
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
