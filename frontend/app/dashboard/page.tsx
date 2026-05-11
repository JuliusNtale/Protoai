"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, KeyRound, User } from "lucide-react"
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

  if (loading) {
    return <main className="min-h-screen bg-[#f4f5f7] p-6 text-slate-900"><div className="mx-auto max-w-6xl rounded-xl border bg-white p-5 text-sm text-slate-700">Loading dashboard...</div></main>
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
      rightTopSlot={<User className="h-5 w-5 text-slate-600" />}
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
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Title</th>
                  <th>Course</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.exam_id} className="border-b">
                    <td className="py-2">{exam.title}</td>
                    <td>{exam.course_code}</td>
                    <td>{exam.scheduled_at ? new Date(exam.scheduled_at).toLocaleString() : "TBD"}</td>
                    <td>{exam.status}</td>
                    <td>
                      <button onClick={() => startExam(exam.exam_id)} className="rounded border px-2 py-1 text-xs">Start / Resume</button>
                    </td>
                  </tr>
                ))}
                {exams.length === 0 && <tr><td colSpan={5} className="py-3 text-slate-600">No exams assigned.</td></tr>}
              </tbody>
            </table>
          </div>
        </DashboardPanel>

        <DashboardPanel title="My Sessions & Results">
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Exam</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.session_id} className="border-b">
                    <td className="py-2">{s.exam_title}</td>
                    <td>{s.course_code}</td>
                    <td>{s.session_status}</td>
                    <td>{s.score ?? "-"}</td>
                    <td>{s.warning_count}</td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={5} className="py-3 text-slate-600">No sessions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </DashboardPanel>

        <DashboardPanel title="My Proctoring Reports">
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Exam</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Anomalies</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.session_id} className="border-b">
                    <td className="py-2">{r.exam_title}</td>
                    <td>{r.course_code}</td>
                    <td>{r.session_status}</td>
                    <td>{r.risk_level}</td>
                    <td>{r.total_anomalies}</td>
                    <td>{r.warning_count}</td>
                  </tr>
                ))}
                {reports.length === 0 && <tr><td colSpan={6} className="py-3 text-slate-600">No reports generated yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Profile">
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="rounded-md border bg-white p-2 text-sm text-slate-900 placeholder:text-slate-500" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="rounded-md border bg-white p-2 text-sm text-slate-900 placeholder:text-slate-500" />
          </div>
          {profileMsg && <p className="mt-2 text-sm text-slate-700">{profileMsg}</p>}
          <button onClick={updateProfile} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white">
            Save Profile
          </button>
        </DashboardPanel>

        <DashboardPanel title="Change Password">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-700" />
            <h2 className="text-base font-semibold">Change Password</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" className="rounded-md border bg-white p-2 text-sm text-slate-900 placeholder:text-slate-500" />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="rounded-md border bg-white p-2 text-sm text-slate-900 placeholder:text-slate-500" />
          </div>
          {passwordMsg && <p className="mt-2 text-sm text-slate-700">{passwordMsg}</p>}
          <button onClick={changePassword} disabled={saving} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Updating..." : "Update Password"}
          </button>
        </DashboardPanel>
    </DashboardShell>
  )
}
