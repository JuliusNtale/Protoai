"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, KeyRound, LogOut, User } from "lucide-react"
import { getApiPath } from "@/lib/api-url"
import { DashboardPanel, DashboardShell, MetricCard } from "@/components/dashboard-shell"

type MeUser = {
  user_id: number
  full_name: string
  registration_number: string
  email: string
  phone_number?: string | null
  role: string
  must_change_password: boolean
}

type ExamRow = {
  exam_id: number
  title: string
  course_code: string
  duration_min: number
  scheduled_at?: string | null
  status: string
}

type SessionRow = {
  session_id: number
  exam_id: number
  exam_title: string
  course_code: string
  session_status: string
  score?: number | null
  warning_count: number
  scheduled_at?: string | null
}

type MyReportRow = {
  session_id: number
  exam_title: string
  course_code: string
  score?: number | null
  warning_count: number
  risk_level: string
  total_anomalies: number
  session_status: string
}

function formatDateTime(value?: string | null) {
  if (!value) return "TBD"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "TBD"
  return date.toLocaleString()
}

function badgeTone(value: string) {
  const normalized = value.toLowerCase()
  if (normalized === "completed" || normalized === "live") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (normalized === "scheduled" || normalized === "medium") return "bg-amber-50 text-amber-700 border-amber-200"
  if (normalized === "high" || normalized === "locked") return "bg-red-50 text-red-700 border-red-200"
  return "bg-slate-50 text-slate-700 border-slate-200"
}

export default function StudentDashboard() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [me, setMe] = useState<MeUser | null>(null)
  const [exams, setExams] = useState<ExamRow[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [reports, setReports] = useState<MyReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [profileMsg, setProfileMsg] = useState("")

  useEffect(() => {
    const rawToken = localStorage.getItem("token")
    if (!rawToken) {
      router.push("/")
      return
    }
    setToken(rawToken)
    void load(rawToken)
  }, [router])

  async function load(activeToken: string) {
    setLoading(true)
    setError("")
    try {
      const [meRes, examsRes, sessionsRes, reportsRes] = await Promise.all([
        fetch(getApiPath("/auth/me"), { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch(getApiPath("/exams"), { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch(getApiPath("/sessions"), { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch(getApiPath("/reports/my"), { headers: { Authorization: `Bearer ${activeToken}` } }),
      ])
      const mePayload = await meRes.json().catch(() => ({}))
      const examsPayload = await examsRes.json().catch(() => ({}))
      const sessionsPayload = await sessionsRes.json().catch(() => ({}))
      const reportsPayload = await reportsRes.json().catch(() => ({}))

      if (!meRes.ok) {
        setError("Session expired. Sign in again.")
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/")
        return
      }
      if (mePayload?.user?.role === "administrator" || mePayload?.user?.role === "admin") {
        router.push("/admin")
        return
      }
      if (mePayload?.user?.role === "lecturer") {
        router.push("/lecturer")
        return
      }

      setMe(mePayload.user)
      setEmail(mePayload.user?.email || "")
      setPhone(mePayload.user?.phone_number || "")
      setExams(examsPayload.exams || [])
      setSessions(sessionsPayload.sessions || [])
      setReports(reportsPayload.reports || [])
    } finally {
      setLoading(false)
    }
  }

  async function startExam(examId: number) {
    const res = await fetch(getApiPath("/sessions/start"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ exam_id: examId }),
    })
    const payload = await res.json().catch(() => ({}))
    if (res.status === 201 || res.status === 409) {
      localStorage.setItem("session_id", String(payload.session_id))
      localStorage.setItem("exam_id", String(examId))
      router.push("/verify")
      return
    }
    setError(payload?.error?.message || "Could not start exam.")
  }

  async function changePassword() {
    setPasswordMsg("")
    if (!currentPassword || !newPassword) {
      setPasswordMsg("Current and new password are required.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(getApiPath("/auth/change-password"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPasswordMsg(payload?.error?.message || "Could not update password.")
        return
      }
      setCurrentPassword("")
      setNewPassword("")
      setPasswordMsg("Password updated successfully.")
      if (me) {
        const updated = { ...me, must_change_password: false }
        setMe(updated)
        localStorage.setItem("user", JSON.stringify(updated))
      }
    } finally {
      setSaving(false)
    }
  }

  async function updateProfile() {
    setProfileMsg("")
    const res = await fetch(getApiPath("/users/profile"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, phone_number: phone }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setProfileMsg(payload?.error?.message || "Could not update profile.")
      return
    }
    setProfileMsg("Profile updated successfully.")
    if (payload?.user) {
      setMe(payload.user)
      localStorage.setItem("user", JSON.stringify(payload.user))
    }
  }

  const completed = useMemo(() => sessions.filter(s => s.session_status === "completed").length, [sessions])

  function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("session_id")
    localStorage.removeItem("exam_id")
    router.push("/")
  }

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef2f7] p-6 text-slate-900">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a2d5a]/10">
            <span className="absolute h-8 w-8 animate-spin rounded-full border-2 border-[#1a2d5a] border-t-transparent" />
            <span className="absolute h-12 w-12 animate-[spin_2.2s_linear_infinite_reverse] rounded-full border-2 border-blue-300/70 border-b-transparent" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Loading Student Dashboard</h1>
        </div>
      </main>
    )
  }

  return (
    <DashboardShell
      appName="ProctorAI Student"
      title="Student Dashboard"
      subtitle={`${me?.full_name || ""} (${me?.registration_number || ""})`}
      sidebarItems={[
        { label: "Dashboard", active: true },
        { label: "Exams" },
        { label: "Sessions" },
        { label: "Reports" },
        { label: "Profile" },
      ]}
      rightTopSlot={
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-slate-600" />
          <button onClick={logout} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-semibold">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      }
    >
      {error && <p className="text-sm text-red-600">{error}</p>}

        {me?.must_change_password && (
          <DashboardPanel title="First Login Policy">
            <p className="text-sm font-semibold text-amber-800">First Login Policy</p>
            <p className="mt-1 text-sm text-amber-700">You must change your temporary password before continuing regular exam usage.</p>
          </DashboardPanel>
        )}

        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Available Exams" value={exams.length} />
          <MetricCard label="Completed Sessions" value={completed} />
          <MetricCard label="Must Change Password" value={me?.must_change_password ? 1 : 0} />
        </section>

        <DashboardPanel title="Assigned Exams">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-700" />
            <h2 className="text-base font-semibold">Assigned Exams</h2>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="py-2 pl-3">Title</th>
                  <th>Course</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th className="pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.exam_id} className="border-b last:border-b-0">
                    <td className="py-2 pl-3 font-medium">{exam.title}</td>
                    <td>{exam.course_code}</td>
                    <td>{formatDateTime(exam.scheduled_at)}</td>
                    <td>
                      <span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(exam.status)}`}>{exam.status}</span>
                    </td>
                    <td className="pr-3">
                      <button onClick={() => startExam(exam.exam_id)} className="rounded-md bg-[#1a2d5a] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#142145]">Start / Resume</button>
                    </td>
                  </tr>
                ))}
                {exams.length === 0 && <tr><td colSpan={5} className="py-3 pl-3 text-slate-600">No exams assigned.</td></tr>}
              </tbody>
            </table>
          </div>
        </DashboardPanel>

        <DashboardPanel title="My Sessions & Results">
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="py-2 pl-3">Exam</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.session_id} className="border-b last:border-b-0">
                    <td className="py-2 pl-3 font-medium">{s.exam_title}</td>
                    <td>{s.course_code}</td>
                    <td><span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(s.session_status)}`}>{s.session_status}</span></td>
                    <td>{s.score ?? "-"}</td>
                    <td>{s.warning_count}</td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={5} className="py-3 pl-3 text-slate-600">No sessions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </DashboardPanel>

        <DashboardPanel title="My Proctoring Reports">
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="py-2 pl-3">Exam</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Anomalies</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.session_id} className="border-b last:border-b-0">
                    <td className="py-2 pl-3 font-medium">{r.exam_title}</td>
                    <td>{r.course_code}</td>
                    <td><span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(r.session_status)}`}>{r.session_status}</span></td>
                    <td><span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(r.risk_level)}`}>{r.risk_level}</span></td>
                    <td>{r.total_anomalies}</td>
                    <td>{r.warning_count}</td>
                  </tr>
                ))}
                {reports.length === 0 && <tr><td colSpan={6} className="py-3 pl-3 text-slate-600">No reports generated yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Profile">
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          {profileMsg && <p className="mt-2 text-sm text-slate-700">{profileMsg}</p>}
          <button onClick={updateProfile} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#142145]">
            Save Profile
          </button>
        </DashboardPanel>

        <DashboardPanel title="Change Password">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-700" />
            <h2 className="text-base font-semibold">Change Password</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" className="rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          {passwordMsg && <p className="mt-2 text-sm text-slate-700">{passwordMsg}</p>}
          <button onClick={changePassword} disabled={saving} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#142145] disabled:opacity-60">
            {saving ? "Updating..." : "Update Password"}
          </button>
        </DashboardPanel>
    </DashboardShell>
  )
}
