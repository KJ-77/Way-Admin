export type Gender = "Male" | "Female"
export type Level = "Beginner" | "Mid" | "Advanced"
export type Loyalty = "Low" | "Mid" | "High"
export type ReferralSource = "Referral" | "SCM" | "Walk-In"
export type PackageStatus = "active" | "expired" | "depleted"
// Legacy string-union ClassType was unused and collided with the real
// `class_types` entity below. Removed — the interface is the source of truth.
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
  notes?: string
  // Soft-delete flag. Inactive clients are hidden from the default clients list
  // (toggle "show deleted" to reveal them). Their Cognito login is disabled.
  is_active: boolean
  created_at: string
  updated_at: string
}

// Abstract class concept. Both packages and schedule slots FK into class_types
// so many packages/slots can share a class (e.g. 4-session and 8-session
// Hand Building packages both point at class_type_id = <Hand Building>).
export interface ClassType {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Product catalog — fixed package definitions offered by the studio.
// package_type is the SKU-like display label ("Hand Building - 4 Sessions").
// class_type_id points at the abstract class this package unlocks — two
// packages with the same class_type_id are alternative purchase options for
// the same underlying class.
export interface Package {
  id: number
  package_type: string
  class_type_id: number
  class_type_name: string  // joined via class_types
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
  class_type_id: number
  class_type_name: string
  sessions_included: number
  weight_included: number
  price: number
}

export interface Session {
  id: number
  // The only direct link from sessions — user/package are derived via this FK.
  user_package_id: number
  // Class link — together identify the class occurrence this session is for.
  // NULL on legacy rows that pre-date migration 003; required on all new rows.
  schedule_slot_id: number | null
  class_date: string | null  // "YYYY-MM-DD"
  session_nb: number
  attendance: Attendance
  notes?: string
  created_at: string
  // Joined via user_packages → users / packages
  user_id: string
  package_id: number
  user_name: string
  package_name: string
  // Joined via schedule (LEFT JOIN; null for legacy rows)
  class_name: string | null         // e.g. "wheel throwing explorer"
  class_start_time: string | null   // "HH:MM:SS"
  class_end_time: string | null     // "HH:MM:SS"
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
  class_type_id: number  // FK → class_types.id; the class this slot is an instance of
  class_type_name: string  // joined via class_types
  capacity: number | null  // admin-set headcount cap (informational only — not auto-enforced)
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
  attending_count: number    // sessions on this (slot, week) date with attendance booked|attended
}

// Returned by GET /schedule/:slotId/sessions?date=…
// Powers the class-detail page — single round-trip for the slot (with override
// merged), the date, and the joined session list.
export interface ClassDetailResponse {
  slot: ScheduleSlot
  class_date: string  // YYYY-MM-DD
  sessions: Session[]
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

// ── Communications ──
//
// Mirrors Way-Backend/src/lib/types.ts. Outbound messages are DRAFTED into a queue
// (status 'pending_approval') and only sent once a staff member approves — nothing
// ever sends automatically.
//
// NOTE ON SMS: the studio runs on SMS, and Lebanon has no inbound SMS (no long
// codes, no short codes — only outbound alphanumeric sender IDs). So `direction:
// "inbound"`, `unread_count` and the 'read' status exist in these types but never
// occur today. They're the WhatsApp upgrade path, kept so the UI doesn't need
// rewriting if the studio switches later.

export type MessageDirection = "outbound" | "inbound"
// How a message is delivered. Mirrors Way-Backend's message_channel enum.
//   whatsapp_manual — staff send it by hand from the studio's WhatsApp (live today)
//   sms             — AWS SMS, built but dormant pending AWS production access
//   whatsapp        — reserved for the WhatsApp Business API
export type MessageChannel = "sms" | "whatsapp" | "whatsapp_manual"
export type MessageStatus =
  | "pending_approval"
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "cancelled"
export type MessageKind = "template" | "freeform"
export type MessageTrigger = "client_created" | "item_stage" | "broadcast" | "manual" | "inbound"
export type TemplateCategory = "marketing" | "utility" | "authentication"
export type TemplateStatus = "draft" | "pending" | "approved" | "rejected" | "disabled"
export type BroadcastStatus = "draft" | "pending_approval" | "sending" | "sent" | "cancelled"

export interface MessageTemplate {
  id: number
  name: string
  language: string
  category: TemplateCategory
  // Positional placeholders: {{1}}, {{2}}, …
  body: string
  // Human labels for each placeholder, in order — e.g. ["client name", "stage"]
  variable_labels: string[]
  status: TemplateStatus
  provider_template_id: string | null
  // Compound key wiring this template to an automatic event, e.g. "item_stage:ready"
  trigger_event: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  conversation_id: number
  direction: MessageDirection
  channel: MessageChannel
  status: MessageStatus
  kind: MessageKind
  template_id: number | null
  template_variables: Record<string, string> | null
  // Fully-rendered text, snapshotted at draft time — exactly what the client reads.
  body: string
  trigger: MessageTrigger
  trigger_ref: string | null
  broadcast_id: number | null
  provider_message_id: string | null
  error_code: string | null
  error_message: string | null
  attempt_count: number
  last_attempt_at: string | null
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  sent_at: string | null
  read_at: string | null
  created_at: string
  updated_at: string
  // Joined
  user_id: string
  user_name: string
  phone: string
  template_name: string | null
  template_category: TemplateCategory | null
}

export interface Conversation {
  id: number
  user_id: string
  channel: MessageChannel
  phone: string
  user_name: string
  last_message_at: string | null
  last_message_preview: string | null
  last_inbound_at: string | null
  unread_count: number
  created_at: string
  updated_at: string
}

export interface Broadcast {
  id: number
  name: string
  template_id: number
  template_name: string
  template_variables: Record<string, string>
  channel: MessageChannel
  audience: Record<string, unknown>
  status: BroadcastStatus
  created_by: string | null
  created_at: string
  updated_at: string
  sent_at: string | null
  total_count: number
  sent_count: number
  failed_count: number
  pending_count: number
}

// Clients who matched a broadcast's audience but whose stored phone number couldn't
// be parsed — they were left out of the fan-out and need their number fixed.
export interface SkippedRecipient {
  id: string
  name: string
  phone: string
}

export interface BroadcastCreated extends Broadcast {
  skipped: SkippedRecipient[]
}

/** One chunk of a broadcast send. The UI loops until `remaining` hits 0. */
export interface DrainResult {
  sent: number
  failed: number
  remaining: number
}
