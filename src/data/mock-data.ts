import type { User, Package, Session, Tutor, ActivityItem, ScheduleEvent, AdminAccount } from "@/types"

export const tutors: Tutor[] = [
  { id: 1, full_name: "Layla Khoury", email: "layla@way-studio.com", phone: "+961 71 234 567" },
  { id: 2, full_name: "Omar Haddad", email: "omar@way-studio.com", phone: "+961 71 345 678" },
  { id: 3, full_name: "Nadia Saab", email: "nadia@way-studio.com", phone: "+961 71 456 789" },
  { id: 4, full_name: "Rami Farah", email: "rami@way-studio.com", phone: "+961 71 567 890" },
]

export const users: User[] = [
  {
    id: 1, full_name: "Sara Mansour", gender: "Female", dob: "1998-05-15T00:00:00.000Z", level: "Mid",
    preferred_tutor: 1, loyalty: "High", phone: "+961 70 111 222", email: "sara.m@gmail.com",
    first_visit: "2024-03-15T00:00:00.000Z", referral_source: "SCM", status: "Active", section: "Studio",
    notes: "Very talented, interested in advanced glazing techniques", created_at: "2024-03-15T10:00:00.000Z", updated_at: "2024-03-15T10:00:00.000Z"
  },
  {
    id: 2, full_name: "Ahmad Bazzi", gender: "Male", dob: "1991-03-22T00:00:00.000Z", level: "Beginner",
    preferred_tutor: 2, loyalty: "Low", phone: "+961 70 222 333", email: "ahmad.b@gmail.com",
    first_visit: "2025-01-10T00:00:00.000Z", referral_source: "Referral", status: "Active", section: "PC",
    notes: "First time working with glass", created_at: "2025-01-10T10:00:00.000Z", updated_at: "2025-01-10T10:00:00.000Z"
  },
  {
    id: 3, full_name: "Mia Chamoun", gender: "Female", dob: "2004-09-10T00:00:00.000Z", level: "Advanced",
    preferred_tutor: 1, loyalty: "High", phone: "+961 70 333 444", email: "mia.c@gmail.com",
    first_visit: "2023-06-20T00:00:00.000Z", referral_source: "SCM", status: "Active", section: "Studio",
    notes: "Professional artist, teaches occasionally", created_at: "2023-06-20T10:00:00.000Z", updated_at: "2023-06-20T10:00:00.000Z"
  },
  {
    id: 4, full_name: "Karim Nassar", gender: "Male", dob: "1984-01-15T00:00:00.000Z", level: "Mid",
    preferred_tutor: 3, loyalty: "Mid", phone: "+961 70 444 555", email: "karim.n@gmail.com",
    first_visit: "2024-07-01T00:00:00.000Z", referral_source: "Walk-In", status: "Active", section: "Studio",
    notes: "", created_at: "2024-07-01T10:00:00.000Z", updated_at: "2024-07-01T10:00:00.000Z"
  },
  {
    id: 5, full_name: "Lina Harb", gender: "Female", dob: "1995-07-20T00:00:00.000Z", level: "Beginner",
    preferred_tutor: 4, loyalty: "Low", phone: "+961 70 555 666", email: "lina.h@gmail.com",
    first_visit: "2025-02-14T00:00:00.000Z", referral_source: "SCM", status: "Active", section: "PC",
    notes: "Wants to try different art forms", created_at: "2025-02-14T10:00:00.000Z", updated_at: "2025-02-14T10:00:00.000Z"
  },
  {
    id: 6, full_name: "Tarek Sleiman", gender: "Male", dob: "1997-11-08T00:00:00.000Z", level: "Mid",
    preferred_tutor: 2, loyalty: "Mid", phone: "+961 70 666 777", email: "tarek.s@gmail.com",
    first_visit: "2024-09-05T00:00:00.000Z", referral_source: "Referral", status: "Active", section: "PC",
    notes: "Making stained glass pieces", created_at: "2024-09-05T10:00:00.000Z", updated_at: "2024-09-05T10:00:00.000Z"
  },
  {
    id: 7, full_name: "Yasmine Azar", gender: "Female", dob: "2000-04-25T00:00:00.000Z", level: "Advanced",
    preferred_tutor: 3, loyalty: "High", phone: "+961 70 777 888", email: "yasmine.a@gmail.com",
    first_visit: "2023-11-12T00:00:00.000Z", referral_source: "SCM", status: "Active", section: "Studio",
    notes: "Specializes in wheel throwing", created_at: "2023-11-12T10:00:00.000Z", updated_at: "2023-11-12T10:00:00.000Z"
  },
  {
    id: 8, full_name: "Rami Khoury", gender: "Male", dob: "1988-02-14T00:00:00.000Z", level: "Beginner",
    preferred_tutor: 1, loyalty: "Low", phone: "+961 70 888 999", email: "rami.k@gmail.com",
    first_visit: "2025-03-01T00:00:00.000Z", referral_source: "Walk-In", status: "Active", section: "Studio",
    notes: "Interested in oil painting", created_at: "2025-03-01T10:00:00.000Z", updated_at: "2025-03-01T10:00:00.000Z"
  },
  {
    id: 9, full_name: "Dina Frem", gender: "Female", dob: "1981-08-30T00:00:00.000Z", level: "Mid",
    preferred_tutor: 4, loyalty: "Mid", phone: "+961 70 999 000", email: "dina.f@gmail.com",
    first_visit: "2024-05-22T00:00:00.000Z", referral_source: "Referral", status: "Dormant", section: "PC",
    notes: "On pause due to travel", created_at: "2024-05-22T10:00:00.000Z", updated_at: "2024-05-22T10:00:00.000Z"
  },
  {
    id: 10, full_name: "Jad Makarem", gender: "Male", dob: "1993-06-12T00:00:00.000Z", level: "Advanced",
    preferred_tutor: 2, loyalty: "High", phone: "+961 70 123 456", email: "jad.m@gmail.com",
    first_visit: "2023-08-30T00:00:00.000Z", referral_source: "SCM", status: "Active", section: "Studio",
    notes: "Working on a personal collection", created_at: "2023-08-30T10:00:00.000Z", updated_at: "2023-08-30T10:00:00.000Z"
  },
  {
    id: 11, full_name: "Nour El Hajj", gender: "Female", dob: "2002-12-01T00:00:00.000Z", level: "Beginner",
    preferred_tutor: 3, loyalty: "Low", phone: "+961 70 234 567", email: "nour.h@gmail.com",
    first_visit: "2025-02-28T00:00:00.000Z", referral_source: "Referral", status: "Active", section: "PC",
    notes: "Birthday gift experience", created_at: "2025-02-28T10:00:00.000Z", updated_at: "2025-02-28T10:00:00.000Z"
  },
  {
    id: 12, full_name: "Ziad Naim", gender: "Male", dob: "1976-03-18T00:00:00.000Z", level: "Mid",
    preferred_tutor: 1, loyalty: "Mid", phone: "+961 70 345 678", email: "ziad.n@gmail.com",
    first_visit: "2024-01-15T00:00:00.000Z", referral_source: "Walk-In", status: "Active", section: "Studio",
    notes: "Retired, comes every week", created_at: "2024-01-15T10:00:00.000Z", updated_at: "2024-01-15T10:00:00.000Z"
  },
]

export const packages: Package[] = [
  {
    id: 1, purchase_date: "2025-01-15", user_id: 1, package_type: "premium",
    sessions_included: 12, weight_included: 24, remaining_sessions: 4, remaining_weight: 8,
    expiry_date: "2025-07-15", status: "active", notes: "VIP discount applied"
  },
  {
    id: 2, purchase_date: "2025-02-01", user_id: 2, package_type: "basic",
    sessions_included: 4, weight_included: 8, remaining_sessions: 3, remaining_weight: 6,
    expiry_date: "2025-05-01", status: "active"
  },
  {
    id: 3, purchase_date: "2024-12-20", user_id: 3, package_type: "premium",
    sessions_included: 12, weight_included: 24, remaining_sessions: 1, remaining_weight: 2,
    expiry_date: "2025-06-20", status: "active"
  },
  {
    id: 4, purchase_date: "2025-01-20", user_id: 4, package_type: "standard",
    sessions_included: 8, weight_included: 16, remaining_sessions: 5, remaining_weight: 10,
    expiry_date: "2025-07-20", status: "active"
  },
  {
    id: 5, purchase_date: "2025-02-14", user_id: 5, package_type: "basic",
    sessions_included: 4, weight_included: 8, remaining_sessions: 4, remaining_weight: 8,
    expiry_date: "2025-05-14", status: "active"
  },
  {
    id: 6, purchase_date: "2024-08-10", user_id: 6, package_type: "standard",
    sessions_included: 8, weight_included: 16, remaining_sessions: 0, remaining_weight: 0,
    expiry_date: "2025-02-10", status: "expired"
  },
  {
    id: 7, purchase_date: "2025-01-05", user_id: 7, package_type: "premium",
    sessions_included: 12, weight_included: 24, remaining_sessions: 7, remaining_weight: 14,
    expiry_date: "2025-07-05", status: "active"
  },
  {
    id: 8, purchase_date: "2025-03-01", user_id: 8, package_type: "basic",
    sessions_included: 4, weight_included: 8, remaining_sessions: 4, remaining_weight: 8,
    expiry_date: "2025-06-01", status: "active"
  },
  {
    id: 9, purchase_date: "2024-06-15", user_id: 9, package_type: "standard",
    sessions_included: 8, weight_included: 16, remaining_sessions: 2, remaining_weight: 4,
    expiry_date: "2024-12-15", status: "expired"
  },
  {
    id: 10, purchase_date: "2025-02-20", user_id: 10, package_type: "premium",
    sessions_included: 12, weight_included: 24, remaining_sessions: 10, remaining_weight: 20,
    expiry_date: "2025-08-20", status: "active"
  },
  {
    id: 11, purchase_date: "2025-03-01", user_id: 11, package_type: "basic",
    sessions_included: 4, weight_included: 8, remaining_sessions: 3, remaining_weight: 6,
    expiry_date: "2025-06-01", status: "active"
  },
  {
    id: 12, purchase_date: "2025-01-10", user_id: 12, package_type: "standard",
    sessions_included: 8, weight_included: 16, remaining_sessions: 3, remaining_weight: 6,
    expiry_date: "2025-07-10", status: "active"
  },
  {
    id: 13, purchase_date: "2025-02-01", user_id: 6, package_type: "standard",
    sessions_included: 8, weight_included: 16, remaining_sessions: 6, remaining_weight: 12,
    expiry_date: "2025-08-01", status: "active"
  },
]

export const sessions: Session[] = [
  { id: 1, date: "2025-03-10", time: "10:00", user_id: 1, class_type: "pottery", package_id: 1, session_nb: 8, deduct_group: 1, session_weight: 2, attendance: "present" },
  { id: 2, date: "2025-03-10", time: "10:00", user_id: 7, class_type: "pottery", package_id: 7, session_nb: 5, deduct_group: 1, session_weight: 2, attendance: "present" },
  { id: 3, date: "2025-03-10", time: "14:00", user_id: 2, class_type: "glass", package_id: 2, session_nb: 1, deduct_group: 2, session_weight: 2, attendance: "present" },
  { id: 4, date: "2025-03-10", time: "14:00", user_id: 6, class_type: "glass", package_id: 13, session_nb: 2, deduct_group: 2, session_weight: 2, attendance: "late" },
  { id: 5, date: "2025-03-11", time: "10:00", user_id: 3, class_type: "canvas", package_id: 3, session_nb: 11, deduct_group: 3, session_weight: 2, attendance: "present" },
  { id: 6, date: "2025-03-11", time: "10:00", user_id: 8, class_type: "canvas", package_id: 8, session_nb: 1, deduct_group: 3, session_weight: 2, attendance: "absent" },
  { id: 7, date: "2025-03-11", time: "14:00", user_id: 4, class_type: "pottery", package_id: 4, session_nb: 3, deduct_group: 4, session_weight: 2, attendance: "present" },
  { id: 8, date: "2025-03-11", time: "16:00", user_id: 5, class_type: "mixed-media", package_id: 5, session_nb: 1, deduct_group: 5, session_weight: 2, attendance: "cancelled" },
  { id: 9, date: "2025-03-12", time: "10:00", user_id: 10, class_type: "pottery", package_id: 10, session_nb: 2, deduct_group: 6, session_weight: 2, attendance: "present" },
  { id: 10, date: "2025-03-12", time: "10:00", user_id: 12, class_type: "canvas", package_id: 12, session_nb: 5, deduct_group: 6, session_weight: 2, attendance: "present" },
  { id: 11, date: "2025-03-12", time: "14:00", user_id: 11, class_type: "glass", package_id: 11, session_nb: 1, deduct_group: 7, session_weight: 2, attendance: "present" },
  { id: 12, date: "2025-03-12", time: "14:00", user_id: 1, class_type: "pottery", package_id: 1, session_nb: 9, deduct_group: 7, session_weight: 2, attendance: "present" },
  { id: 13, date: "2025-03-13", time: "10:00", user_id: 7, class_type: "pottery", package_id: 7, session_nb: 6, deduct_group: 8, session_weight: 2, attendance: "present" },
  { id: 14, date: "2025-03-13", time: "10:00", user_id: 4, class_type: "pottery", package_id: 4, session_nb: 4, deduct_group: 8, session_weight: 2, attendance: "present" },
  { id: 15, date: "2025-03-13", time: "14:00", user_id: 2, class_type: "glass", package_id: 2, session_nb: 2, deduct_group: 9, session_weight: 2, attendance: "present" },
  { id: 16, date: "2025-03-13", time: "16:00", user_id: 3, class_type: "canvas", package_id: 3, session_nb: 12, deduct_group: 10, session_weight: 2, attendance: "present", notes: "Final session of package" },
  { id: 17, date: "2025-03-14", time: "10:00", user_id: 10, class_type: "pottery", package_id: 10, session_nb: 3, deduct_group: 11, session_weight: 2, attendance: "present" },
  { id: 18, date: "2025-03-14", time: "14:00", user_id: 5, class_type: "mixed-media", package_id: 5, session_nb: 1, deduct_group: 12, session_weight: 2, attendance: "present" },
  { id: 19, date: "2025-03-15", time: "10:00", user_id: 1, class_type: "pottery", package_id: 1, session_nb: 10, deduct_group: 13, session_weight: 2, attendance: "present" },
  { id: 20, date: "2025-03-15", time: "14:00", user_id: 6, class_type: "glass", package_id: 13, session_nb: 3, deduct_group: 14, session_weight: 2, attendance: "present" },
]

export const recentActivity: ActivityItem[] = [
  { id: 1, type: "session", action: "completed", subject: "Sara Mansour - Pottery", timestamp: "2025-03-13T16:30:00" },
  { id: 2, type: "package", action: "purchased", subject: "Rami Khoury - Basic Package", timestamp: "2025-03-13T14:00:00" },
  { id: 3, type: "user", action: "registered", subject: "Nour El Hajj", timestamp: "2025-03-13T11:20:00" },
  { id: 4, type: "session", action: "cancelled", subject: "Lina Harb - Mixed Media", timestamp: "2025-03-13T09:45:00" },
  { id: 5, type: "package", action: "expired", subject: "Tarek Sleiman - Standard Package", timestamp: "2025-03-12T23:59:00" },
  { id: 6, type: "session", action: "completed", subject: "Jad Makarem - Pottery", timestamp: "2025-03-12T12:00:00" },
  { id: 7, type: "tutor", action: "updated", subject: "Nadia Saab - Schedule Changed", timestamp: "2025-03-12T10:15:00" },
  { id: 8, type: "user", action: "updated", subject: "Dina Frem - Status: Inactive", timestamp: "2025-03-11T16:00:00" },
]

// Helper to get user name by ID
export function getUserName(userId: number): string {
  return users.find(u => u.id === userId)?.full_name ?? "Unknown"
}

// Helper to get tutor name by ID
export function getTutorName(tutorId: number | null): string {
  if (tutorId === null) return "None"
  return tutors.find(t => t.id === tutorId)?.full_name ?? "Unknown"
}

// Stats calculations
export const stats = {
  totalClients: users.length,
  activeClients: users.filter(u => u.status === "Active").length,
  totalSessions: sessions.length,
  todaySessions: sessions.filter(s => s.date === "2025-03-13").length,
  activePackages: packages.filter(p => p.status === "active").length,
  totalTutors: tutors.length,
  attendanceRate: Math.round((sessions.filter(s => s.attendance === "present").length / sessions.length) * 100),
  vipClients: users.filter(u => u.loyalty === "High").length,
}

// Chart data
export const sessionsByClassType = [
  { name: "Pottery", value: sessions.filter(s => s.class_type === "pottery").length, fill: "var(--color-chart-1)" },
  { name: "Glass", value: sessions.filter(s => s.class_type === "glass").length, fill: "var(--color-chart-2)" },
  { name: "Canvas", value: sessions.filter(s => s.class_type === "canvas").length, fill: "var(--color-chart-3)" },
  { name: "Mixed Media", value: sessions.filter(s => s.class_type === "mixed-media").length, fill: "var(--color-chart-4)" },
]

export const weeklySessionData = [
  { day: "Mon", sessions: 4, attendance: 3 },
  { day: "Tue", sessions: 3, attendance: 2 },
  { day: "Wed", sessions: 4, attendance: 4 },
  { day: "Thu", sessions: 3, attendance: 3 },
  { day: "Fri", sessions: 2, attendance: 2 },
  { day: "Sat", sessions: 5, attendance: 4 },
  { day: "Sun", sessions: 0, attendance: 0 },
]

export const monthlyRevenueData = [
  { month: "Oct", revenue: 4200 },
  { month: "Nov", revenue: 5100 },
  { month: "Dec", revenue: 3800 },
  { month: "Jan", revenue: 6200 },
  { month: "Feb", revenue: 5800 },
  { month: "Mar", revenue: 7100 },
]

export const packageDistribution = [
  { type: "Basic", count: packages.filter(p => p.package_type === "basic").length, fill: "var(--color-chart-2)" },
  { type: "Standard", count: packages.filter(p => p.package_type === "standard").length, fill: "var(--color-chart-4)" },
  { type: "Premium", count: packages.filter(p => p.package_type === "premium").length, fill: "var(--color-chart-1)" },
]

export const clientGrowthData = [
  { month: "Oct", clients: 6 },
  { month: "Nov", clients: 7 },
  { month: "Dec", clients: 8 },
  { month: "Jan", clients: 9 },
  { month: "Feb", clients: 11 },
  { month: "Mar", clients: 12 },
]

export const scheduleEvents: ScheduleEvent[] = [
  // Monday 2025-03-10
  { id: 1, date: "2025-03-10", startTime: "10:00", duration: 120, title: "Pottery Group A", tutorId: 1, classType: "pottery" },
  { id: 2, date: "2025-03-10", startTime: "14:00", duration: 120, title: "Glass Workshop", tutorId: 2, classType: "glass" },
  // Tuesday 2025-03-11
  { id: 3, date: "2025-03-11", startTime: "10:00", duration: 120, title: "Canvas Studio", tutorId: 1, classType: "canvas" },
  { id: 4, date: "2025-03-11", startTime: "14:00", duration: 120, title: "Pottery Basics", tutorId: 3, classType: "pottery" },
  { id: 5, date: "2025-03-11", startTime: "16:00", duration: 90, title: "Mixed Media Intro", tutorId: 4, classType: "mixed-media" },
  // Wednesday 2025-03-12
  { id: 6, date: "2025-03-12", startTime: "10:00", duration: 120, title: "Pottery Advanced", tutorId: 1, classType: "pottery" },
  { id: 7, date: "2025-03-12", startTime: "14:00", duration: 120, title: "Glass Art", tutorId: 2, classType: "glass" },
  // Thursday 2025-03-13
  { id: 8, date: "2025-03-13", startTime: "10:00", duration: 120, title: "Pottery Group B", tutorId: 1, classType: "pottery" },
  { id: 9, date: "2025-03-13", startTime: "14:00", duration: 120, title: "Glass Basics", tutorId: 2, classType: "glass" },
  { id: 10, date: "2025-03-13", startTime: "16:00", duration: 120, title: "Canvas Painting", tutorId: 3, classType: "canvas" },
  // Friday 2025-03-14
  { id: 11, date: "2025-03-14", startTime: "10:00", duration: 120, title: "Pottery Workshop", tutorId: 1, classType: "pottery" },
  { id: 12, date: "2025-03-14", startTime: "14:00", duration: 90, title: "Mixed Media Lab", tutorId: 4, classType: "mixed-media" },
  // Saturday 2025-03-15
  { id: 13, date: "2025-03-15", startTime: "10:00", duration: 120, title: "Pottery Open Studio", tutorId: 1, classType: "pottery" },
  { id: 14, date: "2025-03-15", startTime: "14:00", duration: 120, title: "Glass Workshop", tutorId: 2, classType: "glass" },
]

export const adminAccounts: AdminAccount[] = [
  { id: 1, full_name: "Tarek Ramadan", email: "tarek@way-studio.com", phone: "+961 70 100 200", role: "admin", status: "active", created_at: "2023-01-01" },
  { id: 2, full_name: "Layla Khoury", email: "layla@way-studio.com", phone: "+961 71 234 567", role: "tutor", status: "active", created_at: "2023-06-15" },
  { id: 3, full_name: "Omar Haddad", email: "omar@way-studio.com", phone: "+961 71 345 678", role: "tutor", status: "active", created_at: "2023-06-15" },
  { id: 4, full_name: "Nadia Saab", email: "nadia@way-studio.com", phone: "+961 71 456 789", role: "tutor", status: "active", created_at: "2024-01-10" },
  { id: 5, full_name: "Rami Farah", email: "rami@way-studio.com", phone: "+961 71 567 890", role: "tutor", status: "active", created_at: "2024-03-20" },
  { id: 6, full_name: "Hana Darwish", email: "hana@way-studio.com", phone: "+961 70 300 400", role: "receptionist", status: "active", created_at: "2024-05-01" },
  { id: 7, full_name: "Fadi Moussawi", email: "fadi@way-studio.com", phone: "+961 70 500 600", role: "admin", status: "suspended", created_at: "2023-01-01" },
]
