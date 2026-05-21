"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookOpen, Eye, EyeOff, KeyRound, LogOut, Plus, Users } from "lucide-react"
import Link from "next/link"
import { getApiPath } from "@/lib/api-url"
import { DashboardPanel, DashboardShell, MetricCard } from "@/components/dashboard-shell"

type MeUser = {
  user_id: number
  full_name: string
  registration_number?: string
  email?: string
  phone_number?: string | null
  department?: string | null
  lecturer_profile_confirmed?: boolean
  must_change_password?: boolean
  role: string
}

type ExamRow = {
  exam_id: number
  title: string
  course_code: string
  duration_min: number
  scheduled_at?: string | null
  status: string
}

type QuestionRow = {
  question_id: number
  question_text: string
  question_type: string
  option_a?: string | null
  option_b?: string | null
  option_c?: string | null
  option_d?: string | null
  correct_answer?: string
  marks: number
  order_num: number
}

type StudentRow = {
  user_id: number
  full_name: string
  registration_number: string
  email: string
  session_status: string
  score?: number | null
  warning_count: number
}

type CourseStudentRow = {
  user_id: number
  full_name: string
  registration_number: string
  email: string
}

type SessionResultRow = {
  session_id: number
  exam_id: number
  student_name: string
  registration_number: string
  student_email: string
  exam_title: string
  course_code: string
  session_status: string
  score?: number | null
  warning_count: number
  risk_level: string
}

function formatDateTime(value?: string | null) {
  if (!value) return "TBD"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "TBD"
  return date.toLocaleString()
}

function badgeTone(value: string) {
  const normalized = value.toLowerCase()
  if (normalized === "completed" || normalized === "live" || normalized === "low") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
  if (normalized === "scheduled" || normalized === "medium") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50"
  if (normalized === "high" || normalized === "locked") return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50"
  return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
}

function LecturerDashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = (searchParams.get("tab") || "dashboard").toLowerCase()
  const tabTitleMap: Record<string, string> = {
    dashboard: "Dashboard",
    exams: "Exams",
    questions: "Questions",
    students: "Students",
    results: "Session Results",
    profile: "Profile",
  }
  const [token, setToken] = useState("")
  const [me, setMe] = useState<MeUser | null>(null)
  const [exams, setExams] = useState<ExamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [profileMsg, setProfileMsg] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [department, setDepartment] = useState("")
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingSaving, setOnboardingSaving] = useState(false)
  const [onboardingMsg, setOnboardingMsg] = useState("")
  const [showForcePasswordModal, setShowForcePasswordModal] = useState(false)
  const [forcePasswordMsg, setForcePasswordMsg] = useState("")

  const [newTitle, setNewTitle] = useState("")
  const [newCourseCode, setNewCourseCode] = useState("")
  const [newDuration, setNewDuration] = useState("60")
  const [newSchedule, setNewSchedule] = useState("")

  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [courseStudents, setCourseStudents] = useState<CourseStudentRow[]>([])
  const [sessionResults, setSessionResults] = useState<SessionResultRow[]>([])
  const [exporting, setExporting] = useState(false)
  const [questionText, setQuestionText] = useState("")
  const [questionType, setQuestionType] = useState<"mcq" | "true_false">("mcq")
  const [optionA, setOptionA] = useState("")
  const [optionB, setOptionB] = useState("")
  const [optionC, setOptionC] = useState("")
  const [optionD, setOptionD] = useState("")
  const [correctAnswer, setCorrectAnswer] = useState("")
  const [marks, setMarks] = useState("1")
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState("")
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const rawToken = localStorage.getItem("token")
    if (!rawToken) {
      router.push("/unauthorized?reason=auth")
      return
    }
    setToken(rawToken)
    void load(rawToken)
  }, [router])

  async function load(activeToken: string) {
    setLoading(true)
    try {
      const [meRes, examsRes, sessionsRes] = await Promise.all([
        fetch(getApiPath("/auth/me"), { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch(getApiPath("/exams"), { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch(getApiPath("/sessions"), { headers: { Authorization: `Bearer ${activeToken}` } }),
      ])
      const mePayload = await meRes.json().catch(() => ({}))
      const examsPayload = await examsRes.json().catch(() => ({}))
      const sessionsPayload = await sessionsRes.json().catch(() => ({}))
      if (!meRes.ok) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/unauthorized?reason=auth")
        return
      }
      if (mePayload?.user?.role === "administrator" || mePayload?.user?.role === "admin") {
        router.push("/admin")
        return
      }
      if (mePayload?.user?.role !== "lecturer") {
        router.push("/unauthorized?reason=role")
        return
      }
      setMe(mePayload.user)
      setShowForcePasswordModal(Boolean(mePayload.user?.must_change_password))
      setEmail(mePayload.user?.email || "")
      setPhone(mePayload.user?.phone_number || "")
      setDepartment(mePayload.user?.department || "")
      const needsOnboarding =
        !Boolean(mePayload.user?.lecturer_profile_confirmed) ||
        !String(mePayload.user?.full_name || "").trim() ||
        !String(mePayload.user?.email || "").trim() ||
        !String(mePayload.user?.phone_number || "").trim() ||
        !String(mePayload.user?.department || "").trim()
      setShowOnboarding(Boolean(needsOnboarding))
      const rows = examsPayload.exams || []
      setExams(rows)
      setSessionResults(sessionsPayload.sessions || [])
      if (rows.length > 0) {
        const requestedExamId = Number(searchParams.get("examId"))
        const candidate = Number.isFinite(requestedExamId)
          ? rows.find((row: ExamRow) => row.exam_id === requestedExamId)
          : null
        const selected = candidate || rows[0]
        const selectedId = selected.exam_id
        setSelectedExamId(selectedId)
        await loadExamDetails(activeToken, selectedId, selected.course_code)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadExamDetails(activeToken: string, examId: number, courseCode?: string) {
    const [examRes, studentsRes] = await Promise.all([
      fetch(getApiPath(`/exams/${examId}`), { headers: { Authorization: `Bearer ${activeToken}` } }),
      fetch(getApiPath(`/exams/${examId}/students`), { headers: { Authorization: `Bearer ${activeToken}` } }),
    ])
    const examPayload = await examRes.json().catch(() => ({}))
    const studentsPayload = await studentsRes.json().catch(() => ({}))
    if (examRes.ok) setQuestions(examPayload.questions || [])
    if (studentsRes.ok) setStudents(studentsPayload.students || [])

    const resolvedCourseCode = courseCode || exams.find(e => e.exam_id === examId)?.course_code
    if (resolvedCourseCode) {
      const courseRes = await fetch(getApiPath(`/exams/course/${encodeURIComponent(resolvedCourseCode)}/students`), {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      const coursePayload = await courseRes.json().catch(() => ({}))
      if (courseRes.ok) setCourseStudents(coursePayload.students || [])
    }
  }

  async function createExam() {
    if (!newTitle || !newCourseCode) return
    const res = await fetch(getApiPath("/exams"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: newTitle,
        course_code: newCourseCode,
        duration_min: Number(newDuration),
        scheduled_at: newSchedule || undefined,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload?.error?.message || "Could not create exam.")
      return
    }
    setNewTitle("")
    setNewCourseCode("")
    setNewDuration("60")
    setNewSchedule("")
    const createdExamId = Number(payload?.exam_id || payload?.id)
    if (Number.isFinite(createdExamId) && createdExamId > 0) {
      router.push(`/lecturer?tab=questions&examId=${createdExamId}`)
      return
    }
    await load(token)
  }

  async function editExam(exam: ExamRow) {
    const title = window.prompt("Exam title", exam.title)
    if (!title) return
    const courseCode = window.prompt("Course code", exam.course_code)
    if (!courseCode) return
    const durationRaw = window.prompt("Duration (minutes)", String(exam.duration_min))
    if (!durationRaw) return
    const duration = Number(durationRaw)
    if (!Number.isFinite(duration) || duration <= 0) return
    const schedule = window.prompt("Scheduled at (ISO, optional)", exam.scheduled_at || "")

    const res = await fetch(getApiPath(`/exams/${exam.exam_id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title,
        course_code: courseCode,
        duration_min: duration,
        scheduled_at: schedule || undefined,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload?.error?.message || "Could not update exam.")
      return
    }
    await load(token)
  }

  async function deleteExam(exam: ExamRow) {
    const ok = window.confirm(`Delete exam "${exam.title}"? This cannot be undone.`)
    if (!ok) return
    const res = await fetch(getApiPath(`/exams/${exam.exam_id}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload?.error?.message || "Could not delete exam.")
      return
    }
    if (selectedExamId === exam.exam_id) {
      setSelectedExamId(null)
      setQuestions([])
      setStudents([])
      setCourseStudents([])
    }
    await load(token)
  }

  async function createQuestion() {
    if (!selectedExamId || !questionText || !correctAnswer) return
    const res = await fetch(getApiPath(`/exams/${selectedExamId}/questions`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        question_text: questionText,
        question_type: questionType,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_answer: correctAnswer,
        marks: Number(marks),
        order_num: questions.length + 1,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload?.error?.message || "Could not create question.")
      return
    }
    setQuestionText("")
    setOptionA("")
    setOptionB("")
    setOptionC("")
    setOptionD("")
    setCorrectAnswer("")
    setMarks("1")
    await loadExamDetails(token, selectedExamId)
  }

  async function updateExamStatus(examId: number, status: string) {
    const res = await fetch(getApiPath(`/exams/${examId}/status`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload?.error?.message || "Could not update exam status.")
      return
    }
    await load(token)
  }

  async function deleteQuestion(questionId: number) {
    if (!selectedExamId) return
    const res = await fetch(getApiPath(`/exams/${selectedExamId}/questions/${questionId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) await loadExamDetails(token, selectedExamId)
  }

  async function saveQuestionEdit(question: QuestionRow) {
    if (!selectedExamId) return
    const updatedText = window.prompt("Update question text", question.question_text)
    if (!updatedText) return
    const updatedCorrect = window.prompt("Update correct answer", question.correct_answer || "")
    if (!updatedCorrect) return

    setEditingQuestionId(question.question_id)
    const res = await fetch(getApiPath(`/exams/${selectedExamId}/questions/${question.question_id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        question_text: updatedText,
        question_type: question.question_type,
        option_a: question.option_a || "",
        option_b: question.option_b || "",
        option_c: question.option_c || "",
        option_d: question.option_d || "",
        correct_answer: updatedCorrect,
        marks: question.marks,
        order_num: question.order_num,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload?.error?.message || "Could not update question.")
      setEditingQuestionId(null)
      return
    }
    await loadExamDetails(token, selectedExamId)
    setEditingQuestionId(null)
  }

  const selectedExam = useMemo(
    () => exams.find(e => e.exam_id === selectedExamId) || null,
    [exams, selectedExamId]
  )
  const filteredSessionResults = useMemo(() => {
    if (!selectedExamId) return sessionResults
    return sessionResults.filter((row) => row.exam_id === selectedExamId)
  }, [selectedExamId, sessionResults])

  async function exportSelectedExamReport() {
    if (!selectedExamId) return
    setExporting(true)
    try {
      const res = await fetch(getApiPath(`/reports/export/${selectedExamId}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        setError(payload?.error?.message || "Failed to export report.")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `exam_report_${selectedExamId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function changePassword() {
    setPasswordMsg("")
    setForcePasswordMsg("")
    if (!currentPassword || !newPassword) {
      setPasswordMsg("Current and new password are required.")
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg("New password must be at least 8 characters.")
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch(getApiPath("/auth/change-password"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = payload?.error?.message || "Could not update password."
        setPasswordMsg(message)
        setForcePasswordMsg(message)
        return
      }
      setCurrentPassword("")
      setNewPassword("")
      setPasswordMsg("Password updated successfully.")
      setForcePasswordMsg("Password updated successfully.")
      setShowForcePasswordModal(false)
      setMe((prev) => (prev ? { ...prev, must_change_password: false } : prev))
    } finally {
      setSavingPassword(false)
    }
  }

  async function updateProfile(confirmProfile = false) {
    setProfileMsg("")
    setOnboardingMsg("")
    const res = await fetch(getApiPath("/users/profile"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email,
        phone_number: phone,
        department,
        confirm_profile: confirmProfile,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message = payload?.error?.message || "Could not update profile."
      setProfileMsg(message)
      setOnboardingMsg(message)
      return false
    }
    if (payload?.user) {
      setMe(payload.user)
      localStorage.setItem("user", JSON.stringify(payload.user))
    }
    setProfileMsg("Profile updated successfully.")
    return true
  }

  async function submitOnboarding() {
    if (!String(email || "").trim()) return setOnboardingMsg("Email is required.")
    if (!String(phone || "").trim()) return setOnboardingMsg("Phone number is required.")
    if (!String(department || "").trim()) return setOnboardingMsg("Department is required.")
    setOnboardingSaving(true)
    try {
      const ok = await updateProfile(true)
      if (ok) setShowOnboarding(false)
    } finally {
      setOnboardingSaving(false)
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
    <>
    <DashboardShell
      appName="ProctorAI Lecturer"
      title={tabTitleMap[tab] || "Lecturer Dashboard"}
      subtitle={me?.full_name || ""}
      avatarName={me?.full_name}
      sidebarItems={[
        { label: "Dashboard", href: "/lecturer", active: tab === "dashboard" },
        { label: "Exams", href: "/lecturer?tab=exams", active: tab === "exams" },
        { label: "Questions", href: "/lecturer?tab=questions", active: tab === "questions" },
        { label: "Students", href: "/lecturer?tab=students", active: tab === "students" },
        { label: "Session Results", href: "/lecturer?tab=results", active: tab === "results" },
        { label: "Profile", href: "/lecturer?tab=profile", active: tab === "profile" },
      ]}
      rightTopSlot={
        <div className="flex items-center gap-2">
          <button onClick={logout} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      }
      isExiting={isExiting}
      exitMessage="Signing out of lecturer account..."
    >
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading ? (
        <DashboardPanel title="Loading Lecturer Dashboard">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Preparing your dashboard...
          </div>
        </DashboardPanel>
      ) : null}

      {!loading ? (
      <>
        {tab === "dashboard" && (
          <>
        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard label="My Exams" value={exams.length} />
          <MetricCard label="Questions (Selected Exam)" value={questions.length} />
          <MetricCard label="Students (Selected Exam)" value={students.length} />
        </section>
        <DashboardPanel title="Quick Shortcuts" subtitle="Move quickly between lecturer workflows.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Link href="/lecturer?tab=exams" className="rounded-xl border border-border bg-gradient-to-br from-blue-50 to-indigo-50 p-4 transition hover:shadow-md dark:from-slate-900 dark:to-slate-800">
              <p className="text-sm font-semibold text-foreground">Exams</p>
              <p className="mt-1 text-xs text-muted-foreground">Create and manage exams.</p>
            </Link>
            <Link href="/lecturer?tab=questions" className="rounded-xl border border-border bg-gradient-to-br from-emerald-50 to-teal-50 p-4 transition hover:shadow-md dark:from-slate-900 dark:to-slate-800">
              <p className="text-sm font-semibold text-foreground">Questions</p>
              <p className="mt-1 text-xs text-muted-foreground">Build question banks.</p>
            </Link>
            <Link href="/lecturer?tab=students" className="rounded-xl border border-border bg-gradient-to-br from-amber-50 to-orange-50 p-4 transition hover:shadow-md dark:from-slate-900 dark:to-slate-800">
              <p className="text-sm font-semibold text-foreground">Students</p>
              <p className="mt-1 text-xs text-muted-foreground">View enrolled students.</p>
            </Link>
            <Link href="/lecturer?tab=results" className="rounded-xl border border-border bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 transition hover:shadow-md dark:from-slate-900 dark:to-slate-800">
              <p className="text-sm font-semibold text-foreground">Session Results</p>
              <p className="mt-1 text-xs text-muted-foreground">Inspect outcomes and risk.</p>
            </Link>
            <Link href="/lecturer?tab=profile" className="rounded-xl border border-border bg-gradient-to-br from-slate-100 to-slate-200 p-4 transition hover:shadow-md dark:from-slate-900 dark:to-slate-800">
              <p className="text-sm font-semibold text-foreground">Profile</p>
              <p className="mt-1 text-xs text-muted-foreground">Reset account password.</p>
            </Link>
          </div>
        </DashboardPanel>
          </>
        )}

        {tab === "exams" && (
          <>
        <DashboardPanel title="Create Exam">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-700" />
            <h2 className="text-base font-semibold">Create Exam</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Exam title" className="rounded-md border border-border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <input value={newCourseCode} onChange={e => setNewCourseCode(e.target.value)} placeholder="Course code" className="rounded-md border border-border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <input value={newDuration} onChange={e => setNewDuration(e.target.value)} placeholder="Duration minutes" className="rounded-md border border-border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <input
              type="datetime-local"
              value={newSchedule}
              onChange={e => setNewSchedule(e.target.value)}
              onClick={(e) => {
                const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
                el.showPicker?.()
              }}
              className="cursor-pointer rounded-md border border-border bg-background p-2 text-sm text-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Workflow: create exam, add questions immediately, then set exam status to <span className="font-semibold">scheduled</span> or <span className="font-semibold">live</span>.
          </p>
          <button onClick={createExam} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#142145]">Create Exam & Add Questions</button>
        </DashboardPanel>

        <DashboardPanel title="My Exam List">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-700" />
            <h2 className="text-base font-semibold">My Exam List</h2>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="py-2 pl-3">Title</th>
                  <th>Course</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Set Status</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.exam_id} className="border-b last:border-b-0">
                    <td className="py-2 pl-3 font-medium">{exam.title}</td>
                    <td>{exam.course_code}</td>
                    <td>{formatDateTime(exam.scheduled_at)}</td>
                    <td><span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(exam.status)}`}>{exam.status}</span></td>
                    <td>
                      <select
                        className="rounded-md border border-border bg-background p-1 text-xs text-foreground focus:border-[#1a2d5a] focus:outline-none"
                        value={exam.status}
                        onChange={async (e) => updateExamStatus(exam.exam_id, e.target.value)}
                      >
                        <option value="draft">draft</option>
                        <option value="scheduled">scheduled</option>
                        <option value="live">live</option>
                        <option value="completed">completed</option>
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={async () => {
                          setSelectedExamId(exam.exam_id)
                          await loadExamDetails(token, exam.exam_id, exam.course_code)
                          router.push(`/lecturer?tab=questions&examId=${exam.exam_id}`)
                        }}
                        className="mr-2 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        Questions
                      </button>
                      <button
                        onClick={() => editExam(exam)}
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        Edit
                      </button>
                    </td>
                    <td>
                      <button onClick={() => deleteExam(exam)} className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                        Delete
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={async () => {
                          setSelectedExamId(exam.exam_id)
                          await loadExamDetails(token, exam.exam_id, exam.course_code)
                        }}
                        className="rounded-md bg-[#1a2d5a] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#142145]"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
                {exams.length === 0 && <tr><td colSpan={8} className="py-3 pl-3 text-slate-600">No exams created yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <button
              onClick={exportSelectedExamReport}
              disabled={!selectedExamId || exporting}
              className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#142145] disabled:opacity-60"
            >
              {exporting ? "Exporting..." : "Export Selected Exam CSV"}
            </button>
          </div>
        </DashboardPanel>
          </>
        )}

        {tab === "questions" && (
        <DashboardPanel title={`Question Builder ${selectedExam ? `- ${selectedExam.title}` : ""}`}>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Select Exam
              </label>
              <select
                value={selectedExamId ?? ""}
                onChange={async (e) => {
                  const nextExamId = Number(e.target.value)
                  if (!Number.isFinite(nextExamId) || nextExamId <= 0) return
                  const picked = exams.find((row) => row.exam_id === nextExamId)
                  setSelectedExamId(nextExamId)
                  await loadExamDetails(token, nextExamId, picked?.course_code)
                  router.push(`/lecturer?tab=questions&examId=${nextExamId}`)
                }}
                className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {exams.length === 0 ? <option value="">No exams available</option> : null}
                {exams.map((exam) => (
                  <option key={exam.exam_id} value={exam.exam_id}>
                    {exam.title} - {exam.course_code} ({exam.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select value={questionType} onChange={e => setQuestionType(e.target.value as "mcq" | "true_false")} className="rounded-md border border-border bg-background p-2 text-sm text-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="mcq">mcq</option>
              <option value="true_false">true_false</option>
            </select>
            <input value={marks} onChange={e => setMarks(e.target.value)} placeholder="Marks" className="rounded-md border border-border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <input value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder="Question text" className="rounded-md border border-border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100 md:col-span-2" />
            <input value={optionA} onChange={e => setOptionA(e.target.value)} placeholder="Option A" className="rounded-md border border-border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <input value={optionB} onChange={e => setOptionB(e.target.value)} placeholder="Option B" className="rounded-md border border-border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />
            {questionType === "mcq" && <input value={optionC} onChange={e => setOptionC(e.target.value)} placeholder="Option C" className="rounded-md border border-border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />}
            {questionType === "mcq" && <input value={optionD} onChange={e => setOptionD(e.target.value)} placeholder="Option D" className="rounded-md border border-border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100" />}
            <input value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} placeholder="Correct answer (e.g. A or TRUE)" className="rounded-md border border-border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100 md:col-span-2" />
          </div>
          <button onClick={createQuestion} disabled={!selectedExamId} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#142145] disabled:opacity-60">
            Add Question
          </button>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">#</th>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Correct</th>
                  <th>Marks</th>
                  <th>Edit</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.question_id} className="border-b">
                    <td className="py-2">{q.order_num}</td>
                    <td>{q.question_text}</td>
                    <td>{q.question_type}</td>
                    <td>{q.correct_answer}</td>
                    <td>{q.marks}</td>
                    <td>
                      <button
                        onClick={() => saveQuestionEdit(q)}
                        disabled={editingQuestionId === q.question_id}
                        className="rounded border px-2 py-1 text-xs disabled:opacity-60"
                      >
                        {editingQuestionId === q.question_id ? "Saving..." : "Edit"}
                      </button>
                    </td>
                    <td><button onClick={() => deleteQuestion(q.question_id)} className="rounded border px-2 py-1 text-xs">Delete</button></td>
                  </tr>
                ))}
                {questions.length === 0 && <tr><td colSpan={7} className="py-3 text-slate-600">No questions for selected exam.</td></tr>}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
        )}

        {tab === "students" && (
          <>
        <DashboardPanel title={`Enrolled Students ${selectedExam ? `- ${selectedExam.title}` : ""}`}>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-700" />
            <h2 className="text-base font-semibold">Enrolled Students {selectedExam ? `- ${selectedExam.title}` : ""}</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Name</th>
                  <th>Reg Number</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.user_id} className="border-b">
                    <td className="py-2">{s.full_name}</td>
                    <td>{s.registration_number}</td>
                    <td>{s.email}</td>
                    <td>{s.session_status}</td>
                    <td>{s.score ?? "-"}</td>
                    <td>{s.warning_count}</td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={6} className="py-3 text-slate-600">No students enrolled yet (students appear after starting session).</td></tr>}
              </tbody>
            </table>
          </div>
        </DashboardPanel>

        <DashboardPanel title={`Students In Course ${selectedExam ? `- ${selectedExam.course_code}` : ""}`}>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-700" />
            <h2 className="text-base font-semibold">Students In Course {selectedExam ? `- ${selectedExam.course_code}` : ""}</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Name</th>
                  <th>Reg Number</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {courseStudents.map((s) => (
                  <tr key={s.user_id} className="border-b">
                    <td className="py-2">{s.full_name}</td>
                    <td>{s.registration_number}</td>
                    <td>{s.email}</td>
                  </tr>
                ))}
                {courseStudents.length === 0 && <tr><td colSpan={3} className="py-3 text-slate-600">No course students yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
          </>
        )}

        {tab === "results" && (
        <DashboardPanel title="Session Results (Live Data)">
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Student</th>
                  <th>Reg Number</th>
                  <th>Course</th>
                  <th>Exam</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Warnings</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessionResults.map((row) => (
                  <tr key={row.session_id} className="border-b">
                    <td className="py-2">{row.student_name}</td>
                    <td>{row.registration_number}</td>
                    <td>{row.course_code}</td>
                    <td>{row.exam_title}</td>
                    <td>{row.session_status}</td>
                    <td>{row.score ?? "-"}</td>
                    <td>{row.warning_count}</td>
                    <td>{row.risk_level}</td>
                  </tr>
                ))}
                {filteredSessionResults.length === 0 && <tr><td colSpan={8} className="py-3 text-slate-600">No session results for selected scope.</td></tr>}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
        )}

        {tab === "profile" && (
        <div className="scroll-mt-24">
        <DashboardPanel title="Profile Details">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={me?.full_name || ""} readOnly className="rounded-md border border-border bg-muted/40 p-2 text-sm text-foreground" placeholder="Full name" />
            <input value={me?.registration_number || ""} readOnly className="rounded-md border border-border bg-muted/40 p-2 text-sm text-foreground" placeholder="Registration number" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
            <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department / Programme" className="rounded-md border border-border bg-background p-2 text-sm text-foreground md:col-span-2" />
          </div>
          {profileMsg ? <p className="mt-2 text-sm text-muted-foreground">{profileMsg}</p> : null}
          <button onClick={() => void updateProfile(false)} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#142145]">Save Profile</button>
        </DashboardPanel>
        <DashboardPanel title="Change Password">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-700" />
            <h2 className="text-base font-semibold">Reset Password</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full rounded-md border border-border bg-background p-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button type="button" onClick={() => setShowCurrentPassword(v => !v)} className="absolute inset-y-0 right-0 px-3 text-muted-foreground" aria-label={showCurrentPassword ? "Hide password" : "Show password"}>
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full rounded-md border border-border bg-background p-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a2d5a] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button type="button" onClick={() => setShowNewPassword(v => !v)} className="absolute inset-y-0 right-0 px-3 text-muted-foreground" aria-label={showNewPassword ? "Hide password" : "Show password"}>
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {passwordMsg && <p className="mt-2 text-sm text-slate-700">{passwordMsg}</p>}
          <button onClick={changePassword} disabled={savingPassword} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#142145] disabled:opacity-60">
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </DashboardPanel>
        </div>
        )}
      </>
      ) : null}
    </DashboardShell>
    {showOnboarding ? (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-2xl">
          <h3 className="text-lg font-semibold text-foreground">Complete Lecturer Onboarding</h3>
          <p className="mt-1 text-sm text-muted-foreground">Confirm your profile details before managing exams.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={me?.full_name || ""} readOnly className="rounded-md border border-border bg-muted/40 p-2 text-sm text-foreground" placeholder="Full name" />
            <input value={me?.registration_number || ""} readOnly className="rounded-md border border-border bg-muted/40 p-2 text-sm text-foreground" placeholder="Registration number" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
            <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department / Programme" className="rounded-md border border-border bg-background p-2 text-sm text-foreground md:col-span-2" />
          </div>
          {onboardingMsg ? <p className="mt-3 text-sm text-red-600">{onboardingMsg}</p> : null}
          <div className="mt-4 flex justify-end">
            <button onClick={() => void submitOnboarding()} disabled={onboardingSaving} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {onboardingSaving ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    {showForcePasswordModal ? (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
          <h3 className="text-lg font-semibold text-foreground">Password Update Required</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You signed in with a temporary password. Set a new password to continue.
          </p>
          <div className="mt-4 grid gap-3">
            <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current temporary password" className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground" />
            <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground" />
          </div>
          {forcePasswordMsg ? <p className="mt-3 text-sm text-red-600">{forcePasswordMsg}</p> : null}
          <div className="mt-4 flex justify-end">
            <button onClick={() => void changePassword()} disabled={savingPassword} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
  </>
  )
}

export default function LecturerDashboard() {
  return (
    <Suspense
      fallback={
        <DashboardShell
          appName="ProctorAI Lecturer"
          title="Lecturer Dashboard"
          subtitle=""
          sidebarItems={[]}
        >
          <DashboardPanel title="Loading Lecturer Dashboard">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Preparing your dashboard...
            </div>
          </DashboardPanel>
        </DashboardShell>
      }
    >
      <LecturerDashboardInner />
    </Suspense>
  )
}
