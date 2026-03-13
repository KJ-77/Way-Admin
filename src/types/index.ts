export type Gender = "male" | "female"
export type Level = "beginner" | "intermediate" | "advanced"
export type Loyalty = "new" | "regular" | "vip"
export type ReferralSource = "walk-in" | "social-media" | "friend" | "website" | "other"
export type UserStatus = "active" | "inactive"
export type Section = "pottery" | "glass" | "canvas" | "mixed"
export type PackageType = "basic" | "standard" | "premium"
export type PackageStatus = "active" | "expired" | "depleted"
export type ClassType = "pottery" | "glass" | "canvas" | "mixed-media"
export type Attendance = "present" | "absent" | "late" | "cancelled"

export interface User {
  id: number
  full_name: string
  gender: Gender
  age_group: number
  level: Level
  preferred_tutor: number
  loyalty: Loyalty
  phone: string
  email: string
  first_visit: string
  referral_source: ReferralSource
  status: UserStatus
  section: Section
  notes: string
}

export interface Package {
  id: number
  purchase_date: string
  user_id: number
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
  user_id: number
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
