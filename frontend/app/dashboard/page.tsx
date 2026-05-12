"use client"

import Link from "next/link"
import { Suspense } from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LogOut } from "lucide-react"
import { getApiPath } from "@/lib/api-url"
import { DashboardPanel, DashboardShell, MetricCard } from "@/components/dashboard-shell"

type StudentTab = "dashboard" | "exams" | "sessions" | "reports" | "profile"

type MeUser = {
  user_id: number
  full_name: string
  registration_number: string
  email: string
  phone_number?: string | null
  department?: string | null
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
  exam_title: string
  course_code: string
  session_status: string
  score?: number | null
  warning_count: number
}

type MyReportRow = {
  session_id: number
  exam_title: string
  course_code: string
  warning_count: number
  risk_level: string
  total_anomalies: number
  session_status: string
}

function badgeTone(value: string) {
  const normalized = value.toLowerCase()
  if (normalized === "completed" || normalized === "live") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (normalized === "scheduled" || normalized === "medium") return "bg-amber-50 text-amber-700 border-amber-200"
  if (normalized === "high" || normalized === "locked") return "bg-red-50 text-red-700 border-red-200"
  return "bg-slate-50 text-slate-700 border-slate-200"
}

function formatDateTime(value?: string | null) {
  if (!value) return "TBD"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "TBD"
  return date.toLocaleString()
}

function StudentDashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = ((searchParams.get("tab") as StudentTab) || "dashboard")
  const [token, setToken] = useState("")
  const [me, setMe] = useState<MeUser | null>(null)
  const [exams, setExams] = useState<ExamRow[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [reports, setReports] = useState<MyReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [profileMsg, setProfileMsg] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [department, setDepartment] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")
  const [isExiting, setIsExiting] = useState(false)

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
      setDepartment(mePayload.user?.department || "")
      setExams(examsPayload.exams || [])
      setSessions(sessionsPayload.sessions || [])
      setReports(reportsPayload.reports || [])
    } finally {
      setLoading(false)
    }
  }

  async function startExam(examId: number) {
    setError("")
    const res = await fetch(getApiPath("/sessions/start"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ exam_id: examId }),
    })
    const payload = await res.json().catch(() => ({}))
    const sessionId = Number(payload?.session_id)
    if ((res.status === 201 || res.status === 409) && Number.isFinite(sessionId) && sessionId > 0) {
      localStorage.setItem("session_id", String(payload.session_id))
      localStorage.setItem("exam_id", String(examId))
      router.push("/verify")
      return
    }
    setError(payload?.error?.message || "Could not start exam.")
  }

  async function updateProfile() {
    setProfileMsg("")
    const res = await fetch(getApiPath("/users/profile"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, phone_number: phone, department }),
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

  async function uploadBaselineImage(file: File | null) {
    if (!file) return
    setUploadingImage(true)
    setProfileMsg("")
    try {
      const body = new FormData()
      body.append("image", file)
      const res = await fetch(getApiPath("/images/me"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setProfileMsg(payload?.error?.message || "Could not upload image.")
        return
      }
      setProfileMsg("Baseline face image uploaded successfully.")
    } finally {
      setUploadingImage(false)
    }
  }

  async function changePassword() {
    setPasswordMsg("")
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
  }

  async function logout() {
    setIsExiting(true)
    await new Promise((r) => setTimeout(r, 350))
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("session_id")
    localStorage.removeItem("exam_id")
    router.push("/")
  }

  const completed = useMemo(() => sessions.filter(s => s.session_status === "completed").length, [sessions])

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <h1 className="text-xl font-semibold">Loading Student Dashboard</h1>
        </div>
      </main>
    )
  }

  return (
    <DashboardShell
      appName="ProctorAI Student"
      title={tab === "dashboard" ? "Dashboard" : tab.charAt(0).toUpperCase() + tab.slice(1)}
      subtitle={`${me?.full_name || ""} (${me?.registration_number || ""})`}
      sidebarItems={[
        { label: "Dashboard", href: "/dashboard", active: tab === "dashboard" },
        { label: "Exams", href: "/dashboard?tab=exams", active: tab === "exams" },
        { label: "Sessions", href: "/dashboard?tab=sessions", active: tab === "sessions" },
        { label: "Reports", href: "/dashboard?tab=reports", active: tab === "reports" },
        { label: "Profile", href: "/dashboard?tab=profile", active: tab === "profile" },
      ]}
      rightTopSlot={
        <button onClick={() => void logout()} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      }
    >
      {isExiting ? <p className="text-sm text-muted-foreground">Signing out...</p> : null}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {tab === "dashboard" ? (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Available Exams" value={exams.length} />
            <MetricCard label="Completed Sessions" value={completed} />
            <MetricCard label="Reports" value={reports.length} />
          </section>
          <DashboardPanel title="Shortcuts">
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard?tab=exams" className="rounded-md border px-3 py-2 text-sm font-semibold">Go to Exams</Link>
              <Link href="/dashboard?tab=sessions" className="rounded-md border px-3 py-2 text-sm font-semibold">Go to Sessions</Link>
              <Link href="/dashboard?tab=reports" className="rounded-md border px-3 py-2 text-sm font-semibold">Go to Reports</Link>
              <Link href="/dashboard?tab=profile" className="rounded-md border px-3 py-2 text-sm font-semibold">Go to Profile</Link>
            </div>
          </DashboardPanel>
        </>
      ) : null}

      {tab === "exams" ? (
        <DashboardPanel title="Assigned Exams">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                    <td><span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(exam.status)}`}>{exam.status}</span></td>
                    <td className="pr-3">
                      <button onClick={() => void startExam(exam.exam_id)} className="rounded-md bg-[#1a2d5a] px-3 py-1.5 text-xs font-semibold text-white">
                        Start / Resume
                      </button>
                    </td>
                  </tr>
                ))}
                {exams.length === 0 ? <tr><td colSpan={5} className="py-3 pl-3 text-slate-600">No exams assigned.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : null}

      {tab === "sessions" ? (
        <DashboardPanel title="Sessions">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                    <td className="py-2 pl-3">{s.exam_title}</td>
                    <td>{s.course_code}</td>
                    <td><span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(s.session_status)}`}>{s.session_status}</span></td>
                    <td>{s.score ?? "-"}</td>
                    <td>{s.warning_count}</td>
                  </tr>
                ))}
                {sessions.length === 0 ? <tr><td colSpan={5} className="py-3 pl-3 text-slate-600">No sessions yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : null}

      {tab === "reports" ? (
        <DashboardPanel title="Reports">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                    <td className="py-2 pl-3">{r.exam_title}</td>
                    <td>{r.course_code}</td>
                    <td><span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(r.session_status)}`}>{r.session_status}</span></td>
                    <td><span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(r.risk_level)}`}>{r.risk_level}</span></td>
                    <td>{r.total_anomalies}</td>
                    <td>{r.warning_count}</td>
                  </tr>
                ))}
                {reports.length === 0 ? <tr><td colSpan={6} className="py-3 pl-3 text-slate-600">No reports generated yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : null}

      {tab === "profile" ? (
        <>
          <DashboardPanel title="Profile">
            <div className="grid gap-3 md:grid-cols-2">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="rounded-md border p-2 text-sm" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="rounded-md border p-2 text-sm" />
              <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Course / Department" className="rounded-md border p-2 text-sm md:col-span-2" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => void updateProfile()} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white">Save Profile</button>
              <label className="cursor-pointer rounded-md border px-4 py-2 text-sm font-semibold">
                {uploadingImage ? "Uploading..." : "Upload Face Image"}
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => void uploadBaselineImage(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            {profileMsg ? <p className="mt-2 text-sm text-slate-700">{profileMsg}</p> : null}
          </DashboardPanel>
          <DashboardPanel title="Reset Password">
            <div className="grid gap-3 md:grid-cols-2">
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" className="rounded-md border p-2 text-sm" />
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="rounded-md border p-2 text-sm" />
            </div>
            {passwordMsg ? <p className="mt-2 text-sm text-slate-700">{passwordMsg}</p> : null}
            <button onClick={() => void changePassword()} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white">Update Password</button>
          </DashboardPanel>
        </>
      ) : null}
    </DashboardShell>
  )
}

export default function StudentDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background p-6 text-foreground">
          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <h1 className="text-xl font-semibold">Loading Student Dashboard</h1>
          </div>
        </main>
      }
    >
      <StudentDashboardInner />
    </Suspense>
  )
}
