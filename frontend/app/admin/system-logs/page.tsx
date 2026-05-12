"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { getApiPath } from "@/lib/api-url"
import { DashboardPanel, DashboardShell } from "@/components/dashboard-shell"

type AuditLogRow = {
  audit_id: number
  action: string
  actor_user_id?: number | null
  actor_name?: string | null
  target_user_id?: number | null
  ip_address?: string | null
  created_at?: string | null
  created_at_eat?: string | null
}

type SessionRow = {
  session_id: number
  student_name: string
  registration_number: string
  student_email: string
  exam_title: string
  course_code: string
  session_status: string
  warning_count: number
  risk_level: string
  scheduled_at?: string | null
}

const PAGE_SIZE_OPTIONS = [10, 25, 50]

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
  return `${day}/${month}/${year} | ${time}`
}

function humanizeAction(action: string) {
  const clean = (action || "unknown").replace(/[._]+/g, " ").trim()
  if (!clean) return "Unknown Action"
  return clean
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default function AdminLogsPage() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([])
  const [auditQuery, setAuditQuery] = useState("")
  const [auditAction, setAuditAction] = useState("")
  const [auditPageSize, setAuditPageSize] = useState(10)
  const [auditLimit, setAuditLimit] = useState(10)

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [sessionQuery, setSessionQuery] = useState("")
  const [sessionRisk, setSessionRisk] = useState<"all" | "low" | "medium" | "high">("all")
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const rawToken = localStorage.getItem("token")
    if (!rawToken) {
      router.push("/")
      return
    }
    setToken(rawToken)
    void bootstrap(rawToken)
  }, [router])

  async function bootstrap(activeToken: string) {
    setLoading(true)
    setError("")
    try {
      const meRes = await fetch(getApiPath("/auth/me"), {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      const mePayload = await meRes.json().catch(() => ({}))
      if (!meRes.ok || (mePayload?.user?.role !== "admin" && mePayload?.user?.role !== "administrator")) {
        router.push("/")
        return
      }
      await Promise.all([fetchAuditLogs(activeToken, auditLimit), fetchSessions(activeToken)])
    } finally {
      setLoading(false)
    }
  }

  async function fetchAuditLogs(activeToken = token, limit = auditLimit) {
    const params = new URLSearchParams()
    if (auditQuery.trim()) params.set("query", auditQuery.trim())
    if (auditAction.trim()) params.set("action", auditAction.trim())
    params.set("limit", String(limit))
    params.set("offset", "0")
    const res = await fetch(`${getApiPath("/users/audit-logs")}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload?.error?.message || "Failed to load audit logs.")
      return
    }
    setAuditLogs(payload.audit_logs || [])
  }

  async function fetchSessions(activeToken = token) {
    const res = await fetch(getApiPath("/sessions"), {
      headers: { Authorization: `Bearer ${activeToken}` },
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload?.error?.message || "Failed to load session logs.")
      return
    }
    setSessions(payload.sessions || [])
  }

  async function refreshAll() {
    setRefreshing(true)
    setError("")
    try {
      await Promise.all([fetchAuditLogs(token, auditLimit), fetchSessions(token)])
    } finally {
      setRefreshing(false)
    }
  }

  async function logout() {
    setIsExiting(true)
    await new Promise((r) => setTimeout(r, 320))
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("session_id")
    localStorage.removeItem("exam_id")
    router.push("/")
  }

  async function applyAuditFilters() {
    setError("")
    setAuditLimit(auditPageSize)
    await fetchAuditLogs(token, auditPageSize)
  }

  function exportAuditCsv() {
    if (auditLogs.length === 0) return
    const header = ["created_at_eat", "action", "actor_name", "actor_user_id", "target_user_id", "ip_address"]
    const rows = auditLogs.map((r) => [
      r.created_at_eat || r.created_at || "",
      humanizeAction(r.action || ""),
      r.actor_name || "",
      r.actor_user_id ?? "",
      r.target_user_id ?? "",
      r.ip_address || "",
    ])
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredSessions = useMemo(
    () =>
      sessions.filter((s) => {
        const query = sessionQuery.trim().toLowerCase()
        const queryMatch =
          !query ||
          s.student_name.toLowerCase().includes(query) ||
          s.registration_number.toLowerCase().includes(query) ||
          s.student_email.toLowerCase().includes(query) ||
          s.exam_title.toLowerCase().includes(query) ||
          s.course_code.toLowerCase().includes(query)
        const riskMatch = sessionRisk === "all" || s.risk_level === sessionRisk
        return queryMatch && riskMatch
      }),
    [sessionQuery, sessionRisk, sessions],
  )

  return (
    <DashboardShell
      appName="ProctorAI Admin"
      title="System Logs"
      subtitle="Review audit activity and exam session behavior with operational filters."
      avatarName="Admin"
      sidebarItems={[
        { label: "Dashboard", href: "/admin" },
        { label: "Users", href: "/admin/users" },
        { label: "Credentials", href: "/admin/credentials" },
        { label: "Logs", href: "/admin/system-logs", active: true },
        { label: "Reset Password", href: "/admin/reset-password" },
      ]}
      rightTopSlot={
        <div className="flex gap-2">
          <button
            onClick={() => void refreshAll()}
            disabled={refreshing}
            className="rounded-md bg-[#1a2d5a] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {refreshing ? "Refreshing..." : "Refresh All"}
          </button>
          <button onClick={() => void logout()} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      }
      isExiting={isExiting}
      exitMessage="Signing out of admin..."
    >
      {loading ? (
        <DashboardPanel title="Loading Logs">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Fetching audit and session activity...
          </div>
        </DashboardPanel>
      ) : null}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading ? (
      <>
      <DashboardPanel title="Audit Logs" subtitle="Human-readable security actions with date/time and actor details.">
        <div className="grid gap-2 md:grid-cols-3">
          <input
            value={auditQuery}
            onChange={(e) => setAuditQuery(e.target.value)}
            placeholder="Search actor/email/action"
            className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
          />
          <input
            value={auditAction}
            onChange={(e) => setAuditAction(e.target.value)}
            placeholder="Filter action (e.g. auth.login)"
            className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
          />
          <select
            value={auditPageSize}
            onChange={(e) => setAuditPageSize(Number(e.target.value))}
            className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={() => void applyAuditFilters()} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white">
            Apply
          </button>
          <button onClick={exportAuditCsv} className="rounded-md border px-4 py-2 text-sm font-semibold">
            Export CSV
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Date & Time</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target User</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((row) => (
                <tr key={row.audit_id} className="border-b">
                  <td className="py-2">{formatDateTime(row.created_at_eat || row.created_at)}</td>
                  <td>{humanizeAction(row.action || "")}</td>
                  <td>{row.actor_name || row.actor_user_id || "-"}</td>
                  <td>{row.target_user_id || "-"}</td>
                  <td>{row.ip_address || "-"}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={5}>
                    No audit logs found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Session Activity Logs" subtitle="Student session status, warning counts, and risk levels.">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            value={sessionQuery}
            onChange={(e) => setSessionQuery(e.target.value)}
            placeholder="Search student/exam/course/email"
            className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
          />
          <select
            value={sessionRisk}
            onChange={(e) => setSessionRisk(e.target.value as "all" | "low" | "medium" | "high")}
            className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
          >
            <option value="all">all risk levels</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Session ID</th>
                <th>Student</th>
                <th>Reg Number</th>
                <th>Exam</th>
                <th>Status</th>
                <th>Warnings</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((row) => (
                <tr key={row.session_id} className="border-b">
                  <td className="py-2">{row.session_id}</td>
                  <td>{row.student_name}</td>
                  <td>{row.registration_number}</td>
                  <td>{row.exam_title}</td>
                  <td>{row.session_status}</td>
                  <td>{row.warning_count}</td>
                  <td>{row.risk_level}</td>
                </tr>
              ))}
              {filteredSessions.length === 0 && (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={7}>
                    No session logs match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardPanel>
      </>
      ) : null}
    </DashboardShell>
  )
}
