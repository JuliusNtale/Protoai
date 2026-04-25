"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Clock,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  FileText,
  Users,
  Monitor,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Download,
  Filter,
  Search,
  Info,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Cell,
} from "recharts"
import { SystemStatusIndicators } from "@/components/system-status-indicators"
import { useCameraStatus } from "@/hooks/use-camera-status"
import { useNetworkStatus } from "@/hooks/use-network-status"

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "overview" | "exams" | "results" | "warnings" | "settings"

// ─── Student type ─────────────────────────────────────────────────────────────
type StudentProfile = {
  name: string
  initials: string
  regNo: string
  email: string
  phone: string
  programme: string
  year: string
  college: string
  photoVerified: boolean
  accountStatus: string
}

const UPCOMING_EXAMS = [
  {
    id: "CS301",
    code: "CS 301",
    title: "Data Structures and Algorithms",
    date: "Thursday, 24 April 2026",
    startTime: "09:00 AM",
    endTime: "12:00 PM",
    duration: "3 hours",
    totalMarks: 100,
    questions: 50,
    passMark: 40,
    venue: "Online — Proctored",
    registeredStudents: 142,
    questionTypes: ["Multiple Choice (30)", "Short Answer (10)", "Essay (10)"],
    instructions: [
      "No electronic devices are allowed except the examination computer.",
      "You must remain in front of the camera at all times.",
      "Do not switch tabs or open other applications.",
      "Read each question carefully before answering.",
      "Answers cannot be changed once submitted.",
      "The exam will auto-submit when the timer reaches zero.",
    ],
    proctoring: ["Webcam monitoring", "Screen recording", "Gaze tracking", "Tab-switch detection"],
    status: "available" as const,
  },
  {
    id: "MTH202",
    code: "MTH 202",
    title: "Calculus II",
    date: "Friday, 25 April 2026",
    startTime: "02:00 PM",
    endTime: "05:00 PM",
    duration: "3 hours",
    totalMarks: 100,
    questions: 40,
    passMark: 40,
    venue: "Online — Proctored",
    registeredStudents: 198,
    questionTypes: ["Multiple Choice (20)", "Problem Solving (20)"],
    instructions: [
      "Scientific calculators are permitted (built-in browser calculator only).",
      "Show all workings clearly in the answer box.",
      "Partial marks are awarded for correct method.",
      "Do not switch tabs or open other applications.",
    ],
    proctoring: ["Webcam monitoring", "Screen recording", "Tab-switch detection"],
    status: "upcoming" as const,
  },
  {
    id: "NET410",
    code: "NET 410",
    title: "Computer Networks",
    date: "Monday, 28 April 2026",
    startTime: "10:00 AM",
    endTime: "01:00 PM",
    duration: "3 hours",
    totalMarks: 100,
    questions: 60,
    passMark: 40,
    venue: "Online — Proctored",
    registeredStudents: 87,
    questionTypes: ["Multiple Choice (40)", "Short Answer (20)"],
    instructions: [
      "No external resources are permitted.",
      "You must remain in front of the camera at all times.",
      "Do not switch tabs or open other applications.",
    ],
    proctoring: ["Webcam monitoring", "Screen recording", "Gaze tracking", "Tab-switch detection"],
    status: "upcoming" as const,
  },
]

const RESULTS = [
  { id: "R1", code: "CS 201", title: "Object-Oriented Programming",    score: 82, grade: "B+", totalMarks: 100, date: "10 Jan 2026", status: "pass",  violations: 0 },
  { id: "R2", code: "MTH 101", title: "Linear Algebra",               score: 74, grade: "B",  totalMarks: 100, date: "12 Jan 2026", status: "pass",  violations: 1 },
  { id: "R3", code: "CS 102", title: "Introduction to Programming",   score: 91, grade: "A",  totalMarks: 100, date: "15 Jan 2026", status: "pass",  violations: 0 },
  { id: "R4", code: "ENG 101", title: "Communication Skills",         score: 67, grade: "B-", totalMarks: 100, date: "17 Jan 2026", status: "pass",  violations: 0 },
  { id: "R5", code: "CS 204", title: "Database Systems",              score: 38, grade: "F",  totalMarks: 100, date: "20 Jan 2026", status: "fail",  violations: 3 },
  { id: "R6", code: "CS 211", title: "Operating Systems",             score: 77, grade: "B",  totalMarks: 100, date: "22 Jan 2026", status: "pass",  violations: 0 },
]

const CHART_DATA = RESULTS.map(r => ({ name: r.code.split(" ")[1], score: r.score, fill: r.score >= 40 ? "#1a2d5a" : "#ef4444" }))

const WARNINGS = [
  {
    id: "W4",
    type: "info" as const,
    title: "Upcoming Exam Reminder",
    message: "Your Data Structures and Algorithms exam is scheduled for tomorrow at 09:00 AM. Please ensure your camera and microphone are working.",
    exam: "CS 301 — Data Structures and Algorithms",
    date: "23 Apr 2026, 08:00 AM",
    read: false,
    action: null,
  },
  {
    id: "W5",
    type: "info" as const,
    title: "Face Verification Required",
    message: "Please complete your face verification before your next exam session. Visit the verification page at least 30 minutes before the exam starts.",
    exam: "All upcoming exams",
    date: "23 Apr 2026, 07:00 AM",
    read: false,
    action: null,
  },
]

const STATUS_MAP = {
  available: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Available Now" },
  upcoming:  { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Upcoming" },
}

const GRADE_COLOR: Record<string, string> = {
  "A": "text-emerald-600", "B+": "text-emerald-500", "B": "text-blue-600",
  "B-": "text-blue-500", "C": "text-amber-600", "F": "text-red-600",
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [expandedExam, setExpandedExam] = useState<string | null>(null)
  const [selectedExamTitle, setSelectedExamTitle] = useState("")
  const [showExamRules, setShowExamRules] = useState(false)
  const [agreedRules, setAgreedRules] = useState(false)
  const [startingExam, setStartingExam] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [searchResult, setSearchResult] = useState("")
  const [unreadCount, setUnreadCount] = useState(WARNINGS.filter(w => !w.read).length)
  const [warnings, setWarnings] = useState(WARNINGS)
  const cameraStatus = useCameraStatus({
    secureOriginMessage: "Camera needs HTTPS or localhost to work on the dashboard.",
  })
  const networkStatus = useNetworkStatus()
  const [STUDENT, setSTUDENT] = useState<StudentProfile>({
    name: "",
    initials: "",
    regNo: "",
    email: "",
    phone: "",
    programme: "Bachelor of Computer Science",
    year: "Year 3 — Semester 2",
    college: "College of Information & Virtual Education",
    photoVerified: true,
    accountStatus: "Active",
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    const raw = localStorage.getItem("user")
    if (!token || !raw) {
      router.push("/")
      return
    }
    try {
      const u = JSON.parse(raw)
      const fullName: string = u.name || u.full_name || "Student"
      const parts = fullName.trim().split(" ")
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : fullName.slice(0, 2).toUpperCase()
      setSTUDENT(prev => ({
        ...prev,
        name: fullName,
        initials,
        regNo: u.registration_number || u.regNo || "",
        email: u.email || "",
      }))
    } catch {
      router.push("/")
    }
  }, [router])

  function handleOpenStartExam(examTitle: string) {
    setSelectedExamTitle(examTitle)
    setAgreedRules(false)
    setShowExamRules(true)
  }

  function escapePdfText(text: string) {
    return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
  }

  function buildRulesPdf(examTitle: string) {
    const generatedAt = new Date().toLocaleString()
    const lines = [
      "UNIVERSITY OF DODOMA - PROCTOAI SYSTEM",
      "EXAM ORIENTATION AND RULES",
      "",
      `Exam: ${examTitle || "Selected Exam"}`,
      `Generated: ${generatedAt}`,
      "",
      "ORIENTATION",
      "1. Complete face verification before attempting exam questions.",
      "2. Confirm camera, network, and power stability before starting.",
      "3. Read all instructions and marking scheme carefully.",
      "",
      "RULES AND REGULATIONS",
      "1. Keep your face visible to camera throughout the exam.",
      "2. Do not switch tabs, applications, or browser windows.",
      "3. Do not communicate with any other person during the exam.",
      "4. Use only approved materials stated by the instructor.",
      "5. Suspicious behavior is logged for academic review.",
      "",
      "PROCTORING ACTIONS",
      "- Webcam monitoring",
      "- Screen activity tracking",
      "- Gaze and tab-switch analysis",
      "",
      "DECLARATION",
      "By proceeding, you agree to comply with these rules and",
      "accept academic penalties for misconduct.",
    ]

    const lineHeight = 14
    const startX = 50
    const startY = 790
    const contentLines: string[] = ["BT", "/F1 11 Tf", `${lineHeight} TL`, `${startX} ${startY} Td`]

    lines.forEach((line, index) => {
      if (index > 0) contentLines.push("T*")
      contentLines.push(`(${escapePdfText(line)}) Tj`)
    })
    contentLines.push("ET")

    const stream = contentLines.join("\n")
    const objects = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
      `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ]

    let pdf = "%PDF-1.4\n"
    const offsets: number[] = [0]
    objects.forEach(obj => {
      offsets.push(pdf.length)
      pdf += obj
    })

    const xrefStart = pdf.length
    pdf += `xref\n0 ${objects.length + 1}\n`
    pdf += "0000000000 65535 f \n"
    for (let i = 1; i <= objects.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

    return new Blob([pdf], { type: "application/pdf" })
  }

  function handleDownloadRulesPdf() {
    const blob = buildRulesPdf(selectedExamTitle)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `exam-orientation-rules-${(selectedExamTitle || "exam").replace(/\s+/g, "-").toLowerCase()}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function handleStartExam() {
    if (!agreedRules) return
    setStartingExam(true)
    setTimeout(() => {
      setStartingExam(false)
      setShowExamRules(false)
      router.push("/verify")
    }, 900)
  }

  function markAllRead() {
    setWarnings(prev => prev.map(w => ({ ...w, read: true })))
    setUnreadCount(0)
  }

  const navItems: { tab: Tab; label: string; icon: React.ReactNode }[] = [
    { tab: "overview",  label: "Overview",      icon: <LayoutDashboard className="h-4 w-4" /> },
    { tab: "exams",     label: "My Exams",      icon: <BookOpen className="h-4 w-4" /> },
    { tab: "results",   label: "Results",       icon: <ClipboardList className="h-4 w-4" /> },
    { tab: "warnings",  label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { tab: "settings",  label: "Settings",      icon: <Settings className="h-4 w-4" /> },
  ]

  const avgScore = Math.round(RESULTS.reduce((s, r) => s + r.score, 0) / RESULTS.length)
  const passed   = RESULTS.filter(r => r.status === "pass").length
  const failed   = RESULTS.filter(r => r.status === "fail").length

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f5] lg:flex-row" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* ── Sidebar ── */}
      <aside
        className="hidden w-60 flex-shrink-0 flex-col justify-between px-4 py-6 lg:flex"
        style={{ background: "#1a2d5a", minHeight: "100vh" }}
      >
        {/* Brand */}
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-2.5 px-2">
            <ShieldCheck className="h-6 w-6 text-blue-300" />
            <div>
              <p className="text-sm font-bold text-white leading-none">Proctoai</p>
              <p className="text-[10px] text-blue-300/70 mt-0.5">University of Dodoma</p>
            </div>
          </div>

          {/* Student mini-profile */}
          <div className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-3 border border-white/10">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-400/20 text-sm font-bold text-blue-200">
              {STUDENT.initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{STUDENT.name.split(" ")[0]} {STUDENT.name.split(" ")[1]}</p>
              <p className="text-[10px] text-blue-300/70 truncate mt-0.5">{STUDENT.regNo}</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1">
            {navItems.map(item => (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all group ${
                  activeTab === item.tab
                    ? "bg-white text-[#1a2d5a]"
                    : "text-blue-200/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  {item.label}
                </div>
                {item.tab === "warnings" && unreadCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/") }}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-200/60 hover:bg-white/8 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col min-w-0">

        <div className="border-b border-gray-200 bg-[#1a2d5a] px-4 py-3 text-white lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{STUDENT.name}</p>
              <p className="truncate text-[11px] text-blue-200/80">{STUDENT.regNo}</p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium text-white/90"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navItems.map(item => (
              <button
                key={`mobile-${item.tab}`}
                onClick={() => setActiveTab(item.tab)}
                className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === item.tab
                    ? "border-white bg-white text-[#1a2d5a]"
                    : "border-white/30 bg-white/5 text-blue-100"
                }`}
              >
                {item.icon}
                {item.label}
                {item.tab === "warnings" && unreadCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Top header bar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3.5 sm:px-6">
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              {navItems.find(n => n.tab === activeTab)?.label}
            </h1>
            <p className="mt-0.5 hidden text-xs text-gray-400 sm:block">{STUDENT.programme} — {STUDENT.year}</p>
          </div>
          <div className="flex items-center gap-4">
            <SystemStatusIndicators
              camera={cameraStatus}
              network={networkStatus}
              className="hidden md:flex"
            />
            <button
              onClick={() => setActiveTab("warnings")}
              className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <SystemStatusIndicators
            camera={cameraStatus}
            network={networkStatus}
          />
        </div>

        {/* Tab content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6">

              {/* Welcome banner */}
              <div
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl px-6 py-5"
                style={{ background: "linear-gradient(120deg, #1a2d5a 0%, #243d77 100%)" }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white ring-2 ring-white/20">
                    {STUDENT.initials}
                  </div>
                  <div>
                    <p className="text-xs text-blue-200/70 font-medium">Welcome back,</p>
                    <h2 className="text-xl font-bold text-white leading-tight">{STUDENT.name}</h2>
                    <p className="text-xs text-blue-200/70 mt-0.5">{STUDENT.regNo} &middot; {STUDENT.college}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {STUDENT.accountStatus}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-400/20 px-3 py-1 text-xs font-medium text-blue-200 border border-blue-400/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Face Verified
                  </span>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<BookOpen className="h-5 w-5 text-blue-600" />}     label="Registered Exams"   value={UPCOMING_EXAMS.length}   sub="this semester"      bg="bg-blue-50"    />
                <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} label="Average Score"      value={`${avgScore}%`}          sub="across all exams"   bg="bg-emerald-50" />
                <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Exams Passed"       value={passed}                  sub={`of ${RESULTS.length} completed`} bg="bg-green-50" />
                <StatCard icon={<AlertTriangle className="h-5 w-5 text-amber-600" />} label="Active Warnings"  value={WARNINGS.filter(w => w.type !== "info").length} sub="requires attention" bg="bg-amber-50" />
              </div>

              {/* Two columns: upcoming + recent results */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Upcoming exams */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-800">Upcoming Exams</h3>
                    <button onClick={() => setActiveTab("exams")} className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <ul className="flex flex-col divide-y divide-gray-50">
                    {UPCOMING_EXAMS.map(exam => {
                      const s = STATUS_MAP[exam.status]
                      return (
                        <li key={exam.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white text-[10px] font-bold"
                              style={{ background: "#1a2d5a" }}
                            >
                              {exam.code.split(" ")[0].slice(0, 3)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{exam.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{exam.date} &middot; {exam.startTime}</p>
                            </div>
                          </div>
                          <span className={`ml-3 flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* Recent results */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">Recent Results</h3>
                    <button onClick={() => setActiveTab("results")} className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <ul className="flex flex-col divide-y divide-gray-50">
                    {RESULTS.slice(0, 4).map(r => (
                      <li key={r.id} className="flex items-center justify-between px-5 py-3.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.code} &middot; {r.date}</p>
                        </div>
                        <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                          <span className={`text-sm font-bold ${GRADE_COLOR[r.grade] ?? "text-gray-700"}`}>{r.grade}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === "pass" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                            {r.score}%
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Score bar chart */}
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Score Overview — Semester 1</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={CHART_DATA} barSize={28}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(26,45,90,0.04)" }}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {CHART_DATA.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── EXAMS TAB ── */}
          {activeTab === "exams" && (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-gray-500">
                Click an exam to view its full details. Ensure your camera and network are ready before starting.
              </p>

              {UPCOMING_EXAMS.map(exam => {
                const s = STATUS_MAP[exam.status]
                const isExpanded = expandedExam === exam.id
                return (
                  <div
                    key={exam.id}
                    className={`rounded-2xl border bg-white overflow-hidden transition-all duration-200 ${
                      isExpanded ? "border-[#1a2d5a] shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* Header row */}
                    <button
                      type="button"
                      onClick={() => setExpandedExam(isExpanded ? null : exam.id)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className="hidden sm:flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold"
                          style={{ background: "#1a2d5a" }}
                        >
                          {exam.code.split(" ")[0].slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400 tracking-wide">{exam.code}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                              {s.label}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">{exam.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <CalendarDays className="h-3 w-3" />{exam.date}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />{exam.startTime} – {exam.endTime}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 py-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                          {/* Column 1 */}
                          <div className="flex flex-col gap-4">
                            <SectionHeading>Exam Details</SectionHeading>
                            <dl className="flex flex-col gap-2.5">
                              <DetailRow icon={<Clock className="h-3.5 w-3.5" />}        label="Duration"    value={exam.duration} />
                              <DetailRow icon={<FileText className="h-3.5 w-3.5" />}     label="Questions"   value={`${exam.questions} questions`} />
                              <DetailRow icon={<BookOpen className="h-3.5 w-3.5" />}     label="Total Marks" value={`${exam.totalMarks} marks`} />
                              <DetailRow icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Pass Mark"  value={`${exam.passMark}%`} />
                              <DetailRow icon={<Users className="h-3.5 w-3.5" />}        label="Registered"  value={`${exam.registeredStudents} students`} />
                              <DetailRow icon={<Monitor className="h-3.5 w-3.5" />}      label="Venue"       value={exam.venue} />
                            </dl>
                            <div className="flex flex-col gap-1 mt-1">
                              <p className="text-xs font-medium text-gray-500">Question Breakdown</p>
                              {exam.questionTypes.map(qt => (
                                <p key={qt} className="text-xs text-gray-700 pl-2 border-l-2 border-[#1a2d5a]/20">{qt}</p>
                              ))}
                            </div>
                          </div>

                          {/* Column 2 */}
                          <div className="flex flex-col gap-4">
                            <SectionHeading>Instructions</SectionHeading>
                            <ol className="flex flex-col gap-2">
                              {exam.instructions.map((ins, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span
                                    className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white mt-0.5"
                                    style={{ background: "#1a2d5a" }}
                                  >
                                    {i + 1}
                                  </span>
                                  <span className="text-xs text-gray-600 leading-relaxed">{ins}</span>
                                </li>
                              ))}
                            </ol>
                          </div>

                          {/* Column 3 */}
                          <div className="flex flex-col gap-4">
                            <SectionHeading>Proctoring</SectionHeading>
                            <ul className="flex flex-col gap-2">
                              {exam.proctoring.map(p => (
                                <li key={p} className="flex items-center gap-2">
                                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                  <span className="text-xs text-gray-600">{p}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-700 leading-relaxed">
                                Your session will be recorded. Suspicious activity is flagged and reported automatically.
                              </p>
                            </div>
                            {exam.status === "available" ? (
                              <button
                                onClick={() => handleOpenStartExam(exam.title)}
                                disabled={startingExam}
                                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                style={{ background: "#1a2d5a" }}
                              >
                                {startingExam ? (
                                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting...</>
                                ) : (
                                  <>Start Exam <ChevronRight className="h-4 w-4" /></>
                                )}
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-3">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-xs font-semibold text-gray-600">Not yet open</p>
                                  <p className="text-[10px] text-gray-400">{exam.date} at {exam.startTime}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── RESULTS TAB ── */}
          {activeTab === "results" && (
            <div className="flex flex-col gap-6">
              {/* Summary row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} label="Passed"       value={passed}         sub="exams"           bg="bg-emerald-50" />
                <StatCard icon={<XCircle className="h-5 w-5 text-red-500" />}          label="Failed"        value={failed}         sub="exams"           bg="bg-red-50" />
                <StatCard icon={<TrendingUp className="h-5 w-5 text-blue-600" />}      label="Average Score" value={`${avgScore}%`} sub="overall"         bg="bg-blue-50" />
                <StatCard icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}  label="Violations"    value={RESULTS.reduce((s, r) => s + r.violations, 0)} sub="total flagged" bg="bg-amber-50" />
              </div>

              {/* Chart */}
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Score by Subject</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={CHART_DATA} barSize={28}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(26,45,90,0.04)" }}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {CHART_DATA.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="h-3 w-3 rounded-sm" style={{ background: "#1a2d5a" }} />Passed</span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="h-3 w-3 rounded-sm bg-red-500" />Failed</span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">Pass mark: 40%</span>
                </div>
              </div>

              {/* Results table */}
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-800">Examination Results</h3>
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        value={searchResult}
                        onChange={e => setSearchResult(e.target.value)}
                        placeholder="Search..."
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200 sm:w-36"
                      />
                    </div>
                    <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Course</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Violations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {RESULTS.filter(r =>
                      r.title.toLowerCase().includes(searchResult.toLowerCase()) ||
                      r.code.toLowerCase().includes(searchResult.toLowerCase())
                    ).map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-800 text-sm">{r.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.code}</p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500 hidden md:table-cell">{r.date}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${r.score}%`, background: r.status === "pass" ? "#1a2d5a" : "#ef4444" }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{r.score}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-sm font-bold ${GRADE_COLOR[r.grade] ?? "text-gray-700"}`}>{r.grade}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            r.status === "pass" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                          }`}>
                            {r.status === "pass" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {r.status === "pass" ? "Pass" : "Fail"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          {r.violations > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              {r.violations} flagged
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── WARNINGS TAB ── */}
          {activeTab === "warnings" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-gray-500">
                  {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.` : "All notifications are read."}
                </p>
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Mark all as read
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {warnings.map(w => {
                  const styles = {
                    error:   { icon: <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />,       border: "border-red-200",    bg: "bg-red-50",    badge: "bg-red-100 text-red-700" },
                    warning: { icon: <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />, border: "border-amber-200",  bg: "bg-amber-50",  badge: "bg-amber-100 text-amber-700" },
                    info:    { icon: <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />,          border: "border-blue-200",   bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700" },
                  }[w.type]

                  return (
                    <div
                      key={w.id}
                      className={`rounded-2xl border bg-white overflow-hidden transition-all ${!w.read ? "ring-2 ring-offset-0 ring-blue-100" : ""}`}
                    >
                      <div className="flex items-start gap-4 px-5 py-4">
                        <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${styles.bg} ${styles.border} border`}>
                          {styles.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-900">{w.title}</p>
                                {!w.read && (
                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wide">New</span>
                                )}
                                {w.action && (
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${styles.badge}`}>{w.action}</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{w.exam} &middot; {w.date}</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{w.message}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-6 max-w-2xl">

              {/* Profile info */}
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">Profile Information</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Your registered details as provided by the university</p>
                </div>
                <div className="px-5 py-5 flex flex-col gap-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ background: "#1a2d5a" }}>
                      {STUDENT.initials}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-900">{STUDENT.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{STUDENT.regNo}</p>
                      <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Face Verified
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ProfileField icon={<Mail className="h-3.5 w-3.5" />}    label="Email"      value={STUDENT.email} />
                    <ProfileField icon={<Phone className="h-3.5 w-3.5" />}   label="Phone"      value={STUDENT.phone} />
                    <ProfileField icon={<BookOpen className="h-3.5 w-3.5" />} label="Programme" value={STUDENT.programme} />
                    <ProfileField icon={<MapPin className="h-3.5 w-3.5" />}  label="Year"       value={STUDENT.year} />
                    <ProfileField icon={<Users className="h-3.5 w-3.5" />}   label="College"    value={STUDENT.college} wideCol />
                  </div>
                </div>
              </div>

              {/* Change password */}
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">Change Password</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Use a strong password you do not use elsewhere</p>
                </div>
                <div className="px-5 py-5 flex flex-col gap-4">
                  <SettingsInput label="Current Password"  type={showPass ? "text" : "password"} placeholder="••••••••"
                    suffix={<button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400 hover:text-gray-600">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
                  />
                  <SettingsInput label="New Password"      type="password" placeholder="••••••••" />
                  <SettingsInput label="Confirm Password"  type="password" placeholder="••••••••" />
                  <button
                    className="self-start rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: "#1a2d5a" }}
                  >
                    Update Password
                  </button>
                </div>
              </div>

              {/* Notification preferences */}
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">Notification Preferences</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Choose how you receive alerts and reminders</p>
                </div>
                <div className="px-5 py-5 flex flex-col gap-4">
                  {[
                    { label: "Exam reminders (24 hours before)", key: "reminders", defaultOn: true },
                    { label: "Proctoring violation alerts",       key: "violations", defaultOn: true },
                    { label: "Result notifications",              key: "results",   defaultOn: true },
                    { label: "System announcements",              key: "system",    defaultOn: false },
                  ].map(pref => (
                    <div key={pref.key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{pref.label}</span>
                      <Toggle defaultOn={pref.defaultOn} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div className="rounded-2xl border border-red-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-red-100">
                  <h3 className="text-sm font-semibold text-black">Account Actions</h3>
                </div>
                <div className="px-5 py-5 flex flex-col gap-3">
                 
                  <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-red-700">Sign Out</p>
                      <p className="text-xs text-red-400 mt-0.5">End your current session securely</p>
                    </div>
                    <button
                      onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/") }}
                      className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showExamRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Exam Orientation and Rules</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedExamTitle || "Selected exam"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadRulesPdf}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Full PDF
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                After you agree, you will continue to face scan before the exam starts.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold tracking-widest text-black uppercase">Before Start</p>
                  <p className="mt-1 text-xs text-black">Verify face, camera, network, and device power before continuing.</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold tracking-widest text-black uppercase">Violation Notice</p>
                  <p className="mt-1 text-xs text-black">Suspicious activity is logged and reviewed by invigilators.</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-2">Rules and Regulations</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2"><span className="text-blue-600">•</span><span>Stay visible on camera for the full exam.</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600">•</span><span>Do not switch tabs, windows, or use unauthorized apps.</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600">•</span><span>Do not communicate with any person during active exam time.</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600">•</span><span>Ensure stable internet and camera access before proceeding.</span></li>
                </ul>
              </div>

              <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedRules}
                  onChange={e => setAgreedRules(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-600"
                />
                <span className="text-sm text-gray-700">I agree to the exam rules and regulations.</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowExamRules(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartExam}
                disabled={!agreedRules || startingExam}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "#1a2d5a" }}
              >
                {startingExam ? "Opening Face Scan..." : "Agree and Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, bg }: { icon: React.ReactNode; label: string; value: string | number; sub: string; bg: string }) {
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs font-medium text-gray-600 mt-1">{label}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">{children}</h3>
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-gray-400">{icon}<span className="text-xs">{label}</span></div>
      <span className="text-xs font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}

function ProfileField({ icon, label, value, wideCol }: { icon: React.ReactNode; label: string; value: string; wideCol?: boolean }) {
  return (
    <div className={wideCol ? "sm:col-span-2" : ""}>
      <label className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
        {icon}{label}
      </label>
      <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{value}</p>
    </div>
  )
}

function SettingsInput({ label, type, placeholder, suffix }: { label: string; type: string; placeholder: string; suffix?: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 pr-10"
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  )
}

function Toggle({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${on ? "bg-[#1a2d5a]" : "bg-gray-300"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${on ? "translate-x-4" : "translate-x-1"}`} />
    </button>
  )
}
