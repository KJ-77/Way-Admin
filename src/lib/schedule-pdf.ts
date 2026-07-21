import type { ScheduleSlot } from "@/types"

// ── Weekly schedule → printable PDF ──
//
// We render the week as a standalone, print-optimised HTML document and hand it
// to the browser's native print dialog ("Save as PDF"). This is deliberately
// dependency-free: for a text/grid document like a schedule, print-to-PDF gives
// the highest-quality output (crisp vector text, selectable content, real page
// sizing) — far better than rasterising the dark dashboard UI to an image. The
// generated document uses its own light, branded theme, independent of the app.

// schedule.day_of_week: 0 = Monday … 6 = Sunday
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

// ── Date helpers (kept local + UTC-anchored so YYYY-MM-DD never drifts a day) ──

/** Add `days` to a YYYY-MM-DD string, returning YYYY-MM-DD. */
export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** "21 Jul" for a day-column header. */
function formatDayDate(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
}

/** "21 – 27 July 2026" spanning Monday→Sunday, collapsing a shared month/year. */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" })
  const monthYear = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()
  return sameMonth
    ? `${day(start)} – ${day(end)} ${monthYear(end)}`
    : `${day(start)} ${start.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })} – ${day(end)} ${monthYear(end)}`
}

/** Strip seconds from "HH:MM:SS" → "HH:MM". */
function hm(time: string): string {
  return time.length > 5 ? time.slice(0, 5) : time
}

/** "wheel throwing" → "Wheel Throwing" */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

/** Minimal HTML-entity escaping for user-provided strings (class/tutor names, reasons). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Renders one class card. Visual state cascades: cancelled > fully-booked > normal.
function renderSlot(slot: ScheduleSlot): string {
  const name = slot.class_type_name ? titleCase(slot.class_type_name) : "No class linked"
  const tutor = slot.tutor_name ? escapeHtml(slot.tutor_name) : "No tutor"

  // Headcount chip: "3/8" with a cap, "3 booked" without, nothing when empty.
  let count = ""
  if (slot.capacity != null) count = `${slot.attending_count}/${slot.capacity}`
  else if (slot.attending_count > 0) count = `${slot.attending_count} booked`

  const stateClass = slot.is_cancelled ? "class cancelled" : slot.is_fully_booked ? "class full" : "class"

  let tag = ""
  if (slot.is_cancelled) {
    const reason = slot.cancel_reason ? ` · ${escapeHtml(slot.cancel_reason)}` : ""
    tag = `<div class="tag tag-cancelled">Cancelled${reason}</div>`
  } else if (slot.is_fully_booked) {
    tag = `<div class="tag tag-full">Fully booked</div>`
  }

  return `
    <div class="${stateClass}">
      <div class="time">${hm(slot.start_time)} – ${hm(slot.end_time)}</div>
      <div class="name">${escapeHtml(name)}</div>
      <div class="sub">${tutor}${count ? ` · ${count}` : ""}</div>
      ${tag}
    </div>`
}

// Renders one day column (header + its class cards, sorted by start time).
function renderDay(dayIndex: number, weekStart: string, slots: ScheduleSlot[]): string {
  const date = addDaysYmd(weekStart, dayIndex)
  const daySlots = slots
    .filter(s => s.day_of_week === dayIndex)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const body = daySlots.length
    ? daySlots.map(renderSlot).join("")
    : `<div class="empty">—</div>`

  return `
    <div class="day">
      <div class="day-header">
        <div class="day-name">${DAY_NAMES[dayIndex]}</div>
        <div class="day-date">${formatDayDate(date)}</div>
      </div>
      <div class="classes">${body}</div>
    </div>`
}

/**
 * Builds the full standalone HTML document for the week. Pure + exported so it can
 * be unit-tested without a DOM.
 */
export function buildScheduleHtml(weekStart: string, slots: ScheduleSlot[]): string {
  const generatedOn = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
  const days = Array.from({ length: 7 }, (_, i) => renderDay(i, weekStart, slots)).join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Way Studio — Weekly Schedule (${formatWeekRange(weekStart)})</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #1c1917; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .header {
    display: flex; align-items: flex-end; justify-content: space-between;
    border-bottom: 2px solid #b45309; padding-bottom: 10px; margin-bottom: 14px;
  }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: 3px; color: #b45309; }
  .subtitle { font-size: 13px; color: #57534e; margin-top: 2px; letter-spacing: 0.5px; }
  .meta { text-align: right; }
  .week { font-size: 15px; font-weight: 700; }
  .generated { font-size: 10px; color: #78716c; margin-top: 2px; }
  .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .day { border: 1px solid #e7e5e4; border-radius: 8px; overflow: hidden; }
  .day-header { background: #faf6f0; padding: 6px 4px; text-align: center; border-bottom: 1px solid #e7e5e4; }
  .day-name { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #292524; }
  .day-date { font-size: 10px; color: #a8a29e; margin-top: 1px; }
  .classes { padding: 5px; display: flex; flex-direction: column; gap: 5px; min-height: 90px; }
  .class {
    border-left: 3px solid #b45309; background: #fbfaf9; border-radius: 4px;
    padding: 5px 6px; break-inside: avoid; page-break-inside: avoid;
  }
  .class.full { border-left-color: #b91c1c; background: #fdf3f3; }
  .class.cancelled { border-left-color: #a8a29e; background: #f5f5f4; opacity: 0.7; }
  .class.cancelled .time, .class.cancelled .name { text-decoration: line-through; }
  .class .time { font-size: 11px; font-weight: 700; color: #1c1917; }
  .class .name { font-size: 11px; font-weight: 600; margin-top: 1px; }
  .class .sub { font-size: 10px; color: #78716c; margin-top: 1px; }
  .tag { display: inline-block; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; padding: 1px 4px; border-radius: 3px; }
  .tag-cancelled { background: #e7e5e4; color: #57534e; }
  .tag-full { background: #fee2e2; color: #b91c1c; }
  .empty { color: #d6d3d1; text-align: center; font-size: 12px; padding: 14px 0; }
  .legend { display: flex; gap: 16px; margin-top: 12px; font-size: 10px; color: #78716c; }
  .legend span { display: inline-flex; align-items: center; gap: 5px; }
  .swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  .footer { margin-top: 14px; text-align: center; font-size: 10px; color: #a8a29e; border-top: 1px solid #e7e5e4; padding-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">WAY STUDIO</div>
      <div class="subtitle">Weekly Class Schedule</div>
    </div>
    <div class="meta">
      <div class="week">${formatWeekRange(weekStart)}</div>
      <div class="generated">Generated ${generatedOn}</div>
    </div>
  </div>
  <div class="grid">${days}</div>
  <div class="legend">
    <span><i class="swatch" style="background:#b45309"></i> Class</span>
    <span><i class="swatch" style="background:#b91c1c"></i> Fully booked</span>
    <span><i class="swatch" style="background:#a8a29e"></i> Cancelled</span>
  </div>
  <div class="footer">Way Studio · Beirut, Lebanon</div>
  <script>
    window.onload = function () { window.focus(); window.print(); };
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>`
}

/**
 * Opens the printable schedule in a new window and triggers the print dialog.
 * Returns false if the browser blocked the popup (caller can surface a message).
 */
export function exportScheduleToPdf(weekStart: string, slots: ScheduleSlot[]): boolean {
  const win = window.open("", "_blank", "width=1200,height=800")
  if (!win) return false // popup blocked
  win.document.open()
  win.document.write(buildScheduleHtml(weekStart, slots))
  win.document.close()
  return true
}
