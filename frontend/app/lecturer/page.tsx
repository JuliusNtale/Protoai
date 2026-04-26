"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, BookOpen, MonitorPlay, BarChart2, Users, Settings,
  LogOut, Bell, Plus, Eye, Edit3, Trash2, ChevronDown, CheckCircle,
  GripVertical, X, Search, Filter, Download, AlertTriangle,
  TrendingUp, TrendingDown, Award, Clock, UserCheck, UserX,
  ShieldAlert, Wifi, WifiOff, Activity, ChevronRight, MoreVertical,
  FileText, Send, RefreshCw, Calculator,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  MOCK_EXAMS, MOCK_STUDENTS, MOCK_RESULTS, MOCK_MONITORING,
  MOCK_LECTURERS, MOCK_SUBJECTS,
  type Exam, type Student, type ExamResult, type MonitoringSession,
  type Question, type QuestionType, type Option,
  gradeColor, scorePercent, lecturerName, subjectLabel,
} from "./data"

// ─── helpers ──────────────────────────────────────────────────────────────────
function genId() { return Math.random().toString(36).slice(2, 9) }
function opt(text = ""): Option { return { id: genId(), text } }
function newMCQ(): Question {
  return { id: genId(), type: "mcq", text: "", marks: 5, correctIndex: 0, options: [opt(), opt(), opt(), opt()] }
}
function newTF(): Question {
  return { id: genId(), type: "truefalse", text: "", marks: 3, correctIndex: 0, options: [opt("True"), opt("False")] }
}

// ─── Nav items ────────────────────────────────────────────────────────────────
type Tab = "overview" | "exams" | "monitor" | "results" | "analytics" | "students"

const NAV: { tab: Tab; label: string; icon: React.ElementType }[] = [
  { tab: "overview",   label: "Overview",         icon: LayoutDashboard },
  { tab: "exams",      label: "Exam Management",  icon: BookOpen },
  { tab: "monitor",    label: "Live Monitoring",  icon: MonitorPlay },
  { tab: "results",    label: "Results & Grades", icon: Award },
  { tab: "analytics",  label: "Analytics",        icon: BarChart2 },
  { tab: "students",   label: "Students",         icon: Users },
]

const STATUS_PILL: Record<string, string> = {
  Draft:     "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Scheduled: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Live:      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Completed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ exams, results, students, setTab }: {
  exams: Exam[]; results: ExamResult[]; students: Student[]; setTab: (t: Tab) => void
}) {
  const totalStudents = students.length
  const totalExams    = exams.length
  const avgScore      = results.length ? Math.round(results.reduce((a, r) => a + scorePercent(r.score, r.totalMarks), 0) / results.length) : 0
  const passRate      = results.length ? Math.round(results.filter(r => r.passed).length / results.length * 100) : 0
  const liveExams     = exams.filter(e => e.status === "Live").length

  const recentResults = results.slice(0, 5)
  const upcomingExams = exams.filter(e => e.status === "Scheduled" || e.status === "Draft").slice(0, 4)

  const stats = [
    { label: "Total Students", value: totalStudents, sub: "across all courses", icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Exams Created",  value: totalExams,    sub: `${liveExams} live now`,    icon: BookOpen, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "Average Score",  value: `${avgScore}%`, sub: "across all exams",       icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Pass Rate",      value: `${passRate}%`, sub: `${results.filter(r=>r.passed).length} of ${results.length} students`, icon: Award, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Welcome back, Dr. Amani Msangi</h2>
            <p className="mt-1 text-sm text-muted-foreground">College of Informatics &amp; Virtual Education &mdash; University of Dodoma</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Friday, 25 April 2026</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Semester
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
              </div>
              <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", s.bg)}>
                <s.icon className={cn("h-5 w-5", s.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column: upcoming + recent results */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Upcoming exams */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-semibold text-foreground">Upcoming Exams</h3>
            <button onClick={() => setTab("exams")} className="text-xs font-medium text-primary hover:underline">View all</button>
          </div>
          <div className="divide-y divide-border">
            {upcomingExams.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No upcoming exams</p>
            )}
            {upcomingExams.map(e => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <span className="text-xs font-bold leading-none">{new Date(e.date).getDate()}</span>
                  <span className="text-[9px] font-medium uppercase leading-none">{new Date(e.date).toLocaleString("default",{month:"short"})}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.courseCode} &bull; {e.duration} min &bull; {e.time}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_PILL[e.status])}>{e.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent results */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-semibold text-foreground">Recent Results</h3>
            <button onClick={() => setTab("results")} className="text-xs font-medium text-primary hover:underline">View all</button>
          </div>
          <div className="divide-y divide-border">
            {recentResults.map((r, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {r.studentName.split(" ").map(n => n[0]).join("").slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{r.studentName}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.examTitle}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold", gradeColor(r.grade))}>{r.grade}</p>
                  <p className="text-xs text-muted-foreground">{r.score}/{r.totalMarks}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EXAM MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function ExamsTab({ exams, setExams }: { exams: Exam[]; setExams: (e: Exam[]) => void }) {
  const [builderOpen, setBuilderOpen]   = useState(false)
  const [search, setSearch]             = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("All")
  const [examTitle, setExamTitle]       = useState("")
  const [examCourse, setExamCourse]     = useState("")
  const [examCode, setExamCode]         = useState("")
  const [examDuration, setExamDuration] = useState("60")
  const [examDate, setExamDate]         = useState("")
  const [examTime, setExamTime]         = useState("")
  const [examMarks, setExamMarks]       = useState("100")
  const [examPassmark, setExamPassmark]       = useState("45")
  const [allowCalculator, setAllowCalculator] = useState(false)
  const [creatorId,  setCreatorId]            = useState("l1")
  const [supervisorId, setSupervisorId]       = useState("l1")
  const [questions, setQuestions]             = useState<Question[]>([newMCQ()])
  const [expandedQ, setExpandedQ]       = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)
  const [viewExam, setViewExam]         = useState<Exam | null>(null)

  const filtered = exams.filter(e =>
    (filterStatus === "All" || e.status === filterStatus) &&
    (e.title.toLowerCase().includes(search.toLowerCase()) || e.courseCode.toLowerCase().includes(search.toLowerCase()))
  )

  function addQuestion(type: QuestionType) {
    const q = type === "mcq" ? newMCQ() : newTF()
    setQuestions(qs => [...qs, q])
    setExpandedQ(q.id)
  }
  function removeQuestion(id: string) { setQuestions(qs => qs.filter(q => q.id !== id)) }
  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q))
  }
  function updateOption(qId: string, optId: string, text: string) {
    setQuestions(qs => qs.map(q => q.id === qId ? { ...q, options: q.options.map(o => o.id === optId ? { ...o, text } : o) } : q))
  }

  function handleSave(status: "Draft" | "Scheduled") {
    setSaving(true)
    setTimeout(() => {
      const newExam: Exam = {
        id: genId(), title: examTitle || "Untitled Exam", course: examCourse || "—",
        courseCode: examCode || "—", duration: Number(examDuration),
        date: examDate || "TBD", time: examTime || "09:00",
        totalMarks: Number(examMarks), passmark: Number(examPassmark),
        students: 0, submitted: 0, status, questions,
        allowCalculator, creatorId, supervisorId,
      }
      setExams([newExam, ...exams])
      setSaving(false)
      setBuilderOpen(false)
      setExamTitle(""); setExamCourse(""); setExamCode(""); setExamDuration("60")
      setExamDate(""); setExamTime(""); setExamMarks("100"); setExamPassmark("45")
      setAllowCalculator(false); setCreatorId("l1"); setSupervisorId("l1")
      setQuestions([newMCQ()])
    }, 800)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exams…"
            className="w-full rounded-lg border border-input bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex items-center gap-2">
          {["All","Draft","Scheduled","Live","Completed"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                filterStatus === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
              {s}
            </button>
          ))}
        </div>
        <Button onClick={() => setBuilderOpen(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 ml-auto">
          <Plus className="h-4 w-4" /> Create Exam
        </Button>
      </div>

      {/* Subjects this lecturer teaches */}
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Subjects I Teach</p>
        <div className="flex flex-wrap gap-2">
          {MOCK_SUBJECTS.filter(s => s.lecturerIds.includes("l1")).map(s => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
              <span className="font-mono text-[11px] font-bold text-primary">{s.code}</span>
              <span className="text-xs text-foreground">{s.name}</span>
              <span className="text-[10px] text-muted-foreground">&bull; {s.lecturerIds.length} lecturer{s.lecturerIds.length > 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Exam cards */}
      <div className="flex flex-col gap-3">
        {filtered.map(exam => (
          <div key={exam.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">{exam.title}</h3>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", STATUS_PILL[exam.status])}>{exam.status}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-mono font-medium">{exam.courseCode}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{exam.duration} min</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{exam.students} enrolled</span>
                  <span>{exam.date} &bull; {exam.time}</span>
                  <span>{exam.questions.length} questions &bull; {exam.totalMarks} marks</span>
                  <span className="flex items-center gap-1 text-muted-foreground/80">
                    <FileText className="h-3 w-3" />Created by {lecturerName(exam.creatorId)}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground/80">
                    <UserCheck className="h-3 w-3" />Supervised by {lecturerName(exam.supervisorId)}
                  </span>
                  {exam.allowCalculator ? (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      <Calculator className="h-3 w-3" />Calculator allowed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400">
                      <Calculator className="h-3 w-3" />No calculator
                    </span>
                  )}
                </div>
              </div>
              {/* Progress bar for completion */}
              {exam.students > 0 && (
                <div className="flex flex-col gap-1 min-w-36">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Submitted</span>
                    <span>{exam.submitted}/{exam.students}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.round(exam.submitted/exam.students*100)}%` }} />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1">
                <button onClick={() => setViewExam(exam)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="View">
                  <Eye className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Edit">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-destructive transition-colors" aria-label="Delete"
                  onClick={() => setExams(exams.filter(e => e.id !== exam.id))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No exams found</p>
          </div>
        )}
      </div>

      {/* View exam modal */}
      {viewExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <div>
                <h2 className="font-bold text-foreground">{viewExam.title}</h2>
                <p className="text-xs text-muted-foreground">{viewExam.courseCode} &bull; {viewExam.date} &bull; {viewExam.duration} min</p>
                <div className="mt-1 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <FileText className="h-3 w-3" />Created by <strong className="text-foreground">{lecturerName(viewExam.creatorId)}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <UserCheck className="h-3 w-3" />Supervised by <strong className="text-foreground">{lecturerName(viewExam.supervisorId)}</strong>
                  </span>
                </div>
              </div>
              <button onClick={() => setViewExam(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {viewExam.questions.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No questions added yet.</p>}
              {viewExam.questions.map((q, qi) => (
                <div key={q.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{qi+1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-3">{q.text}</p>
                      <div className="flex flex-col gap-2">
                        {q.options.map((o, oi) => (
                          <div key={o.id} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                            q.correctIndex === oi ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-medium" : "border-border text-foreground")}>
                            <span className="font-mono text-xs text-muted-foreground">{String.fromCharCode(65+oi)}.</span>
                            {o.text}
                            {q.correctIndex === oi && <CheckCircle className="ml-auto h-4 w-4 text-emerald-500 flex-shrink-0" />}
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{q.marks} marks &bull; {q.type === "mcq" ? "Multiple Choice" : "True / False"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Builder drawer */}
      {builderOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl flex-col bg-card shadow-2xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Create New Exam</h2>
                <p className="text-xs text-muted-foreground">{questions.length} question{questions.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setBuilderOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Exam meta */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Exam Details</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label:"Exam Title", value:examTitle, set:setExamTitle, placeholder:"e.g. Final Exam 2026", span:true },
                    { label:"Course Name", value:examCourse, set:setExamCourse, placeholder:"e.g. Advanced Algorithms" },
                    { label:"Course Code", value:examCode, set:setExamCode, placeholder:"e.g. CS401" },
                    { label:"Duration (min)", value:examDuration, set:setExamDuration, placeholder:"60", type:"number" },
                    { label:"Date", value:examDate, set:setExamDate, placeholder:"", type:"date" },
                    { label:"Time", value:examTime, set:setExamTime, placeholder:"", type:"time" },
                    { label:"Total Marks", value:examMarks, set:setExamMarks, placeholder:"100", type:"number" },
                    { label:"Pass Mark", value:examPassmark, set:setExamPassmark, placeholder:"45", type:"number" },
                  ].map(f => (
                    <div key={f.label} className={cn("flex flex-col gap-1", f.span && "sm:col-span-2")}>
                      <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                      <input type={f.type || "text"} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                        className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  ))}
                </div>

                {/* Creator + Supervisor row */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Created By</label>
                    <select value={creatorId} onChange={e => setCreatorId(e.target.value)}
                      className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                      {MOCK_LECTURERS.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.staffId})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Supervised / Invigilated By</label>
                    <select value={supervisorId} onChange={e => setSupervisorId(e.target.value)}
                      className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                      {MOCK_LECTURERS.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.staffId})</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">Can be a different lecturer from the creator</p>
                  </div>
                </div>

                {/* Calculator permission toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">Allow Scientific Calculator</span>
                    <span className="text-xs text-muted-foreground">Students will see a Casio fx-991 calculator during this exam</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowCalculator(v => !v)}
                    className={cn(
                      "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      allowCalculator ? "bg-primary" : "bg-muted"
                    )}
                    role="switch"
                    aria-checked={allowCalculator}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                      allowCalculator ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>

              {/* Questions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Questions</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => addQuestion("truefalse")}>
                      <Plus className="h-3 w-3" />True/False
                    </Button>
                    <Button size="sm" className="h-8 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => addQuestion("mcq")}>
                      <Plus className="h-3 w-3" />MCQ
                    </Button>
                  </div>
                </div>

                {questions.map((q, qi) => (
                  <div key={q.id} className="rounded-xl border border-border bg-background overflow-hidden">
                    <div className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
                      onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}>
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{qi+1}</span>
                      <span className={cn("flex-1 truncate text-sm", q.text ? "text-foreground" : "text-muted-foreground")}>
                        {q.text || "Enter question text…"}
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{q.type === "mcq" ? "MCQ" : "T/F"}</span>
                      <span className="text-[10px] text-muted-foreground">{q.marks} mk</span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expandedQ === q.id && "rotate-180")} />
                      <button onClick={e => { e.stopPropagation(); removeQuestion(q.id) }}
                        className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {expandedQ === q.id && (
                      <div className="border-t border-border px-4 py-4 space-y-3">
                        <textarea value={q.text} onChange={e => updateQuestion(q.id, { text: e.target.value })} rows={2}
                          placeholder="Type your question here…"
                          className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-muted-foreground">Marks</label>
                          <input type="number" value={q.marks} onChange={e => updateQuestion(q.id, { marks: Number(e.target.value) })} min={1}
                            className="w-20 rounded-lg border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-xs font-medium text-muted-foreground">Options — click the circle to mark as correct answer</p>
                          {q.options.map((o, oi) => (
                            <div key={o.id} className="flex items-center gap-3">
                              <button type="button" onClick={() => updateQuestion(q.id, { correctIndex: oi })}
                                className={cn("flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
                                  q.correctIndex === oi ? "border-emerald-500 bg-emerald-500 text-white" : "border-border hover:border-primary")}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </button>
                              {q.type === "truefalse" ? (
                                <span className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground">{o.text}</span>
                              ) : (
                                <input type="text" value={o.text} onChange={e => updateOption(q.id, o.id, e.target.value)}
                                  placeholder={`Option ${String.fromCharCode(65+oi)}`}
                                  className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                              )}
                              {q.correctIndex === oi && <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Correct</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {questions.length === 0 && (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No questions yet. Add MCQ or True/False above.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center justify-between border-t border-border px-6 py-4">
              <p className="text-sm text-muted-foreground">{questions.length} question{questions.length !== 1 ? "s" : ""} &bull; {questions.reduce((a,q)=>a+q.marks,0)} total marks</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setBuilderOpen(false)}>Cancel</Button>
                <Button variant="outline" onClick={() => handleSave("Draft")} disabled={saving}>Save Draft</Button>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-28" onClick={() => handleSave("Scheduled")} disabled={saving}>
                  {saving ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Saving…</span> : "Publish Exam"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LIVE MONITORING
// ══════════════════════════════════════════════════════════════════════════════
function MonitorTab({ sessions }: { sessions: MonitoringSession[] }) {
  const [selected, setSelected] = useState<MonitoringSession | null>(null)
  const [ticker, setTicker]     = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTicker(x => x + 1), 3000)
    return () => clearInterval(t)
  }, [])

  const active       = sessions.filter(s => s.status === "Active").length
  const submitted    = sessions.filter(s => s.status === "Submitted").length
  const disconnected = sessions.filter(s => s.status === "Disconnected").length
  const highRisk     = sessions.filter(s => s.warnings >= 3).length

  function riskLevel(s: MonitoringSession): "High" | "Medium" | "Low" {
    if (s.warnings >= 3 || s.status === "Disconnected") return "High"
    if (s.warnings >= 1 || !s.faceVisible) return "Medium"
    return "Low"
  }
  const riskColor = { High: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800", Medium: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", Low: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" }

  return (
    <div className="flex flex-col gap-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label:"Active",      value:active,       icon:Activity,   color:"text-emerald-600 dark:text-emerald-400", bg:"bg-emerald-50 dark:bg-emerald-900/20" },
          { label:"Submitted",   value:submitted,    icon:CheckCircle,color:"text-blue-600 dark:text-blue-400",       bg:"bg-blue-50 dark:bg-blue-900/20" },
          { label:"Disconnected",value:disconnected, icon:WifiOff,    color:"text-red-600 dark:text-red-400",         bg:"bg-red-50 dark:bg-red-900/20" },
          { label:"High Risk",   value:highRisk,     icon:AlertTriangle,color:"text-amber-600 dark:text-amber-400",   bg:"bg-amber-50 dark:bg-amber-900/20" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", s.bg)}>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Live info bar */}
      <div className="flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Live Session: Advanced Algorithms in Computer Science &mdash; CS401
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <Clock className="h-3.5 w-3.5" />
          Time Remaining: 01:42:33
        </div>
      </div>

      {/* Student grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sessions.map(s => {
          const risk = riskLevel(s)
          return (
            <button key={s.studentId} onClick={() => setSelected(s)}
              className={cn("text-left rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-all",
                s.status === "Disconnected" ? "border-red-200 dark:border-red-800" :
                risk === "High" ? "border-amber-200 dark:border-amber-800" : "border-border")}>
              {/* Webcam placeholder */}
              <div className="relative mb-3 overflow-hidden rounded-xl bg-zinc-900 aspect-video flex items-center justify-center">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <ellipse cx="32" cy="28" rx="16" ry="20" fill="rgba(255,255,255,0.08)" />
                  <ellipse cx="24" cy="24" rx="3" ry="2" fill="rgba(255,255,255,0.2)" />
                  <ellipse cx="40" cy="24" rx="3" ry="2" fill="rgba(255,255,255,0.2)" />
                  <path d="M24 36 Q32 42 40 36" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M12 60 Q20 50 32 50 Q44 50 52 60" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" strokeLinecap="round" />
                </svg>
                {/* Status badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full",
                    s.status === "Active" ? "bg-red-500 animate-pulse" : s.status === "Submitted" ? "bg-blue-400" : "bg-zinc-500")} />
                  <span className="text-[9px] font-semibold text-white uppercase tracking-wider">{s.status}</span>
                </div>
                {!s.faceVisible && (
                  <div className="absolute top-2 right-2 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">Face Hidden</div>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground leading-snug">{s.studentName}</p>
              <p className="text-xs text-muted-foreground mb-2">{s.regNo}</p>
              {/* Progress */}
              <div className="mb-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width:`${s.progress}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{s.progress}%</span>
              </div>
              {/* Stats row */}
              <div className="flex items-center justify-between text-[10px]">
                <span className={cn("flex items-center gap-1", s.gazeStatus === "On Screen" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                  {s.gazeStatus}
                </span>
                <span className={cn("flex items-center gap-1", s.tabSwitches > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                  {s.tabSwitches} tab switch{s.tabSwitches !== 1 ? "es" : ""}
                </span>
                <span className={cn("rounded-full border px-1.5 py-0.5 font-semibold", riskColor[risk])}>{risk}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Student detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-bold text-foreground">{selected.studentName}</h2>
                <p className="text-xs text-muted-foreground">{selected.regNo}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Webcam large */}
              <div className="overflow-hidden rounded-xl bg-zinc-900 aspect-video flex items-center justify-center">
                <svg width="100" height="100" viewBox="0 0 64 64" fill="none">
                  <ellipse cx="32" cy="28" rx="16" ry="20" fill="rgba(255,255,255,0.08)" />
                  <ellipse cx="24" cy="24" rx="3" ry="2" fill="rgba(255,255,255,0.2)" />
                  <ellipse cx="40" cy="24" rx="3" ry="2" fill="rgba(255,255,255,0.2)" />
                  <path d="M24 36 Q32 42 40 36" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M12 60 Q20 50 32 50 Q44 50 52 60" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:"Gaze Direction", value:selected.gazeStatus, good:selected.gazeStatus==="On Screen" },
                  { label:"Face Visible",   value:selected.faceVisible ? "Yes" : "No", good:selected.faceVisible },
                  { label:"Tab Switches",   value:String(selected.tabSwitches), good:selected.tabSwitches===0 },
                  { label:"Warnings",       value:String(selected.warnings), good:selected.warnings===0 },
                  { label:"Progress",       value:`${selected.progress}%`, good:true },
                  { label:"Time Left",      value:selected.timeLeft, good:true },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className={cn("text-sm font-semibold", item.good ? "text-foreground" : "text-red-600 dark:text-red-400")}>{item.value}</p>
                  </div>
                ))}
              </div>
              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2 text-sm"><Send className="h-4 w-4" />Send Warning</Button>
                <Button className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white text-sm"><UserX className="h-4 w-4" />Terminate Session</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// RESULTS & GRADING
// ══════════════════════════════════════════════════════════════════════════════
function ResultsTab({ results }: { results: ExamResult[] }) {
  const [search, setSearch] = useState("")
  const [examFilter, setExamFilter] = useState("All")
  const exams = Array.from(new Set(results.map(r => r.examTitle)))

  const filtered = results.filter(r =>
    (examFilter === "All" || r.examTitle === examFilter) &&
    (r.studentName.toLowerCase().includes(search.toLowerCase()) || r.regNo.toLowerCase().includes(search.toLowerCase()))
  )

  const avg   = filtered.length ? Math.round(filtered.reduce((a,r) => a + scorePercent(r.score,r.totalMarks),0)/filtered.length) : 0
  const pass  = filtered.filter(r => r.passed).length
  const fail  = filtered.length - pass
  const high  = filtered.length ? Math.max(...filtered.map(r => r.score)) : 0
  const low   = filtered.length ? Math.min(...filtered.map(r => r.score)) : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label:"Average Score", value:`${avg}%`, color:"text-foreground" },
          { label:"Passed",        value:pass,      color:"text-emerald-600 dark:text-emerald-400" },
          { label:"Failed",        value:fail,      color:"text-red-600 dark:text-red-400" },
          { label:"Highest",       value:high,      color:"text-blue-600 dark:text-blue-400" },
          { label:"Lowest",        value:low,       color:"text-amber-600 dark:text-amber-400" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border bg-card px-4 py-4 text-center shadow-sm">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…"
            className="w-full rounded-lg border border-input bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={examFilter} onChange={e => setExamFilter(e.target.value)}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
          <option value="All">All Exams</option>
          {exams.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors">
          <Download className="h-4 w-4" />Export
        </button>
      </div>

      {/* Results table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Exam</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Violations</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r, i) => (
                <tr key={i} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {r.studentName.split(" ").map(n=>n[0]).join("").slice(0,2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{r.studentName}</p>
                        <p className="text-xs text-muted-foreground">{r.regNo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{r.course}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-36">{r.examTitle}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">{r.score}/{r.totalMarks}</span>
                      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", r.passed ? "bg-emerald-500" : "bg-red-500")}
                          style={{ width:`${scorePercent(r.score,r.totalMarks)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("text-sm font-bold", gradeColor(r.grade))}>{r.grade}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      r.passed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400")}>
                      {r.passed ? "Passed" : "Failed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("font-medium", r.violations > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{r.violations}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.submittedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab({ results, exams }: { results: ExamResult[]; exams: Exam[] }) {
  // Grade distribution
  const gradeMap: Record<string,number> = {}
  results.forEach(r => { gradeMap[r.grade] = (gradeMap[r.grade] || 0) + 1 })
  const gradeOrder = ["A+","A","B+","B","C","D","F"]
  const gradeDist = gradeOrder.filter(g => gradeMap[g]).map(g => ({ grade: g, count: gradeMap[g] }))

  // Score ranges
  const ranges = [
    { label:"0–39", min:0, max:39 },
    { label:"40–49", min:40, max:49 },
    { label:"50–59", min:50, max:59 },
    { label:"60–69", min:60, max:69 },
    { label:"70–79", min:70, max:79 },
    { label:"80–89", min:80, max:89 },
    { label:"90–100", min:90, max:100 },
  ].map(r => ({ ...r, count: results.filter(res => { const p = scorePercent(res.score,res.totalMarks); return p >= r.min && p <= r.max }).length }))
  const maxRange = Math.max(...ranges.map(r => r.count), 1)

  // Violation analysis
  const avgViolations = results.length ? (results.reduce((a,r)=>a+r.violations,0)/results.length).toFixed(1) : "0"
  const highViolation = results.filter(r => r.violations >= 3).length
  const clean         = results.filter(r => r.violations === 0).length

  // Per-exam summary
  const examSummary = exams.filter(e => e.status === "Completed").map(e => {
    const er = results.filter(r => r.examId === e.id)
    const avg = er.length ? Math.round(er.reduce((a,r)=>a+scorePercent(r.score,r.totalMarks),0)/er.length) : 0
    const pass = er.length ? Math.round(er.filter(r=>r.passed).length/er.length*100) : 0
    return { ...e, avg, pass, count: er.length }
  })

  return (
    <div className="flex flex-col gap-6">

      {/* Score distribution bar chart */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-5 font-semibold text-foreground">Score Distribution</h3>
        <div className="flex items-end gap-3 h-40">
          {ranges.map(r => (
            <div key={r.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground">{r.count}</span>
              <div className="w-full rounded-t-lg transition-all" style={{
                height: `${Math.max((r.count/maxRange)*120, r.count > 0 ? 8 : 0)}px`,
                background: r.min < 40 ? "rgb(239,68,68)" : r.min < 50 ? "rgb(245,158,11)" : r.min < 70 ? "rgb(59,130,246)" : "rgb(16,185,129)"
              }} />
              <span className="text-[10px] text-muted-foreground">{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two column */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Grade distribution */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-5 font-semibold text-foreground">Grade Distribution</h3>
          <div className="flex flex-col gap-3">
            {gradeDist.map(g => (
              <div key={g.grade} className="flex items-center gap-3">
                <span className={cn("w-9 text-right text-sm font-bold", gradeColor(g.grade))}>{g.grade}</span>
                <div className="flex-1 h-6 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary/70 transition-all flex items-center pl-2"
                    style={{ width:`${Math.round(g.count/results.length*100)}%`, minWidth:24 }}>
                    <span className="text-[10px] font-semibold text-white">{g.count}</span>
                  </div>
                </div>
                <span className="w-8 text-right text-xs text-muted-foreground">{Math.round(g.count/results.length*100)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Violations */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-5 font-semibold text-foreground">Proctoring Violations</h3>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label:"Avg Violations", value:avgViolations, color:"text-foreground" },
              { label:"High Risk",      value:highViolation, color:"text-red-600 dark:text-red-400" },
              { label:"Clean Sessions", value:clean,         color:"text-emerald-600 dark:text-emerald-400" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-background p-3 text-center">
                <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {results.slice(0,5).map((r,i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground flex-1 truncate">{r.studentName}</span>
                <div className="flex gap-0.5">
                  {Array.from({length:5}).map((_,j) => (
                    <div key={j} className={cn("h-4 w-4 rounded-sm", j < r.violations ? "bg-amber-400" : "bg-muted")} />
                  ))}
                </div>
                <span className="text-xs font-medium text-muted-foreground w-4 text-right">{r.violations}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-exam performance */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-semibold text-foreground">Per-Exam Performance Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Exam","Course","Students","Avg Score","Pass Rate","Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {examSummary.map(e => (
                <tr key={e.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{e.title}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{e.courseCode}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width:`${e.avg}%` }} />
                      </div>
                      <span className="font-semibold text-foreground">{e.avg}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("font-semibold", e.pass >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>{e.pass}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", STATUS_PILL[e.status])}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STUDENT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function StudentsTab({ students, results }: { students: Student[]; results: ExamResult[] }) {
  const [search, setSearch]     = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [selected, setSelected] = useState<Student | null>(null)

  const filtered = students.filter(s =>
    (statusFilter === "All" || s.status === statusFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.regNo.toLowerCase().includes(search.toLowerCase()) || s.programme.toLowerCase().includes(search.toLowerCase()))
  )

  const statusPill: Record<string,string> = {
    Active:    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    Suspended: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    Graduated: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  }

  function gpaColor(gpa: number) {
    if (gpa >= 3.5) return "text-emerald-600 dark:text-emerald-400"
    if (gpa >= 2.5) return "text-blue-600 dark:text-blue-400"
    if (gpa >= 2.0) return "text-amber-600 dark:text-amber-400"
    return "text-red-600 dark:text-red-400"
  }

  const selectedResults = selected ? results.filter(r => r.studentId === selected.id) : []

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…"
            className="w-full rounded-lg border border-input bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex items-center gap-2">
          {["All","Active","Suspended","Graduated"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                statusFilter === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
              {s}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent ml-auto">
          <Download className="h-4 w-4" />Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:"Total", value:students.length, color:"text-foreground" },
          { label:"Active", value:students.filter(s=>s.status==="Active").length, color:"text-emerald-600 dark:text-emerald-400" },
          { label:"Suspended", value:students.filter(s=>s.status==="Suspended").length, color:"text-red-600 dark:text-red-400" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border bg-card px-4 py-3 text-center shadow-sm">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Student","Programme","Year","GPA","Exams","Status","Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {s.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{s.regNo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-44">
                    <span className="line-clamp-2">{s.programme}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">Year {s.year}</td>
                  <td className="px-4 py-3">
                    <span className={cn("font-bold", gpaColor(s.gpa))}>{s.gpa.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.examsCompleted}/{s.examsRegistered}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", statusPill[s.status])}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(s)}
                      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      <Eye className="h-3.5 w-3.5" />View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                  {selected.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                </div>
                <div>
                  <h2 className="font-bold text-foreground">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground font-mono">{selected.regNo}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:"Programme", value:selected.programme },
                  { label:"Year", value:`Year ${selected.year}` },
                  { label:"Email", value:selected.email },
                  { label:"Status", value:selected.status },
                  { label:"GPA", value:selected.gpa.toFixed(2) },
                  { label:"Exams Completed", value:`${selected.examsCompleted}/${selected.examsRegistered}` },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Exam history */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Exam History</h3>
                {selectedResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No exam results for this student.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-4 rounded-xl border border-border bg-background px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.examTitle}</p>
                          <p className="text-xs text-muted-foreground">{r.course} &bull; {r.submittedAt}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("text-sm font-bold", gradeColor(r.grade))}>{r.grade}</p>
                          <p className="text-xs text-muted-foreground">{r.score}/{r.totalMarks}</p>
                        </div>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0",
                          r.passed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400")}>
                          {r.passed ? "Pass" : "Fail"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" className="flex-1 gap-2 text-sm"><Send className="h-4 w-4" />Message</Button>
                <Button variant="outline" className="flex-1 gap-2 text-sm"><FileText className="h-4 w-4" />Transcript</Button>
                {selected.status === "Active" ? (
                  <Button className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white text-sm"><UserX className="h-4 w-4" />Suspend</Button>
                ) : (
                  <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"><UserCheck className="h-4 w-4" />Reinstate</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT LAYOUT
// ══════════════════════════════════════════════════════════════════════════════
export default function LecturerPortal() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("overview")
  const [exams, setExams]       = useState(MOCK_EXAMS)
  const [students]              = useState(MOCK_STUDENTS)
  const [results]               = useState(MOCK_RESULTS)
  const [sessions]              = useState(MOCK_MONITORING)
  const [notifOpen, setNotifOpen] = useState(false)

  const notifications = [
    { text:"John Massawe has 3 violations in CS401", time:"2 min ago", severity:"high" },
    { text:"Hamisi Juma disconnected during CS401 exam", time:"5 min ago", severity:"high" },
    { text:"Data Structures exam is scheduled for 10 Mar", time:"1 hr ago", severity:"info" },
  ]

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0 border-r border-border bg-card " style={{ background: "linear-gradient(175deg, #1a2d5a 0%, #162550 60%, #0f1c3d 100%)" }}>
        {/* Brand */}
        <div className="flex flex-col gap-1 border-b border-border px-6 py-5">
          <p className="text-[10px] font-semibold tracking-widest text-white uppercase">University of Dodoma</p>
          <h1 className="text-base font-bold text-foreground leading-tight">AI Proctoring System</h1>
          <p className="text-xs text-white">Lecturer Portal</p>
        </div>

        {/* Profile mini */}
        <div className="flex items-center gap-3  px-6 py-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">AM</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Dr. Amani Msangi</p>
            <p className="truncate text-xs text-white">amani.msangi@udom.ac.tz</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {NAV.map(item => (
            <button key={item.tab} onClick={() => setTab(item.tab)}
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left",
                tab === item.tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-white hover:bg-accent hover:text-foreground")}>
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
              {item.tab === "monitor" && sessions.filter(s=>s.warnings>=3).length > 0 && (
                <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {sessions.filter(s=>s.warnings>=3).length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border px-3 py-4 flex flex-col gap-1">
          <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
            <Settings className="h-4 w-4" />Settings
          </button>
          <button onClick={() => router.push("/")}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all">
            <LogOut className="h-4 w-4" />Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Top bar */}
        <header className="flex flex-shrink-0 items-center justify-between border-b border-border bg-card px-6 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{NAV.find(n=>n.tab===tab)?.label}</h2>
            <p className="text-xs text-muted-foreground">Academic Year 2024/2026 &mdash; Semester 2</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {notifications.length}
                </span>
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                    <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="divide-y divide-border max-h-72 overflow-y-auto">
                    {notifications.map((n, i) => (
                      <div key={i} className={cn("px-4 py-3 flex items-start gap-3", n.severity === "high" ? "bg-red-50/50 dark:bg-red-900/10" : "")}>
                        <div className={cn("mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full",
                          n.severity === "high" ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-100 dark:bg-blue-900/30")}>
                          {n.severity === "high" ? <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /> : <Bell className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground leading-snug">{n.text}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {tab === "overview"  && <OverviewTab  exams={exams} results={results} students={students} setTab={setTab} />}
          {tab === "exams"     && <ExamsTab     exams={exams} setExams={setExams} />}
          {tab === "monitor"   && <MonitorTab   sessions={sessions} />}
          {tab === "results"   && <ResultsTab   results={results} />}
          {tab === "analytics" && <AnalyticsTab results={results} exams={exams} />}
          {tab === "students"  && <StudentsTab  students={students} results={results} />}
        </main>
      </div>
    </div>
  )
}
