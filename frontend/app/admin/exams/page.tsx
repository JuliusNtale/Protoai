"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, LogOut } from "lucide-react"
import { getApiPath } from "@/lib/api-url"
import { DashboardPanel, DashboardShell } from "@/components/dashboard-shell"

type ExamRow = {
  exam_id: number
  title: string
  course_code: string
  duration_min: number
  scheduled_at?: string | null
  status: string
  lecturer_id?: number | null
  lecturer_name?: string | null
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
  if (normalized === "scheduled") return "bg-amber-50 text-amber-700 border-amber-200"
  if (normalized === "draft") return "bg-slate-50 text-slate-700 border-slate-200"
  return "bg-red-50 text-red-700 border-red-200"
}

export default function AdminExamsPage() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [msg, setMsg] = useState("")
  const [isExiting, setIsExiting] = useState(false)
  const [deletingExamId, setDeletingExamId] = useState<number | null>(null)
  const [exams, setExams] = useState<ExamRow[]>([])

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
      if (!meRes.ok || (mePayload?.user?.role !== "administrator" && mePayload?.user?.role !== "admin")) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/")
        return
      }

      await fetchExams(activeToken)
    } finally {
      setLoading(false)
    }
  }

  async function fetchExams(activeToken = token) {
    setError("")
    const res = await fetch(getApiPath("/exams"), {
      headers: { Authorization: `Bearer ${activeToken}` },
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload?.error?.message || "Could not load exams.")
      return
    }
    setExams(payload.exams || [])
  }

  async function deleteExam(exam: ExamRow) {
    const ok = window.confirm(`Delete exam "${exam.title}" (${exam.course_code})? This cannot be undone.`)
    if (!ok) return

    setDeletingExamId(exam.exam_id)
    setError("")
    setMsg("")
    try {
      const res = await fetch(getApiPath(`/exams/${exam.exam_id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(payload?.error?.message || "Could not delete exam.")
        return
      }
      setMsg(`Deleted exam: ${exam.title}`)
      await fetchExams(token)
    } finally {
      setDeletingExamId(null)
    }
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

  return (
    <DashboardShell
      appName="ProctorAI Admin"
      title="Exams"
      subtitle="View all exams, associated lecturers, and remove invalid drafts or unwanted exams."
      avatarName="Admin"
      sidebarItems={[
        { label: "Dashboard", href: "/admin" },
        { label: "Users", href: "/admin/users" },
        { label: "Exams", href: "/admin/exams", active: true },
        { label: "Credentials", href: "/admin/credentials" },
        { label: "Logs", href: "/admin/system-logs" },
        { label: "Reset Password", href: "/admin/reset-password" },
      ]}
      rightTopSlot={
        <div className="flex items-center gap-2">
          <button onClick={() => void fetchExams(token)} className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground">
            Refresh
          </button>
          <button onClick={() => void logout()} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      }
      isExiting={isExiting}
      exitMessage="Signing out of admin..."
    >
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {msg ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{msg}</p> : null}
      {loading ? (
        <DashboardPanel title="Loading Exams">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Preparing exam registry...
          </div>
        </DashboardPanel>
      ) : null}

      {!loading ? (
        <DashboardPanel title="All Exams">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-700" />
            <h2 className="text-base font-semibold">Exam Registry</h2>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="py-2 pl-3">Title</th>
                  <th>Course</th>
                  <th>Lecturer</th>
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
                    <td>{exam.lecturer_name || `Lecturer #${exam.lecturer_id ?? "-"}`}</td>
                    <td>{formatDateTime(exam.scheduled_at)}</td>
                    <td><span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(exam.status)}`}>{exam.status}</span></td>
                    <td className="pr-3">
                      <button
                        onClick={() => void deleteExam(exam)}
                        disabled={deletingExamId === exam.exam_id}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingExamId === exam.exam_id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
                {exams.length === 0 ? <tr><td colSpan={6} className="py-3 pl-3 text-muted-foreground">No exams found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : null}
    </DashboardShell>
  )
}
