import { describe, it, expect } from "vitest"
import { addDaysYmd, formatWeekRange, buildScheduleHtml } from "@/lib/schedule-pdf"
import type { ScheduleSlot } from "@/types"

// Factory with sensible defaults — override only what a test cares about.
function makeSlot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return {
    id: 1,
    day_of_week: 0,
    start_time: "10:00:00",
    end_time: "12:00:00",
    tutor_id: null,
    class_type_id: 1,
    class_type_name: "hand building",
    capacity: null,
    tutor_name: null,
    deleted_at: null,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    week_start: "2026-07-20",
    is_fully_booked: false,
    is_cancelled: false,
    cancel_reason: null,
    override_id: null,
    attending_count: 0,
    ...overrides,
  }
}

describe("addDaysYmd", () => {
  it("adds days within a month", () => {
    expect(addDaysYmd("2026-07-20", 6)).toBe("2026-07-26")
  })
  it("crosses a month boundary", () => {
    expect(addDaysYmd("2026-07-31", 1)).toBe("2026-08-01")
  })
  it("handles negative offsets", () => {
    expect(addDaysYmd("2026-07-20", -1)).toBe("2026-07-19")
  })
})

describe("formatWeekRange", () => {
  it("collapses a shared month + year", () => {
    expect(formatWeekRange("2026-07-20")).toBe("20 – 26 July 2026")
  })
  it("spans two months", () => {
    expect(formatWeekRange("2026-07-27")).toBe("27 Jul – 2 August 2026")
  })
})

describe("buildScheduleHtml", () => {
  it("includes the studio branding + week range", () => {
    const html = buildScheduleHtml("2026-07-20", [])
    expect(html).toContain("WAY STUDIO")
    expect(html).toContain("Weekly Class Schedule")
    expect(html).toContain("20 – 26 July 2026")
  })

  it("renders all seven day columns", () => {
    const html = buildScheduleHtml("2026-07-20", [])
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
      expect(html).toContain(day)
    }
  })

  it("title-cases the class name", () => {
    const html = buildScheduleHtml("2026-07-20", [makeSlot({ class_type_name: "wheel throwing" })])
    expect(html).toContain("Wheel Throwing")
  })

  it("shows the attending/capacity headcount when a cap is set", () => {
    const html = buildScheduleHtml("2026-07-20", [makeSlot({ capacity: 8, attending_count: 3 })])
    expect(html).toContain("3/8")
  })

  it("shows a plain booked count when there is no cap", () => {
    const html = buildScheduleHtml("2026-07-20", [makeSlot({ capacity: null, attending_count: 5 })])
    expect(html).toContain("5 booked")
  })

  it("flags cancelled classes with the reason", () => {
    const html = buildScheduleHtml("2026-07-20", [
      makeSlot({ is_cancelled: true, cancel_reason: "Tutor sick" }),
    ])
    expect(html).toContain("class cancelled")
    expect(html).toContain("Cancelled · Tutor sick")
  })

  it("flags fully-booked classes", () => {
    const html = buildScheduleHtml("2026-07-20", [makeSlot({ is_fully_booked: true })])
    expect(html).toContain("class full")
    expect(html).toContain("Fully booked")
  })

  it("escapes HTML in tutor + class names to avoid breaking the document", () => {
    const html = buildScheduleHtml("2026-07-20", [
      makeSlot({ tutor_name: 'Ann & "Bob"', class_type_name: "a<b>c" }),
    ])
    expect(html).toContain("Ann &amp; &quot;Bob&quot;")
    expect(html).toContain("A&lt;B&gt;C")
    expect(html).not.toContain("<b>")
  })
})
