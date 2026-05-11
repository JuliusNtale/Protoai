"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getApiPath } from "@/lib/api-url"

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

export default function AdminLogsPage() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([])
  const [auditQuery, setAuditQuery] = useState("")
  const [auditAction, setAuditAction] = useState("")
  const [auditLimit] = useState(200)

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [sessionQuery, setSessionQuery] = useState("")
  const [sessionRisk, setSessionRisk] = useState<"all" | "low" | "medium" | "high">("all")

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
      await Promise.all([fetchAuditLogs(activeToken), fetchSessions(activeToken)])
    } finally {
      setLoading(false)
    }
  }

  async function fetchAuditLogs(activeToken = token) {
    const params = new URLSearchParams()
    if (auditQuery.trim()) params.set("query", auditQuery.trim())
    if (auditAction.trim()) params.set("action", auditAction.trim())
    params.set("limit", String(auditLimit))
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

  function exportAuditCsv() {
    if (auditLogs.length === 0) return
    const header = ["created_at_eat", "action", "actor_name", "actor_user_id", "target_user_id", "ip_address"]
    const rows = auditLogs.map((r) => [
      r.created_at_eat || r.created_at || "",
      r.action || "",
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

  function exportSessionsCsv() {
    if (sessions.length === 0) return
    const header = ["session_id", "student_name", "registration_number", "student_email", "exam_title", "course_code", "session_status", "warning_count", "risk_level", "scheduled_at"]
    const rows = filteredSessions.map((r) => [
      r.session_id,
      r.student_name,
      r.registration_number,
      r.student_email,
      r.exam_title,
      r.course_code,
      r.session_status,
      r.warning_count,
      r.risk_level,
      r.scheduled_at || "",
    ])
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `session_logs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredSessions = sessions.filter((s) => {
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
  })

  if (loading) {
    return <main className="min-h-screen bg-[#f4f5f7] p-6 text-slate-900">Loading logs...</main>
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <h1 className="text-xl font-semibold">System Logs</h1>
          <p className="mt-1 text-sm text-slate-700">Centralized logs for security events and exam session activity.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/admin" className="rounded-md border px-3 py-1.5 text-sm font-semibold">Back to Admin</Link>
            <button onClick={() => { void fetchAuditLogs(); void fetchSessions() }} className="rounded-md bg-[#1a2d5a] px-3 py-1.5 text-sm font-semibold text-white">Refresh All</button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <h2 className="text-lg font-semibold">Audit Logs</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input value={auditQuery} onChange={(e) => setAuditQuery(e.target.value)} placeholder="Search actor/email/action" className="rounded-md border bg-white p-2 text-sm" />
            <input value={auditAction} onChange={(e) => setAuditAction(e.target.value)} placeholder="Filter action (e.g. auth.login)" className="rounded-md border bg-white p-2 text-sm" />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => fetchAuditLogs()} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white">Apply Filters</button>
            <button onClick={exportAuditCsv} className="rounded-md border px-4 py-2 text-sm font-semibold">Export CSV</button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Time (EAT)</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target User</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((row) => (
                  <tr key={row.audit_id} className="border-b">
                    <td className="py-2">{row.created_at_eat ? new Date(row.created_at_eat).toLocaleString() : "-"}</td>
                    <td>{row.action}</td>
                    <td>{row.actor_name || row.actor_user_id || "-"}</td>
                    <td>{row.target_user_id || "-"}</td>
                    <td>{row.ip_address || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <h2 className="text-lg font-semibold">Session Activity Logs</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input value={sessionQuery} onChange={(e) => setSessionQuery(e.target.value)} placeholder="Search student/exam/course/email" className="rounded-md border bg-white p-2 text-sm" />
            <select value={sessionRisk} onChange={(e) => setSessionRisk(e.target.value as "all" | "low" | "medium" | "high")} className="rounded-md border bg-white p-2 text-sm">
              <option value="all">all risk levels</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
          <div className="mt-3">
            <button onClick={exportSessionsCsv} className="rounded-md border px-4 py-2 text-sm font-semibold">Export CSV</button>
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
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

