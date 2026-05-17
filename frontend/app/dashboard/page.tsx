"use client"

import Link from "next/link"
import { Suspense } from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookOpenCheck, ClipboardList, Eye, EyeOff, FileText, LogOut, UserCircle2 } from "lucide-react"
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
  exam_id?: number
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

const DEGREE_PROGRAM_OPTIONS = [
  "Bachelor of Science in Information Technology with Business Analytics",
  "Bachelor of Science in Instructional Design and Information Technology (BSc IDIT)",
  "Bachelor of Science in Multimedia Technology and Animation",
  "Bachelor of Science in Computer Networks and Information Security Engineering (BSc CNISE)",
  "Bachelor of Science in Computer Engineering (BSc CE)",
  "Bachelor of Science in Computer Science (BSc CS)",
  "Bachelor of Science in Software Engineering (BSc SE)",
  "Bachelor of Science in Cyber Security and Digital Forensics Engineering (BSc CSDFE)",
  "Bachelor of Science in Business Information Systems (BSc BIS)",
  "Bachelor of Science in Multimedia Technology and Animation (BSc MTA)",
  "Bachelor of Science in Telecommunication Engineering (BSc TE)",
  "Bachelor of Science in Digital Content and Broadcasting Engineering (BSc DCBE)",
  "Bachelor of Science in Information Systems (BSc IS)",
  "Diploma in Cyber Security and Digital Forensics (Dip. CSDF)",
  "Diploma in Educational Technology (Dip. ET)",
  "Diploma in Information and Communication Technology (Dip. ICT)",
]

function badgeTone(value: string) {
  const normalized = value.toLowerCase()
  if (normalized === "completed" || normalized === "live") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (normalized === "scheduled" || normalized === "medium") return "bg-amber-50 text-amber-700 border-amber-200"
  if (normalized === "high" || normalized === "locked") return "bg-red-50 text-red-700 border-red-200"
  return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState("")
  const [isExiting, setIsExiting] = useState(false)
  const [baselineImageUrl, setBaselineImageUrl] = useState<string | null>(null)
  const [baselineLoadError, setBaselineLoadError] = useState<string | null>(null)

  useEffect(() => {
    const rawToken = localStorage.getItem("token")
    if (!rawToken) {
      router.push("/")
      return
    }
    setToken(rawToken)
    void load(rawToken)
  }, [router])

  useEffect(() => {
    return () => {
      if (baselineImageUrl) URL.revokeObjectURL(baselineImageUrl)
    }
  }, [baselineImageUrl])

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
      await loadBaselineImage(activeToken)
    } finally {
      setLoading(false)
    }
  }

  async function loadBaselineImage(activeToken = token) {
    try {
      const res = await fetch(`${getApiPath("/images/me")}?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
        cache: "no-store",
      })
      if (!res.ok) {
        setBaselineImageUrl(null)
        setBaselineLoadError(res.status === 404 ? null : "Could not load baseline image preview.")
        return
      }
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      setBaselineImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return objectUrl
      })
      setBaselineLoadError(null)
    } catch {
      setBaselineImageUrl(null)
      setBaselineLoadError("Could not load baseline image preview.")
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
    if (res.status === 201 && Number.isFinite(sessionId) && sessionId > 0) {
      localStorage.setItem("session_id", String(payload.session_id))
      localStorage.setItem("exam_id", String(examId))
      router.push("/verify")
      return
    }
    if (res.status === 409) {
      const backendMessage = String(payload?.error?.message || "").toLowerCase()
      localStorage.removeItem("session_id")
      localStorage.removeItem("exam_id")
      if (backendMessage.includes("already has an active exam session")) {
        setError("No active exam session found. Previous attempts are auto-submitted and cannot be resumed. Start a new assigned exam.")
        await load(token)
        return
      }
      await load(token)
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
      await loadBaselineImage(token)
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
  const sessionByExamId = useMemo(() => {
    const map = new Map<number, SessionRow>()
    for (const session of sessions) {
      if (typeof session.exam_id === "number") map.set(session.exam_id, session)
    }
    return map
  }, [sessions])

  return (
    <DashboardShell
      appName="ProctorAI Student"
      title={tab === "dashboard" ? "Dashboard" : tab.charAt(0).toUpperCase() + tab.slice(1)}
      subtitle={`${me?.full_name || "-"} | ${me?.registration_number || "-"} | ${me?.department || "Course not set"}`}
      sidebarItems={[
        { label: "Dashboard", href: "/dashboard", active: tab === "dashboard" },
        { label: "Exams", href: "/dashboard?tab=exams", active: tab === "exams" },
        { label: "Sessions", href: "/dashboard?tab=sessions", active: tab === "sessions" },
        { label: "Reports", href: "/dashboard?tab=reports", active: tab === "reports" },
        { label: "Profile", href: "/dashboard?tab=profile", active: tab === "profile" },
      ]}
      avatarName={me?.full_name}
      avatarImageUrl={baselineImageUrl}
      rightTopSlot={
        <button onClick={() => void logout()} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      }
      isExiting={isExiting}
      exitMessage="Signing out of student account..."
    >
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {loading ? (
        <DashboardPanel title="Loading Student Dashboard">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Preparing your data...
          </div>
        </DashboardPanel>
      ) : null}

      {!loading ? (
      <>
      {tab === "dashboard" ? (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Available Exams" value={exams.length} />
            <MetricCard label="Completed Sessions" value={completed} />
            <MetricCard label="Reports" value={reports.length} />
          </section>
          <DashboardPanel title="Quick Shortcuts" subtitle="Move quickly between core student tasks.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Link href="/dashboard?tab=exams" className="rounded-xl border border-border bg-gradient-to-br from-blue-50 to-indigo-50 p-4 transition hover:shadow-md dark:from-slate-900 dark:to-slate-800">
                <BookOpenCheck className="h-5 w-5 text-[#1a2d5a]" />
                <p className="mt-2 text-sm font-semibold text-foreground">Exams</p>
                <p className="mt-1 text-xs text-muted-foreground">Start your assigned exams.</p>
              </Link>
              <Link href="/dashboard?tab=sessions" className="rounded-xl border border-border bg-gradient-to-br from-emerald-50 to-teal-50 p-4 transition hover:shadow-md dark:from-slate-900 dark:to-slate-800">
                <ClipboardList className="h-5 w-5 text-emerald-700" />
                <p className="mt-2 text-sm font-semibold text-foreground">Sessions</p>
                <p className="mt-1 text-xs text-muted-foreground">Track session status and score.</p>
              </Link>
              <Link href="/dashboard?tab=reports" className="rounded-xl border border-border bg-gradient-to-br from-amber-50 to-orange-50 p-4 transition hover:shadow-md dark:from-slate-900 dark:to-slate-800">
                <FileText className="h-5 w-5 text-amber-700" />
                <p className="mt-2 text-sm font-semibold text-foreground">Reports</p>
                <p className="mt-1 text-xs text-muted-foreground">View anomalies and risk level.</p>
              </Link>
              <Link href="/dashboard?tab=profile" className="rounded-xl border border-border bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 transition hover:shadow-md dark:from-slate-900 dark:to-slate-800">
                <UserCircle2 className="h-5 w-5 text-violet-700" />
                <p className="mt-2 text-sm font-semibold text-foreground">Profile</p>
                <p className="mt-1 text-xs text-muted-foreground">Update required verification info.</p>
              </Link>
            </div>
          </DashboardPanel>
        </>
      ) : null}

      {tab === "exams" ? (
        <DashboardPanel title="Assigned Exams">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
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
                      {(() => {
                        const session = sessionByExamId.get(exam.exam_id)
                        const started = Boolean(session && session.session_status !== "completed" && session.session_status !== "locked")
                        return (
                      <button onClick={() => void startExam(exam.exam_id)} className="rounded-md bg-[#1a2d5a] px-3 py-1.5 text-xs font-semibold text-white">
                        {started ? "Start New Attempt" : "Start Exam"}
                      </button>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
                {exams.length === 0 ? <tr><td colSpan={5} className="py-3 pl-3 text-muted-foreground">No exams assigned.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : null}

      {tab === "sessions" ? (
        <DashboardPanel title="Sessions">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
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
                {sessions.length === 0 ? <tr><td colSpan={5} className="py-3 pl-3 text-muted-foreground">No sessions yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : null}

      {tab === "reports" ? (
        <DashboardPanel title="Reports">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
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
                {reports.length === 0 ? <tr><td colSpan={6} className="py-3 pl-3 text-muted-foreground">No reports generated yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : null}

      {tab === "profile" ? (
        <>
          <DashboardPanel title="Profile">
            <div className="grid gap-3 md:grid-cols-2">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
              <select value={department} onChange={e => setDepartment(e.target.value)} className="rounded-md border border-border bg-background p-2 text-sm text-foreground md:col-span-2">
                <option value="">Select Degree / Course Program</option>
                {DEGREE_PROGRAM_OPTIONS.map((program) => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => void updateProfile()} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white">Save Profile</button>
            </div>
            {profileMsg ? <p className="mt-2 text-sm text-muted-foreground">{profileMsg}</p> : null}
          </DashboardPanel>
          <DashboardPanel title="Baseline Image" subtitle="This image is used for identity verification before exams.">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-xl border border-border bg-muted/40">
                {baselineImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={baselineImageUrl} alt="Baseline preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Status: <span className="font-medium text-foreground">{baselineImageUrl ? "Uploaded" : "Not uploaded"}</span>
                </p>
                {baselineLoadError ? <p className="text-xs text-red-500">{baselineLoadError}</p> : null}
                <label className="w-fit cursor-pointer rounded-md border px-3 py-1.5 text-sm font-semibold">
                  {uploadingImage ? "Uploading..." : baselineImageUrl ? "Replace Image" : "Upload Image"}
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => void uploadBaselineImage(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          </DashboardPanel>
          <DashboardPanel title="Reset Password">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="relative">
                <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full rounded-md border border-border bg-background p-2 pr-10 text-sm text-foreground" />
                <button type="button" onClick={() => setShowCurrentPassword(v => !v)} className="absolute inset-y-0 right-0 px-3 text-muted-foreground" aria-label={showCurrentPassword ? "Hide password" : "Show password"}>
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="w-full rounded-md border border-border bg-background p-2 pr-10 text-sm text-foreground" />
                <button type="button" onClick={() => setShowNewPassword(v => !v)} className="absolute inset-y-0 right-0 px-3 text-muted-foreground" aria-label={showNewPassword ? "Hide password" : "Show password"}>
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {passwordMsg ? <p className="mt-2 text-sm text-muted-foreground">{passwordMsg}</p> : null}
            <button onClick={() => void changePassword()} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white">Update Password</button>
          </DashboardPanel>
        </>
      ) : null}
      </>
      ) : null}
    </DashboardShell>
  )
}

export default function StudentDashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell
          appName="ProctorAI Student"
          title="Dashboard"
          subtitle=""
          sidebarItems={[]}
        >
          <DashboardPanel title="Loading Student Dashboard">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Preparing your data...
            </div>
          </DashboardPanel>
        </DashboardShell>
      }
    >
      <StudentDashboardInner />
    </Suspense>
  )
}
