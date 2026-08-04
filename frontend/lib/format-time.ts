// This system (University of Dodoma) only ever cares about East Africa Time,
// regardless of which timezone a lecturer/admin/student's own browser or OS
// happens to be set to. `toLocaleString()`/`toLocaleTimeString()` without an
// explicit `timeZone` always render in the *viewer's* local timezone, no
// matter what offset was embedded in the source timestamp - so a UTC or even
// an already-EAT-converted string still displays wrong for anyone not
// physically in EAT. Every date/time shown to a user must go through one of
// these instead of a bare `new Date(...).toLocaleString()` call.
const EAT_TIME_ZONE = "Africa/Nairobi"

export function formatDateTimeEAT(value?: string | null, fallback = "TBD"): string {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleString(undefined, { timeZone: EAT_TIME_ZONE })
}

export function formatDateEAT(value?: string | null, fallback = "TBD"): string {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString(undefined, { timeZone: EAT_TIME_ZONE })
}

export function formatTimeEAT(value?: string | null, fallback = "—"): string {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleTimeString(undefined, { timeZone: EAT_TIME_ZONE })
}

// DD/MM/YYYY | HH:MM:SS (24h) - matches the admin system-logs table's
// existing compact style, just pinned to EAT instead of browser-local.
export function formatDateTimeEATCompact(value?: string | null, fallback = "-"): string {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EAT_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("day")}/${get("month")}/${get("year")} | ${get("hour")}:${get("minute")}:${get("second")}`
}
